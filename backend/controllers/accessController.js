import AccessRequest from "../models/AccessRequest.js";
import Book from "../models/Book.js";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";

// 📌 Student Request Access ////We hAve to first check wether a book is thare or not!!!!!
export const requestAccess = async (req, res) => {
  try {
    const { bookId } = req.body;

    const existingRequest = await AccessRequest.findOne({
      user: req.user._id,
      book: bookId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Already requested or approved" });
    }

    const request = await AccessRequest.create({
      user: req.user._id,
      book: bookId,
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Librarian Approves Request
export const approveRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "approved";
    request.accessStartDate = new Date();
    request.accessEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await request.save();

    const user = await User.findById(request.user);
    const book = await Book.findById(request.book);

    await sendEmail(
      user.email,
      "CloudRead Access Approved",
      `Your access to the book : "${book.title}" is approved for 7 days.`,
    );
    // console.log("Email sendddd" + user.email);

    // Increase book access count
    await Book.findByIdAndUpdate(request.book, {
      $inc: { totalAccessCount: 1 },
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get My Requests (Student)
export const getMyRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({
      user: req.user._id,
    }).populate("book");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get All Requests (Librarian/Admin)
export const getAllRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate("user", "name email")
      .populate("book", "title");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔒 Secure Book Access
export const getSecureBookAccess = async (req, res) => {
  try {
    const { bookId } = req.params;

    const access = await AccessRequest.findOne({
      user: req.user._id,
      book: bookId,
      status: "approved",
    }).populate("book");

    if (!access) {
      return res.status(403).json({ message: "Access not approved" });
    }

    if (access.accessEndDate < new Date()) {
      access.status = "expired";
      await access.save();
      return res.status(403).json({ message: "Access expired" });
    }

    res.json({
      title: access.book.title,
      pdfLink: access.book.pdfLink,
      accessEndDate: access.accessEndDate,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
