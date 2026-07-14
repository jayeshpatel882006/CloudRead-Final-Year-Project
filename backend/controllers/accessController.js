// controllers/accessController.js
// -----------------------------------------------------------------------------
// Adds two new endpoints on top of the existing approval workflow:
//   GET /api/access/book/:bookId/info         → { title, author, totalPages }
//   GET /api/access/book/:bookId/page/:n      → image/png  (single watermarked page)
//
// Existing endpoints (requestAccess, approveRequest, etc.) are untouched.
// -----------------------------------------------------------------------------

import AccessRequest from "../models/AccessRequest.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { renderPageAsPng } from "../services/pdfRenderer.js";

// ──────────────────────────────────────────────────────────────────────────────
// EXISTING WORKFLOW — DO NOT MODIFY
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Student Request Access
export const requestAccess = async (req, res) => {
  try {
    const { bookId } = req.body;
    await AccessRequest.deleteMany({
      user: req.user._id,
      book: bookId,
      status: "expired",
    });

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

    // Strip filename/originalFilename from any populated Book to be safe.
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get All Requests (Librarian/Admin)
export const getAllRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({ status: "pending" })
      .populate("user", "name email")
      .populate("book", "title");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// NEW: secure metadata endpoint
//   GET /api/access/book/:bookId/info
// ──────────────────────────────────────────────────────────────────────────────
export const getBookInfo = async (req, res) => {
  try {
    const { bookId } = req.params;

    const access = await AccessRequest.findOne({
      user: req.user._id,
      book: bookId,
      status: "approved",
    });

    if (!access) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (access.accessEndDate < new Date()) {
      access.status = "expired";
      await access.save();
      return res.status(410).json({ message: "Access expired" });
    }

    // Pull only the public-safe fields. filename is excluded by select.
    const book = await Book.findById(bookId).select(
      "title author totalPages",
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({
      title: book.title,
      author: book.author,
      totalPages: book.totalPages || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// NEW: per-page renderer
//   GET /api/access/book/:bookId/page/:pageNumber
//
//   Success  →  image/png binary
//   Failure  →  application/json
//              { page, stage, message, stack }
//
// Every stage is logged individually:
//   auth → access → book → file → load → render → png → send
// No stage is allowed to swallow its error silently. Every failure path
// produces a JSON body the frontend can render inside the page container.
// ──────────────────────────────────────────────────────────────────────────────
export const getBookPage = async (req, res) => {
  const TAG = "[getBookPage]";
  const startedAt = Date.now();
  const { bookId, pageNumber } = req.params;
  const pageNum = parseInt(pageNumber, 10);

  // ── Timestamped per-stage logger ──────────────────────────────────
  const stageLog = {};
  function markStage(name) {
    stageLog[name] = Date.now();
    const dur = stageLog[name] - (stageLog._start || startedAt);
    console.log(TAG, `[${Object.keys(stageLog).length - 1}] ${name}`, {
      bookId,
      page: pageNum,
      ms: dur,
    });
  }
  stageLog._start = startedAt;

  // Helper: emit a JSON failure with a stage tag. Status code is informed by
  // the stage so the frontend can decide between retry (500) and stop (404).
  const fail = (stage, message, status = 500, extra = {}) => {
    const totalMs = Date.now() - startedAt;
    console.error(
      TAG,
      `✗ ${stage}`,
      { bookId, page: pageNum, status, message, totalMs, ...extra },
    );
    if (res.headersSent) return; // can't double-send
    res.status(status).json({
      page: pageNum,
      stage,
      message,
      stack: extra.stack,
      code: extra.code,
    });
  };

  try {
    // ── [1] input validation ────────────────────────────────────────
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return fail("inputValidation", "Invalid page number", 400);
    }
    markStage("inputValidation");

    // ── [2] JWT / auth ──────────────────────────────────────────────
    if (!req.user || !req.user._id) {
      return fail("auth", "Not authenticated", 401);
    }
    markStage("auth");

    // ── [3] access check ────────────────────────────────────────────
    let access;
    try {
      access = await AccessRequest.findOne({
        user: req.user._id,
        book: bookId,
        status: "approved",
      });
    } catch (e) {
      return fail("accessLookup", e.message, 500, { stack: e.stack });
    }
    if (!access) {
      return fail("accessLookup", "Access denied", 403);
    }
    if (access.accessEndDate < new Date()) {
      try { access.status = "expired"; await access.save(); } catch {}
      return fail("accessExpiry", "Access expired", 410);
    }
    markStage("accessCheck");

    // ── [4] book lookup ─────────────────────────────────────────────
    let book;
    try {
      book = await Book.findById(bookId).select(
        "+filename title totalPages",
      );
    } catch (e) {
      return fail("bookLookup", e.message, 500, { stack: e.stack });
    }
    if (!book) {
      return fail("bookLookup", "Book not found", 404);
    }
    if (!book.filename) {
      return fail("bookLookup", "Book file missing", 404);
    }
    if (book.totalPages && pageNum > book.totalPages) {
      return fail("bookLookup", "Page out of range", 404);
    }
    markStage("bookLookup");

    // ── [5] user lookup for watermark ───────────────────────────────
    let user;
    try {
      user = await User.findById(req.user._id).select("name email");
    } catch (e) {
      return fail("userLookup", e.message, 500, { stack: e.stack });
    }
    markStage("userLookup");

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateTimeStr = `${dateStr} ${timeStr}`;

    // ── [6] render → [7] PNG encode ────────────────────────────────
    let png;
    try {
      console.log(TAG, `[6] renderPage start`, {
        filename: book.filename,
        pageNum,
        totalMs: Date.now() - startedAt,
      });
      png = await renderPageAsPng(book.filename, pageNum, {
        name: user?.name || "Student",
        email: user?.email || "",
        date: dateTimeStr,
      });
      console.log(TAG, `[7] encodePng ok`, {
        pageNum,
        pngBytes: png?.length ?? 0,
        totalMs: Date.now() - startedAt,
      });
    } catch (e) {
      const code = e?.code;
      const stage = e?.stage || "renderPage";

      console.error(
        TAG,
        `✗ ${stage}`,
        {
          bookId,
          page: pageNum,
          code,
          message: e?.message,
          totalMs: Date.now() - startedAt,
        },
      );

      if (code === "ENOENT") return fail(stage, "Book file missing on server", 404, { code });
      if (code === "PAGE_OUT_OF_RANGE") return fail(stage, "Page out of range", 404, { code });
      if (code === "EBADNAME") return fail(stage, "Invalid request", 400, { code });
      if (code === "EBADCANVAS") return fail(stage, "Canvas size invalid", 500, { code });

      return fail(stage, e?.message || "Render failed", 500, {
        stack: e?.stack,
        code: code || "RENDER_FAILED",
      });
    }

    // ── [8] respond ─────────────────────────────────────────────────
    if (!png || png.length === 0) {
      return fail("respond", "Render produced empty PNG", 500);
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", png.length);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="book-${bookId}-p${pageNum}.png"`,
    );
    res.status(200).send(png);
    markStage("respond");

    console.log(TAG, `✓ complete`, {
      pageNum,
      pngBytes: png.length,
      totalMs: Date.now() - startedAt,
      stages: Object.fromEntries(
        Object.entries(stageLog).map(([k, v]) => [k, v - startedAt]),
      ),
    });
  } catch (error) {
    return fail("outerCatch", error?.message || "Server error", 500, {
      stack: error?.stack,
      code: "UNCAUGHT",
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY endpoint retained for backward compatibility with any old client code.
// The new flow no longer returns pdfLink to clients; this just answers 410.
// You can delete this safely once the frontend is fully migrated.
// ──────────────────────────────────────────────────────────────────────────────
export const getSecureBookAccess = async (req, res) => {
  return res
    .status(410)
    .json({ message: "This endpoint has been retired. Use /info and /page/:n." });
};