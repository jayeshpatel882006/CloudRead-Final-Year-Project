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
