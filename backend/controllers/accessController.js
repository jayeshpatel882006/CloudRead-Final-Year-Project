// controllers/accessController.js
// -----------------------------------------------------------------------------
// Student → Librarian access request workflow + secure page rendering.
//
//   POST   /api/access                  student      create request (optional message)
//   GET    /api/access/my               student      own history (status filter + pagination)
//   GET    /api/access                  librarian/admin  request list (status filter + pagination)
//   PUT    /api/access/approve/:id      librarian/admin  approve (7-day window)
//   PUT    /api/access/reject/:id       librarian/admin  reject
//   GET    /api/access/book/:bookId/info      student (approved+active)
//   GET    /api/access/book/:bookId/page/:n  student (approved+active) → image/png
//
// Business rules enforced here:
//   - A student may NOT create a duplicate request while a request is pending or
//     while approved access is still active. Rejected/expired requests never block
//     a new request, and request history is NEVER deleted (requesting again
//     creates a NEW document).
//   - Approval/rejection only transitions a `pending` request (double approval is
//     impossible), records the reviewer, and increments book.totalAccessCount
//     exactly once per approval.
//   - Email notifications are best-effort: an SMTP failure logs a warning but
//     NEVER fails the approval.
//   - All list responses use { requests, currentPage, totalPages, totalRequests,
//     counts } so the frontend can paginate and render tab badges.
//
// Ownership model (documented decision): CloudRead treats librarians as
// institution-wide managers — every librarian sees and can act on every request
// (no `uploadedBy` scoping exists in the workflow). This matches the existing
// business model and was deliberately preserved. Per-book scoping by
// `uploadedBy` can be layered on later without breaking the API contract.
// -----------------------------------------------------------------------------

import mongoose from "mongoose";
import AccessRequest from "../models/AccessRequest.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { renderPageAsPng } from "../services/pdfRenderer.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCESS_WINDOW_DAYS = 7;
const MAX_TEXT_LENGTH = 500;
const VALID_STATUSES = ["pending", "approved", "rejected", "expired"];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// Public projection for populated books — the raw PDF filename fields are
// `select: false` at the schema level AND explicitly omitted here (defense in
// depth: the PDF file name must never leave the server).
const PUBLIC_BOOK_FIELDS = "title author category description totalPages";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

// ── Validation helpers ────────────────────────────────────────────────────────

/**
 * Trim + cap an optional free-text field (student message / librarian response).
 * Returns undefined when absent or blank; throws { status: 400 } for non-strings.
 */
function sanitizeOptionalText(value, { field = "text" } = {}) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    const err = new Error(`${field} must be a string`);
    err.status = 400;
    throw err;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE),
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** null = no filter; throws { status: 400 } for an invalid status value. */
function parseStatusFilter(value) {
  if (value === undefined || value === null || value === "" || value === "all") {
    return null;
  }
  if (!VALID_STATUSES.includes(value)) {
    const err = new Error("Invalid status filter");
    err.status = 400;
    throw err;
  }
  return value;
}

/** One aggregate → per-status counts (used for tab badges). */
async function getRequestCounts(match) {
  const rows = await AccessRequest.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = { all: 0, pending: 0, approved: 0, rejected: 0, expired: 0 };
  for (const row of rows) counts[row._id] = row.count;
  counts.all = rows.reduce((sum, row) => sum + row.count, 0);
  return counts;
}

/**
 * Resolve the student's ACTIVE access for a book.
 * Returns:
 *   { ok: true, access }        → an approved, non-expired AccessRequest
 *   { ok: false, code: "expired" } → only stale approved records exist (flipped to expired)
 *   { ok: false, code: "denied" }  → no approved record at all
 *
 * This prefers the currently-active approval so a stale approved record (whose
 * window lapsed but which the cron hasn't flipped yet) can never shadow a newer
 * active approval. Used by getBookInfo, getBookPage and the reading controller.
 */
