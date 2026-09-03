import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// ReadingLog — one document per reading session.
//
// A session is created when a student opens the secure reader and is updated
// in-place by heartbeats (never a new document per page change). `durationInSeconds`
// accumulates only *active* reading time: the frontend pauses heartbeats while the
// tab is hidden, and the backend clamps every per-heartbeat delta to
// HEARTBEAT_MAX_DELTA_SECONDS so the field can never be inflated by a client or by
// long idle gaps.
//
// Day-attribution strategy (documented): a session's duration is attributed to the
// UTC calendar day of its `lastActivityAt` timestamp. Analytics day buckets,
// streaks and weekly comparisons all use UTC days server-side; frontends may
// reformat for local display.
// ─────────────────────────────────────────────────────────────────────────────

const readingLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    accessRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessRequest",
    },

    // ─── Session lifecycle ─────────────────────────────────────────────
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    sessionActive: {
      type: Boolean,
      default: true,
    },

    // ─── Activity / duration ───────────────────────────────────────────
    // Total active reading seconds, accumulated from clamped heartbeat deltas.
    durationInSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Updated on every valid heartbeat. Used for stale-session detection and
    // day attribution.
    lastActivityAt: {
      type: Date,
    },

    // ─── Page tracking ─────────────────────────────────────────────────
    // Total count of page-activity reports (one per heartbeat that carries a page).
    pagesViewed: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Number of distinct pages in `viewedPages`.
    uniquePagesViewed: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Distinct page numbers visited this session. Bounded by the book's
    // `totalPages` (validated server-side), so the array can never grow
    // unboundedly for a real book. Kept so analytics can compute the union of
    // pages read per book across sessions.
    viewedPages: {
      type: [Number],
      default: [],
    },
    lastPage: {
      type: Number,
      default: 1,
      min: 1,
    },
    highestPageReached: {
      type: Number,
      default: 1,
      min: 1,
    },
    // (highestPageReached / book.totalPages) * 100, clamped 0..100.
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ─── Peak-reading-time tracking ────────────────────────────────────
    // Lightweight Map of hour (0..23, server UTC) → activity count.
    // Incremented with $inc-style updates on each heartbeat so peak-time
    // insights come from real activity timestamps without per-event documents.
    activityByHour: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Each index is justified by a specific query:
//   1. { user: 1, createdAt: -1 }   → student analytics (their sessions, newest first).
//   2. { book: 1, createdAt: -1 }   → per-book engagement aggregation.
//   3. { sessionActive: 1, lastActivityAt: 1 } → stale-session sweeps
//      (find active sessions whose lastActivityAt is older than the threshold).
//   4. { user: 1, book: 1, sessionActive: 1 }  → session reuse in /reading/start
//      (look up an active session for the same user + book).
readingLogSchema.index({ user: 1, createdAt: -1 });
readingLogSchema.index({ book: 1, createdAt: -1 });
readingLogSchema.index({ sessionActive: 1, lastActivityAt: 1 });
readingLogSchema.index({ user: 1, book: 1, sessionActive: 1 });

const ReadingLog = mongoose.model("ReadingLog", readingLogSchema);
export default ReadingLog;