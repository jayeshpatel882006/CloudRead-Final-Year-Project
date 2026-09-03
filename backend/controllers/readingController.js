// controllers/readingController.js
// -----------------------------------------------------------------------------
// Reading session tracking + analytics + smart insights.
//
// Security rules enforced on EVERY reading endpoint:
//   1. JWT authentication (via `protect` middleware)
//   2. Correct role (via `authorizeRoles` middleware)
//   3. Valid MongoDB ObjectId for ids
//   4. Approved + non-expired access before sessions can start/continue
//   5. Session ownership — a user can never touch another user's session (403)
//   6. `currentPage` validated against the Book record, never the client
//   7. Duration deltas clamped per heartbeat (see services/readingAnalytics.js)
//
// The raw PDF is never touched here — analytics aggregate ReadingLog documents
// and public Book fields (title, author, totalPages) only.
// -----------------------------------------------------------------------------

import mongoose from "mongoose";
import ReadingLog from "../models/ReadingLog.js";
import Book from "../models/Book.js";
import AccessRequest from "../models/AccessRequest.js";
import { resolveActiveAccess } from "./accessController.js";
import {
  READING_CONSTANTS,
  finalizeStaleSessions,
  findActiveSession,
  computeDurationDelta,
  getStudentAnalytics,
  getStudentInsights,
  getLibrarianAnalytics,
  getLibrarianInsights,
  getAdminAnalytics,
  getAdminInsights,
} from "../services/readingAnalytics.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

/** Parse `value` as a positive integer page number, or null if invalid. */
function parsePageNumber(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number.parseInt(value.trim(), 10);
    return n >= 1 ? n : null;
  }
  return null;
}

/**
 * Verify the student has an approved, non-expired AccessRequest for the book.
 * Returns the active AccessRequest or throws a normalized { status, message }
 * error. Uses the shared resolver so a stale approved record can never shadow
 * a newer active approval.
 */
async function requireValidAccess(userId, bookId) {
  const result = await resolveActiveAccess(userId, bookId);
  if (!result.ok) {
    const err = new Error(result.code === "expired" ? "Access expired" : "Access denied");
    err.status = result.code === "expired" ? 410 : 403;
    throw err;
  }
  return result.access;
}

/** Shared error responder — never leaks stack traces or internals. */
const sendError = (res, err, fallback = "Server error") => {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message =
    status >= 500 ? fallback : err?.message || fallback;
  return res.status(status).json({ message });
};

// ──────────────────────────────────────────────────────────────────────────────
// SESSION LIFECYCLE
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Start a reading session
// POST /api/reading/start  { bookId }
export const startReading = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await Book.findById(bookId).select("totalPages title");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Approved + non-expired access required.
    await requireValidAccess(req.user._id, bookId);

    // Close any of this user's abandoned sessions first.
    await finalizeStaleSessions({ user: req.user._id });

    // Reuse an existing live session for the same user + book (idempotent start,
    // also survives React StrictMode double-mounts and tab reloads).
    const existing = await findActiveSession(req.user._id, bookId);
    if (existing) {
      return res.json({
        sessionId: existing._id,
        openedAt: existing.openedAt,
        lastPage: existing.lastPage,
        progressPercentage: existing.progressPercentage,
        reused: true,
      });
    }

    const access = await AccessRequest.findOne({
      user: req.user._id,
      book: bookId,
      status: "approved",
    });

    const session = await ReadingLog.create({
      user: req.user._id,
      book: bookId,
      accessRequest: access?._id,
      openedAt: new Date(),
      lastActivityAt: new Date(),
      lastPage: 1,
      highestPageReached: 1,
      // Progress is 0 until the first heartbeat records an actual page read.
      progressPercentage: 0,
      sessionActive: true,
    });

    res.status(201).json({
      sessionId: session._id,
      openedAt: session.openedAt,
      lastPage: session.lastPage,
      progressPercentage: session.progressPercentage,
    });
  } catch (error) {
    return sendError(res, error, "Could not start reading session");
  }
};