export async function resolveActiveAccess(userId, bookId) {
  const now = new Date();
  const active = await AccessRequest.findOne({
    user: userId,
    book: bookId,
    status: "approved",
    accessEndDate: { $gte: now },
  });
  if (active) return { ok: true, access: active };

  const stale = await AccessRequest.findOne({
    user: userId,
    book: bookId,
    status: "approved",
  });
  if (stale) {
    stale.status = "expired";
    await stale.save().catch(() => {});
    return { ok: false, code: "expired" };
  }
  return { ok: false, code: "denied" };
}

/** Shared error responder — clean messages, never stack traces or internals. */
function sendError(res, error, fallback) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = status < 500 ? error.message : fallback;
  return res.status(status).json({ message });
}

// ──────────────────────────────────────────────────────────────────────────────
// STUDENT REQUEST
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Student Request Access
// POST /api/access  { bookId, message? }
export const requestAccess = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ message: "Invalid book id" });
    }
    const message = sanitizeOptionalText(req.body?.message, { field: "message" });

    const book = await Book.findById(bookId).select("title");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const now = new Date();

    // Duplicate prevention — only an ACTIVE request blocks a new one. A stale
    // approved record (window lapsed, cron not yet run) is flipped to expired.
    const existing = await AccessRequest.findOne({
      user: req.user._id,
      book: bookId,
      status: { $in: ["pending", "approved"] },
    });

    if (existing) {
      if (existing.status === "pending") {
        return res
          .status(400)
          .json({ message: "You already have a pending request for this book" });
      }
      if (existing.accessEndDate && existing.accessEndDate >= now) {
        return res
          .status(400)
          .json({ message: "You already have active access to this book" });
      }
      // Previous access expired — mark it expired (history preserved) and allow
      // a brand-new request.
      existing.status = "expired";
      await existing.save();
    }

    // History is preserved: a rejected/expired request is never deleted or
    // overwritten — we always create a new document.
    const request = await AccessRequest.create({
      user: req.user._id,
      book: bookId,
      status: "pending",
      ...(message !== undefined ? { studentMessage: message } : {}),
    });

    res.status(201).json({
      message: "Access request submitted successfully",
      request,
    });
  } catch (error) {
    return sendError(res, error, "Could not submit access request");
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// REQUEST LISTS
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Get My Requests (Student)
// GET /api/access/my?status=all|pending|approved|rejected|expired&page=&limit=
export const getMyRequests = async (req, res) => {
  try {
    const status = parseStatusFilter(req.query.status);
    const { page, limit, skip } = parsePagination(req.query);

    const match = { user: req.user._id, ...(status ? { status } : {}) };

    const [totalRequests, requests, counts] = await Promise.all([
      AccessRequest.countDocuments(match),
      AccessRequest.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        // Explicit public projection — the raw PDF filename is never returned.
        .populate("book", PUBLIC_BOOK_FIELDS),
      getRequestCounts({ user: req.user._id }),
    ]);

    res.json({
      requests,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRequests / limit)),
      totalRequests,
      counts,
    });
  } catch (error) {
    return sendError(res, error, "Could not load your requests");
  }
};

