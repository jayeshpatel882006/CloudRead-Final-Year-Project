import User from "../models/User.js";
import Book from "../models/Book.js";
import AccessRequest from "../models/AccessRequest.js";

// 📊 Dashboard Overview
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBooks = await Book.countDocuments();
    const totalRequests = await AccessRequest.countDocuments();
    const activeAccess = await AccessRequest.countDocuments({
      status: "approved",
    });
    const expiredAccess = await AccessRequest.countDocuments({
      status: "expired",
    });

    res.json({
      totalUsers,
      totalBooks,
      totalRequests,
      activeAccess,
      expiredAccess,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📈 Most Accessed Books
export const getMostAccessedBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ totalAccessCount: -1 }).limit(5);

    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 👤 Top Active Students
export const getTopStudents = async (req, res) => {
  try {
    const topStudents = await AccessRequest.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$user",
          totalAccess: { $sum: 1 },
        },
      },
      { $sort: { totalAccess: -1 } },
      { $limit: 5 },
    ]);

    res.json(topStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveStudentsForBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const now = new Date();

    const activeStudents = await AccessRequest.find({
      book: bookId,
      status: "approved",
      accessStartDate: { $lte: now },
      accessEndDate: { $gte: now },
    })
      .populate("user", "name email")
      .select("user accessStartDate accessEndDate");

    // console.log(activeStudents);

    res.json(activeStudents);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =====================================
   GET ALL USERS
===================================== */
export const getAllUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 2;

    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();

    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =====================================
   UPDATE USER ROLE
===================================== */

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent admin from removing their own admin role
    if (user._id.toString() === req.user.id && role !== "admin") {
      return res.status(400).json({
        message: "You cannot remove your own admin role",
      });
    }

    // 🔐 Prevent removing last admin
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot demote the last remaining admin",
        });
      }
    }

    user.role = role;
    await user.save();

    res.json({ message: "User role updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =====================================
   DELETE USER
===================================== */

export const deleteUser = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent deleting yourself
    if (userToDelete._id.toString() === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    // 🔐 Prevent deleting last admin
    if (userToDelete.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last remaining admin",
        });
      }
    }

    // Delete all access records of that user
    await AccessRequest.deleteMany({
      user: userToDelete._id,
    });

    await userToDelete.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =====================================
   BLOCK / UNBLOCK USER
===================================== */
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent admin blocking themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        message: "You cannot block yourself",
      });
    }

    // 🔐 Prevent blocking last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot block the last remaining admin",
        });
      }
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