// 📌 Heartbeat / activity update
// POST /api/reading/heartbeat  { sessionId, currentPage, totalPages?, activeSeconds? }
export const heartbeat = async (req, res) => {
  try {
    const { sessionId, currentPage } = req.body;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const page = parsePageNumber(currentPage);
    if (page === null) {
      return res.status(400).json({ message: "Invalid page number" });
    }

    const session = await ReadingLog.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Reading session not found" });
    }
    // Ownership — never allow updating another student's session.
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (!session.sessionActive) {
      return res.status(400).json({ message: "Reading session is closed" });
    }

    // Re-validate access on every heartbeat (catches revoked / expired access).
    const book = await Book.findById(session.book).select("totalPages");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (page > book.totalPages) {
      return res.status(400).json({ message: "Page out of range" });
    }
    await requireValidAccess(req.user._id, session.book);

    const now = new Date();
    const clientSeconds = req.body.activeSeconds;
    // Fall back to openedAt for sessions that somehow lack a first activity stamp.
    const delta = computeDurationDelta(
      session.lastActivityAt || session.openedAt,
      clientSeconds,
    );

    const hour = now.getUTCHours();
    const activityByHour = session.activityByHour || new Map();
    activityByHour.set(String(hour), (activityByHour.get(String(hour)) || 0) + 1);

    const viewed = new Set(session.viewedPages || []);
    if (!viewed.has(page)) viewed.add(page);

    session.lastActivityAt = now;
    session.durationInSeconds = Math.floor(session.durationInSeconds) + delta;
    session.lastPage = page;
    session.highestPageReached = Math.max(session.highestPageReached, page);
    session.progressPercentage = Math.min(
      100,
      Math.round((session.highestPageReached / book.totalPages) * 100),
    );
    session.pagesViewed += 1;
    session.viewedPages = [...viewed];
    session.uniquePagesViewed = viewed.size;
    session.activityByHour = activityByHour;

    await session.save();

    res.json({
      sessionId: session._id,
      lastPage: session.lastPage,
      highestPageReached: session.highestPageReached,
      progressPercentage: session.progressPercentage,
      durationInSeconds: session.durationInSeconds,
      sessionActive: session.sessionActive,
    });
  } catch (error) {
    return sendError(res, error, "Could not update reading session");
  }
};

// 📌 Stop a reading session
// POST /api/reading/stop  { sessionId, currentPage?, activeSeconds? }
export const stopReading = async (req, res) => {
  try {
    const { sessionId, currentPage } = req.body;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await ReadingLog.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Reading session not found" });
    }
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Idempotent stop — double-stop (unmount + unload beacon) returns stats.
    if (!session.sessionActive) {
      return res.json({
        sessionId: session._id,
        message: "Reading session already closed",
        durationInSeconds: session.durationInSeconds,
        progressPercentage: session.progressPercentage,
        lastPage: session.lastPage,
      });
    }

    const book = await Book.findById(session.book).select("totalPages");
    const page = parsePageNumber(currentPage);
    const now = new Date();

    const delta = computeDurationDelta(
      session.lastActivityAt || session.openedAt,
      req.body.activeSeconds,
    );

    const viewed = new Set(session.viewedPages || []);
    if (page !== null && book && page <= book.totalPages && !viewed.has(page)) {
      viewed.add(page);
      session.lastPage = page;
      session.highestPageReached = Math.max(session.highestPageReached, page);
      if (book.totalPages > 0) {
        session.progressPercentage = Math.min(
          100,
          Math.round((session.highestPageReached / book.totalPages) * 100),
        );
      }
      session.pagesViewed += 1;
    }

    session.durationInSeconds = Math.floor(session.durationInSeconds) + delta;
    session.lastActivityAt = now;
    session.closedAt = now;
    session.sessionActive = false;
    session.viewedPages = [...viewed];
    session.uniquePagesViewed = viewed.size;

    await session.save();

    res.json({
      sessionId: session._id,
      closedAt: session.closedAt,
      durationInSeconds: session.durationInSeconds,
      pagesViewed: session.pagesViewed,
      uniquePagesViewed: session.uniquePagesViewed,
      lastPage: session.lastPage,
      highestPageReached: session.highestPageReached,
      progressPercentage: session.progressPercentage,
      sessionActive: false,
    });
  } catch (error) {
    return sendError(res, error, "Could not stop reading session");
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ANALYTICS + INSIGHTS
// ──────────────────────────────────────────────────────────────────────────────

// 📌 Student analytics
// GET /api/reading/student/analytics
export const getStudentAnalyticsHandler = async (req, res) => {
  try {
    const data = await getStudentAnalytics(req.user._id);
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load reading analytics");
  }
};

// 📌 Student smart insights
// GET /api/reading/student/insights
export const getStudentInsightsHandler = async (req, res) => {
  try {
    const data = await getStudentInsights(req.user._id);
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load reading insights");
  }
};

// 📌 Librarian analytics (scoped to books uploaded by this librarian)
// GET /api/reading/librarian/analytics
export const getLibrarianAnalyticsHandler = async (req, res) => {
  try {
    const data = await getLibrarianAnalytics(req.user._id);
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load librarian analytics");
  }
};

// 📌 Librarian smart insights
// GET /api/reading/librarian/insights
export const getLibrarianInsightsHandler = async (req, res) => {
  try {
    const data = await getLibrarianInsights(req.user._id);
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load librarian insights");
  }
};

// 📌 Admin platform analytics
// GET /api/reading/admin/analytics
export const getAdminAnalyticsHandler = async (req, res) => {
  try {
    const data = await getAdminAnalytics();
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load platform analytics");
  }
};

// 📌 Admin platform smart insights
// GET /api/reading/admin/insights
export const getAdminInsightsHandler = async (req, res) => {
  try {
    const data = await getAdminInsights();
    res.json(data);
  } catch (error) {
    return sendError(res, error, "Could not load platform insights");
  }
};

export { READING_CONSTANTS };