// 📌 Get All Requests (Librarian/Admin — institution-wide model)
// GET /api/access?status=all|pending|approved|rejected|expired&page=&limit=
export const getAllRequests = async (req, res) => {
  try {
    const status = parseStatusFilter(req.query.status);
    const { page, limit, skip } = parsePagination(req.query);

    const match = status ? { status } : {};

    const [totalRequests, requests, counts] = await Promise.all([
      AccessRequest.countDocuments(match),
      AccessRequest.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")
        .populate("book", PUBLIC_BOOK_FIELDS),
      getRequestCounts({}),
    ]);

    res.json({
      requests,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRequests / limit)),
      totalRequests,
      counts,
    });
  } catch (error) {
    return sendError(res, error, "Could not load requests");
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// APPROVE / REJECT
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Librarian Approves Request
// PUT /api/access/approve/:id  { response? }
export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const request = await AccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    // Only pending requests can be approved — this makes double approval
    // impossible and guarantees totalAccessCount increments exactly once.
    if (request.status !== "pending") {
      return res.status(400).json({
        message: `This request is already ${request.status} and cannot be approved`,
      });
    }

    const response = sanitizeOptionalText(req.body?.response, { field: "response" });

    const user = await User.findById(request.user).select("name email");
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }
    const book = await Book.findById(request.book).select("title totalPages");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const now = new Date();
    request.status = "approved";
    request.accessStartDate = now;
    request.accessEndDate = new Date(now.getTime() + ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    request.reviewedBy = req.user._id;
    request.reviewedAt = now;
    if (response !== undefined) request.librarianResponse = response;

    await request.save();
    await Book.findByIdAndUpdate(request.book, { $inc: { totalAccessCount: 1 } });

    res.json({ message: "Access request approved", request });

    // ── Email is best-effort and MUST never fail the approval ─────────
    // Sent after the success response; a failure is logged and swallowed.
    try {
      await sendEmail(
        user.email,
        "CloudRead Access Approved",
        `Your access to the book : "${book.title}" is approved for ${ACCESS_WINDOW_DAYS} days.`,
      );
    } catch (emailError) {
      console.warn("[approveRequest] Approval email not sent:", emailError.message);
    }
  } catch (error) {
    return sendError(res, error, "Could not approve request");
  }
};

// 📌 Librarian Rejects Request
// PUT /api/access/reject/:id  { response? }
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const request = await AccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        message: `This request is already ${request.status} and cannot be rejected`,
      });
    }

    const response = sanitizeOptionalText(req.body?.response, { field: "response" });

    request.status = "rejected";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (response !== undefined) request.librarianResponse = response;

    await request.save();

    // History is preserved — rejected requests stay visible to the student.
    res.json({ message: "Access request rejected", request });
  } catch (error) {
    return sendError(res, error, "Could not reject request");
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// SECURE BOOK INFO + PAGE RENDERING
// ──────────────────────────────────────────────────────────────────────────────

// 📌 GET /api/access/book/:bookId/info — sanitized metadata for approved readers.
export const getBookInfo = async (req, res) => {
  try {
    const { bookId } = req.params;

    const access = await resolveActiveAccess(req.user._id, bookId);
    if (!access.ok) {
      return access.code === "expired"
        ? res.status(410).json({ message: "Access expired" })
        : res.status(403).json({ message: "Access denied" });
    }

    // Pull only the public-safe fields. filename is excluded by select.
    const book = await Book.findById(bookId).select("title author totalPages");

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({
      title: book.title,
      author: book.author,
      totalPages: book.totalPages || 0,
    });
  } catch (error) {
    return sendError(res, error, "Server error");
  }
};

// 📌 GET /api/access/book/:bookId/page/:pageNumber — watermarked PNG per page.
//
//   Success  →  image/png binary
//   Failure  →  application/json  { page, stage, message, code }
//
// Every stage is logged individually. Access is re-validated per request (never
// trusted from the frontend): approved AND not expired, via resolveActiveAccess.
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
      access = await resolveActiveAccess(req.user._id, bookId);
    } catch (e) {
      return fail("accessLookup", e.message, 500);
    }
    if (!access.ok) {
      if (access.code === "expired") {
        return fail("accessExpiry", "Access expired", 410);
      }
      return fail("accessLookup", "Access denied", 403);
    }
    markStage("accessCheck");

    // ── [4] book lookup ─────────────────────────────────────────────
    let book;
    try {
      book = await Book.findById(bookId).select("+filename title totalPages");
    } catch (e) {
      return fail("bookLookup", e.message, 500);
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
      return fail("userLookup", e.message, 500);
    }
    markStage("userLookup");

    const today = new Date().toISOString().slice(0, 10);

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
        date: today,
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