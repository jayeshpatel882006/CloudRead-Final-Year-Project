// services/readingAnalytics.js
// -----------------------------------------------------------------------------
// Reading analytics + smart insights engine for CloudRead.
//
// All insights are generated with normal MongoDB aggregation pipelines and
// plain backend calculations — no AI APIs, no external services.
//
// Timezone strategy (documented): every day bucketing (weekly activity, streaks,
// trends, peak hours) uses UTC days server-side. MongoDB stores timestamps in
// UTC by default; `$dateToString` without a timezone argument uses UTC. The API
// is designed so a `timezone` parameter can be threaded through later.
// -----------------------------------------------------------------------------

import ReadingLog from "../models/ReadingLog.js";
import Book from "../models/Book.js";
import AccessRequest from "../models/AccessRequest.js";

// ──────────────────────────────────────────────────────────────────────────────
// Tuning constants — single source of truth.
// ──────────────────────────────────────────────────────────────────────────────
export const READING_CONSTANTS = {
  // Maximum seconds credited per heartbeat delta. Prevents clients (or long
  // hidden-tab gaps) from inflating durationInSeconds beyond one heartbeat's
  // worth of real time. Heartbeats run every 60s, so 120s is a generous cap.
  HEARTBEAT_MAX_DELTA_SECONDS: 120,

  // A session whose last activity is older than this is treated as abandoned.
  // The backend closes it lazily (on start/heartbeat/analytics) — no cron job.
  STALE_SESSION_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes

  // A book counts as "completed" at this progress percentage.
  COMPLETION_THRESHOLD: 90,

  // Used by the "close to completing" insight.
  NEAR_COMPLETION_THRESHOLD: 80,

  // A calendar day counts toward a reading streak when it has at least this
  // many seconds of tracked active reading.
  STREAK_MIN_SECONDS_PER_DAY: 300, // 5 minutes

  // "Active reader" windows.
  ACTIVE_READERS_24H_MS: 24 * 60 * 60 * 1000,
  WEEKLY_WINDOW_DAYS: 7,
  MONTHLY_WINDOW_DAYS: 30,

  // List limits.
  MOST_READ_LIMIT: 5,
  TOP_BOOKS_LIMIT: 10,
  TOP_STUDENTS_LIMIT: 10,

  // Minimum number of activity samples before peak-reading-time insights are
  // considered meaningful.
  INSIGHT_MIN_SAMPLES: 5,

  // Trend day window for librarian/admin charts.
  TREND_DAYS: 30,
};

// ──────────────────────────────────────────────────────────────────────────────
// Small date helpers (UTC day strategy).
// ──────────────────────────────────────────────────────────────────────────────

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)
}

/** Start of `n` days ago (UTC midnight). */
export function daysAgoUTC(n, from = new Date()) {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stale-session handling
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Close abandoned sessions (sessionActive = true, last activity older than the
 * threshold). Duration is kept as accumulated (already clamped per heartbeat);
 * sessions with no activity at all are closed with their stored duration.
 * Runs lazily — no cron job required.
 */
export async function finalizeStaleSessions(extraMatch = {}) {
  const cutoff = new Date(Date.now() - READING_CONSTANTS.STALE_SESSION_THRESHOLD_MS);

  const stale = await ReadingLog.find({
    sessionActive: true,
    $or: [{ lastActivityAt: { $lt: cutoff } }, { lastActivityAt: null }],
    ...extraMatch,
  }).select("_id lastActivityAt openedAt durationInSeconds");

  if (stale.length === 0) return 0;

  const now = new Date();
  const ops = stale.map((s) =>
    ReadingLog.updateOne(
      { _id: s._id },
      {
        $set: {
          sessionActive: false,
          closedAt: s.lastActivityAt || s.openedAt || now,
          lastActivityAt: s.lastActivityAt || now,
        },
      },
    ),
  );
  await Promise.all(ops);
  return ops.length;
}

/**
 * Find an active (non-stale) session for a user+book, or null.
 * Used by /reading/start to reuse an existing live session.
 */
export async function findActiveSession(userId, bookId) {
  const staleCutoff = new Date(
    Date.now() - READING_CONSTANTS.STALE_SESSION_THRESHOLD_MS,
  );
  return ReadingLog.findOne({
    user: userId,
    book: bookId,
    sessionActive: true,
    $or: [
      { lastActivityAt: { $gte: staleCutoff } },
      { lastActivityAt: null, openedAt: { $gte: staleCutoff } },
    ],
  });
}

/** Clamp a heartbeat duration delta so a single update can never over-credit. */
export function clampDurationDelta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(
    Math.floor(seconds),
    READING_CONSTANTS.HEARTBEAT_MAX_DELTA_SECONDS,
  );
}

/**
 * Compute the seconds to credit for one heartbeat/stop event.
 * `elapsedMs` is wall-clock time since the last recorded activity; `clientSeconds`
 * is the optional active-seconds the frontend accumulated while the tab was
 * visible. We never credit more than the smaller of the two (bounded by the cap),
 * so hidden-tab time can never be counted and a lying client cannot inflate.
 */
export function computeDurationDelta(lastActivityAt, clientSeconds) {
  const now = Date.now();
  const elapsedMs = lastActivityAt ? now - new Date(lastActivityAt).getTime() : 0;
  const elapsed = clampDurationDelta(elapsedMs / 1000);

  if (clientSeconds == null) return elapsed;

  const client = clampDurationDelta(clientSeconds);
  return Math.min(client, elapsed);
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared aggregation helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Per-day reading buckets between `start` and `end` (UTC), attributed by
 * `lastActivityAt`. Returns [{ date: "YYYY-MM-DD", readingSeconds, readers: [ids] }].
 */
async function dailyBuckets(match, start, end) {
  const rows = await ReadingLog.aggregate([
    {
      $match: {
        ...match,
        lastActivityAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$lastActivityAt" },
        },
        readingSeconds: { $sum: "$durationInSeconds" },
        readers: { $addToSet: "$user" },
      },
    },
  ]);

  const map = new Map(rows.map((r) => [r._id, r]));
  const out = [];
  // Walk day-by-day so zero-activity days are included (charts render correctly).
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endMs = new Date(end).getTime();
  while (cursor.getTime() <= endMs) {
    const key = dayKey(cursor);
    const row = map.get(key);
    out.push({
      date: key,
      readingSeconds: row?.readingSeconds ?? 0,
      activeReaders: row?.readers?.length ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Distinct users matching `match` with activity since `since` (inclusive). */
async function distinctReaders(match, since) {
  const rows = await ReadingLog.aggregate([
    { $match: { ...match, lastActivityAt: { $gte: since } } },
    { $group: { _id: null, readers: { $addToSet: "$user" } } },
  ]);
  return rows[0]?.readers?.length ?? 0;
}

/** Sum of durationInSeconds across `match`. */
async function totalReadingSeconds(match) {
  const rows = await ReadingLog.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$durationInSeconds" } } },
  ]);
  return rows[0]?.total ?? 0;
}

/**
 * Per-book engagement: unique readers, total seconds, average session seconds,
 * average session progress, and the union of pages viewed across sessions.
 */
async function bookEngagement(bookMatch) {
  const rows = await ReadingLog.aggregate([
    { $match: bookMatch },
    {
      $group: {
        _id: "$book",
        uniqueReaders: { $addToSet: "$user" },
        totalReadingSeconds: { $sum: "$durationInSeconds" },
        sessionCount: { $sum: 1 },
        averageProgress: { $avg: "$progressPercentage" },
        pages: { $setUnion: [{ $ifNull: ["$viewedPages", []] }] },
      },
    },
    {
      $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book",
      },
    },
    { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bookId: "$_id",
        title: "$book.title",
        author: "$book.author",
        totalPages: "$book.totalPages",
        uniqueReaders: { $size: "$uniqueReaders" },
        totalReadingSeconds: 1,
        sessionCount: 1,
        averageReadingSeconds: {
          $cond: [
            { $eq: ["$sessionCount", 0] },
            0,
            { $divide: ["$totalReadingSeconds", "$sessionCount"] },
          ],
        },
        averageProgress: { $round: ["$averageProgress", 0] },
        pagesRead: { $size: "$pages" },
      },
    },
    { $sort: { totalReadingSeconds: -1 } },
  ]);
  return rows;
}

/** Per-user engagement (platform-wide), with user names. */
async function userEngagement(match, limit) {
  const rows = await ReadingLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$user",
        totalReadingSeconds: { $sum: "$durationInSeconds" },
        sessionCount: { $sum: 1 },
        books: { $addToSet: "$book" },
        averageProgress: { $avg: "$progressPercentage" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: "$_id",
        name: "$user.name",
        totalReadingSeconds: 1,
        sessionCount: 1,
        booksRead: { $size: "$books" },
        averageProgress: { $round: ["$averageProgress", 0] },
      },
    },
    { $sort: { totalReadingSeconds: -1 } },
    { $limit: limit },
  ]);
  return rows;
}

/** Distinct users per book (for "most popular" rankings). */
async function bookReaderCounts(match) {
  const rows = await ReadingLog.aggregate([
    { $match: match },
    { $group: { _id: "$book", readers: { $addToSet: "$user" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.readers.length]));
}

// ──────────────────────────────────────────────────────────────────────────────
// Reading streaks
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute { currentStreak, longestStreak } from per-day durations.
 * A day counts when its total active reading >= STREAK_MIN_SECONDS_PER_DAY.
 * The current streak ends at the most recent active day; a streak is only "live"
 * if that day is today or yesterday (otherwise currentStreak = 0).
 */
export async function computeStreaks(userId, since) {
  const rows = await ReadingLog.aggregate([
    {
      $match: {
        user: userId,
        lastActivityAt: { $gte: since },
        durationInSeconds: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastActivityAt" } },
        total: { $sum: "$durationInSeconds" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const days = rows
    .filter((r) => r.total >= READING_CONSTANTS.STREAK_MIN_SECONDS_PER_DAY)
    .map((r) => r._id);

  if (days.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Longest run of consecutive UTC days.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00Z");
    const cur = new Date(days[i] + "T00:00:00Z");
    const diffDays = (cur - prev) / 86400000;
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak: count backwards from the last active day.
  let current = 0;
  const lastActive = new Date(days[days.length - 1] + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysSinceLast = Math.round((today - lastActive) / 86400000);

  if (daysSinceLast <= 1) {
    current = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      const prev = new Date(days[i] + "T00:00:00Z");
      const cur = new Date(days[i + 1] + "T00:00:00Z");
      if ((cur - prev) / 86400000 === 1) current += 1;
      else break;
    }
  }

  return { currentStreak: current, longestStreak: longest };
}

// ──────────────────────────────────────────────────────────────────────────────
// Peak reading time (from activityByHour maps)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns the strongest reading hour (0–23) plus the total sample count,
 * or null when there is not enough data.
 */
export async function computePeakHour(match) {
  const rows = await ReadingLog.aggregate([
    { $match: match },
    {
      $project: {
        entries: { $objectToArray: { $ifNull: ["$activityByHour", {}] } },
      },
    },
    { $unwind: { path: "$entries", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $toInt: "$entries.k" },
        count: { $sum: "$entries.v" },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 3 },
  ]);

  const totalSamples = rows.reduce((sum, r) => sum + r.count, 0);
  if (totalSamples < READING_CONSTANTS.INSIGHT_MIN_SAMPLES || rows.length === 0) {
    return null;
  }
  return { hour: rows[0]._id, count: rows[0].count, totalSamples };
}

/** Human label for an hour window, e.g. 20 → "8 PM–10 PM". */
export function formatHourWindow(startHour, spanHours = 2) {
  const fmt = (h) => {
    const h24 = ((h % 24) + 24) % 24;
    const period = h24 < 12 ? "AM" : "PM";
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${hour12} ${period}`;
  };
  return `${fmt(startHour)}–${fmt(startHour + spanHours)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// STUDENT ANALYTICS
// ──────────────────────────────────────────────────────────────────────────────

export async function getStudentAnalytics(userId) {
  const now = new Date();
  // Fetch 14 days of buckets: the last 7 are the weekly chart, the first 7 are
  // the previous week (needed for the weekly-comparison insight).
  const bucketStart = daysAgoUTC(14);

  // Close this user's abandoned sessions so nothing is double-counted as active.
  await finalizeStaleSessions({ user: userId });

  const userMatch = { user: userId };

  const [totalSeconds, buckets14, engagement, streak, peak, progressRows] =
    await Promise.all([
      totalReadingSeconds(userMatch),
      dailyBuckets(userMatch, bucketStart, now),
      bookEngagement(userMatch),
      computeStreaks(userId, daysAgoUTC(90)),
      computePeakHour(userMatch),
      bookProgressRows(userMatch),
    ]);

  const weeklyActivity = buckets14.slice(-READING_CONSTANTS.WEEKLY_WINDOW_DAYS);
  const previousWeekActivity = buckets14.slice(
    0,
    buckets14.length - READING_CONSTANTS.WEEKLY_WINDOW_DAYS,
  );

  // Books the user still has valid access to (approved + not expired).
  const activeAccess = await AccessRequest.find({
    user: userId,
    status: "approved",
    accessEndDate: { $gte: now },
  }).select("book accessEndDate");
  const activeBookIds = new Set(activeAccess.map((a) => a.book.toString()));

  const normalizeProgress = (r) => ({
    bookId: r.bookId?.toString?.() || r.bookId,
    title: r.title || "Untitled",
    author: r.author || "Unknown",
    totalPages: r.totalPages || 0,
    totalReadingSeconds: r.totalReadingSeconds,
    pagesRead: r.pagesRead ?? 0,
    progressPercentage: Math.min(100, Math.max(0, Math.round(r.progressPercentage ?? 0))),
  });

  // Completed = best-session progress across ALL sessions, regardless of current access.
  const completed = progressRows
    .filter((r) => r.progressPercentage >= READING_CONSTANTS.COMPLETION_THRESHOLD)
    .map(normalizeProgress);

  // Currently reading = in progress AND still has valid access.
  const reading = progressRows
    .filter(
      (r) =>
        r.progressPercentage > 0 &&
        r.progressPercentage < READING_CONSTANTS.COMPLETION_THRESHOLD &&
        activeBookIds.has(String(r.bookId)),
    )
    .map(normalizeProgress);

  const pagesRead = engagement.reduce((sum, b) => sum + (b.pagesRead ?? 0), 0);
  const mostReadBooks = engagement
    .slice(0, READING_CONSTANTS.MOST_READ_LIMIT)
    .map((b) => ({
      bookId: b.bookId?.toString?.() || b.bookId,
      title: b.title || "Untitled",
      author: b.author || "Unknown",
      totalReadingSeconds: b.totalReadingSeconds,
      progressPercentage: Math.min(100, Math.max(0, Math.round(b.averageProgress || 0))),
      pagesRead: b.pagesRead ?? 0,
    }));

  // Continue-reading list: only books with valid access.
  const readingProgress = progressRows
    .filter((r) => activeBookIds.has(String(r.bookId)))
    .map((r) => ({
      bookId: r.bookId?.toString?.() || r.bookId,
      title: r.title || "Untitled",
      author: r.author || "Unknown",
      totalPages: r.totalPages || 0,
      lastPage: r.lastPage,
      highestPageReached: r.highestPageReached,
      progressPercentage: r.progressPercentage ?? 0,
    }));

  return {
    stats: {
      totalReadingSeconds: Math.floor(totalSeconds),
      booksCompleted: completed.length,
      currentlyReading: reading.length,
      pagesRead,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      peakHour: peak ? { hour: peak.hour, totalSamples: peak.totalSamples } : null,
    },
    weeklyActivity,
    previousWeekActivity,
    mostReadBooks,
    readingProgress,
  };
}

/** Per-book best-session progress + last page, computed from highest page reached. */
async function bookProgressRows(match) {
  return ReadingLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$book",
        lastPage: { $max: "$lastPage" },
        highestPageReached: { $max: "$highestPageReached" },
        totalReadingSeconds: { $sum: "$durationInSeconds" },
      },
    },
    {
      $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book",
      },
    },
    { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bookId: "$_id",
        title: "$book.title",
        author: "$book.author",
        totalPages: "$book.totalPages",
        lastPage: 1,
        highestPageReached: 1,
        totalReadingSeconds: 1,
        progressPercentage: {
          $cond: [
            {
              $and: [
                { $gt: ["$book.totalPages", 0] },
                { $ne: ["$book", null] },
              ],
            },
            {
              $min: [
                100,
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$highestPageReached", "$book.totalPages"] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { totalReadingSeconds: -1 } },
  ]);
}

// ──────────────────────────────────────────────────────────────────────────────
// STUDENT INSIGHTS
// ──────────────────────────────────────────────────────────────────────────────

export async function getStudentInsights(userId) {
  const analytics = await getStudentAnalytics(userId);

  const currentWeekSeconds = analytics.weeklyActivity.reduce(
    (s, r) => s + r.readingSeconds,
    0,
  );
  const previousWeekSeconds = analytics.previousWeekActivity.reduce(
    (s, r) => s + r.readingSeconds,
    0,
  );

  const pctChange =
    previousWeekSeconds > 0
      ? Math.round(((currentWeekSeconds - previousWeekSeconds) / previousWeekSeconds) * 100)
      : null;

  const insights = [];
  const summary = {
    currentWeekSeconds,
    previousWeekSeconds,
    changePercentage: pctChange,
  };

  // ── Insight 1: weekly comparison ────────────────────────────────────
  if (currentWeekSeconds === 0 && previousWeekSeconds === 0) {
    insights.push({
      type: "weekly_growth",
      priority: "neutral",
      title: "Start Reading",
      message: "You have not recorded reading activity yet. Open a book to begin tracking your progress.",
    });
  } else if (previousWeekSeconds === 0 && currentWeekSeconds > 0) {
    insights.push({
      type: "weekly_growth",
      priority: "positive",
      title: "Great Start!",
      message: "You began reading this week — a strong first step toward a new habit.",
    });
  } else if (currentWeekSeconds === 0 && previousWeekSeconds > 0) {
    insights.push({
      type: "weekly_growth",
      priority: "warning",
      title: "This Week Was Quiet",
      message: "No reading activity this week. A short session is all it takes to get back on track.",
    });
  } else {
    const direction = pctChange >= 0 ? "more" : "less";
    insights.push({
      type: "weekly_growth",
      priority: pctChange >= 0 ? "positive" : "warning",
      title: pctChange >= 0 ? "Great Progress!" : "Keep Pushing",
      message: `You read ${Math.abs(pctChange)}% ${direction} this week compared to last week.`,
    });
  }

  // ── Insight 2: peak reading time ────────────────────────────────────
  if (analytics.stats.peakHour) {
    const { hour } = analytics.stats.peakHour;
    insights.push({
      type: "peak_reading_time",
      priority: "info",
      title: "Your Best Reading Time",
      message: `You are most active between ${formatHourWindow(hour)}.`,
    });
  } else {
    insights.push({
      type: "peak_reading_time",
      priority: "neutral",
      title: "Discover Your Rhythm",
      message: "We need a little more reading activity to identify your favorite reading time.",
    });
  }

  // ── Insight 3: progress toward finishing a book ─────────────────────
  const inProgress = analytics.readingProgress.filter(
    (r) => r.progressPercentage < READING_CONSTANTS.COMPLETION_THRESHOLD && r.totalPages > 0,
  );
  if (inProgress.length > 0) {
    const top = inProgress[0]; // already sorted by reading time desc
    const remaining = Math.max(0, top.totalPages - top.highestPageReached);
    insights.push({
      type: "completion_progress",
      priority: "info",
      title: "Keep Going!",
      message:
        remaining === 0
          ? `You are almost done with "${top.title}". A few more pages to go!`
          : `You are ${remaining} page${remaining === 1 ? "" : "s"} away from completing "${top.title}".`,
    });
  }

  // ── Insight 4: reading streak ───────────────────────────────────────
  const { currentStreak, longestStreak } = analytics.stats;
  if (currentStreak >= 3) {
    insights.push({
      type: "streak",
      priority: "positive",
      title: "Reading Streak 🔥",
      message: `Amazing! You are on a ${currentStreak}-day reading streak.`,
    });
  } else if (currentStreak > 0 && longestStreak > currentStreak) {
    if (longestStreak - currentStreak === 1) {
      insights.push({
        type: "streak",
        priority: "info",
        title: "Almost a Record",
        message: `You are one day away from your longest reading streak of ${longestStreak} days.`,
      });
    } else {
      insights.push({
        type: "streak",
        priority: "info",
        title: "Reading Streak 🔥",
        message: `You are on a ${currentStreak}-day streak. Your longest is ${longestStreak} days.`,
      });
    }
  }

  // ── Insight 5: reading trend ────────────────────────────────────────
  if (currentWeekSeconds > 0 || previousWeekSeconds > 0) {
    let trendState = "stable";
    if (previousWeekSeconds === 0) trendState = "new_reader";
    else if (pctChange >= 20) trendState = "increasing";
    else if (pctChange <= -20) trendState = "decreasing";
    const messages = {
      increasing: `Your reading time increased by ${pctChange}% compared to last week.`,
      decreasing: `Your reading time decreased by ${Math.abs(pctChange)}% compared to last week.`,
      stable: "Your reading time is steady compared to last week. Consistency builds momentum.",
      new_reader: "Your reading journey is just beginning — keep the momentum going!",
    };
    insights.push({
      type: "trend",
      priority:
        trendState === "increasing" || trendState === "new_reader"
          ? "positive"
          : trendState === "decreasing"
            ? "warning"
            : "info",
      title:
        trendState === "increasing"
          ? "Reading Momentum"
          : trendState === "decreasing"
            ? "Take a Moment"
            : "Consistent Reader",
      message: messages[trendState],
    });
  }

  // ── Insight 6: completion summary ───────────────────────────────────
  const { booksCompleted } = analytics.stats;
  if (booksCompleted > 0) {
    insights.push({
      type: "completion",
      priority: "positive",
      title: "Completed Books 🎉",
      message: `You have completed ${booksCompleted} book${booksCompleted === 1 ? "" : "s"}.`,
    });
  } else {
    const almostDone = analytics.readingProgress.find(
      (r) =>
        r.progressPercentage >= READING_CONSTANTS.NEAR_COMPLETION_THRESHOLD &&
        r.progressPercentage < READING_CONSTANTS.COMPLETION_THRESHOLD,
    );
    if (almostDone) {
      insights.push({
        type: "completion",
        priority: "positive",
        title: "So Close!",
        message: `You are close to completing "${almostDone.title}" (${almostDone.progressPercentage}%).`,
      });
    }
  }

  return { summary, insights };
}

// ──────────────────────────────────────────────────────────────────────────────
// LIBRARIAN ANALYTICS (scoped to books uploaded by the librarian)
// ──────────────────────────────────────────────────────────────────────────────

export async function getLibrarianAnalytics(userId) {
  const now = new Date();
  await finalizeStaleSessions();

  const books = await Book.find({ uploadedBy: userId }).select("_id title author totalPages");
  const bookIds = books.map((b) => b._id);
  const bookMatch = bookIds.length > 0 ? { book: { $in: bookIds } } : { book: { $in: [] } };

  const trendStart = daysAgoUTC(READING_CONSTANTS.TREND_DAYS - 1);

  const [totalSeconds, engagement, trends, readerCounts, topStudents, active24h, weekPeak] =
    await Promise.all([
      totalReadingSeconds(bookMatch),
      bookEngagement(bookMatch),
      dailyBuckets(bookMatch, trendStart, now),
      bookReaderCounts(bookMatch),
      userEngagement(bookMatch, READING_CONSTANTS.TOP_STUDENTS_LIMIT),
      distinctReaders(bookMatch, new Date(now.getTime() - READING_CONSTANTS.ACTIVE_READERS_24H_MS)),
      computePeakHour(bookMatch),
    ]);

  const topBooks = engagement.slice(0, READING_CONSTANTS.MOST_READ_LIMIT).map((b) => ({
    bookId: b.bookId?.toString?.() || b.bookId,
    title: b.title || "Untitled",
    author: b.author || "Unknown",
    uniqueReaders: b.uniqueReaders,
    totalReadingSeconds: b.totalReadingSeconds,
    averageProgress: b.averageProgress,
  }));

  const bookEngagement = engagement.map((b) => ({
    bookId: b.bookId?.toString?.() || b.bookId,
    title: b.title || "Untitled",
    author: b.author || "Unknown",
    totalPages: b.totalPages || 0,
    uniqueReaders: b.uniqueReaders,
    totalReadingSeconds: b.totalReadingSeconds,
    averageReadingSeconds: Math.round(b.averageReadingSeconds || 0),
    averageProgress: b.averageProgress,
    pagesRead: b.pagesRead,
  }));

  const totalUniqueReaders = [...readerCounts.values()].reduce((s, n) => s + n, 0);
  const mostPopular = topBooks[0] || null;

  return {
    stats: {
      totalReadingSeconds: Math.floor(totalSeconds),
      activeReaders24h: active24h,
      totalUniqueReaders,
      totalBooks: bookIds.length,
      mostPopularBook: mostPopular
        ? { bookId: mostPopular.bookId, title: mostPopular.title }
        : null,
      peakHour: weekPeak ? { hour: weekPeak.hour, totalSamples: weekPeak.totalSamples } : null,
    },
    trends,
    bookEngagement,
    topBooks,
    topStudents,
    weeklyActivity: trends.slice(-READING_CONSTANTS.WEEKLY_WINDOW_DAYS),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// LIBRARIAN INSIGHTS
// ──────────────────────────────────────────────────────────────────────────────

export async function getLibrarianInsights(userId) {
  const analytics = await getLibrarianAnalytics(userId);
  const insights = [];
  const summary = {};

  // trends covers 30 days; current week = last 7, previous week = days 8–14.
  const currentWeek = analytics.trends
    .slice(-READING_CONSTANTS.WEEKLY_WINDOW_DAYS)
    .reduce((s, r) => s + r.readingSeconds, 0);
  const previousWeek = analytics.trends
    .slice(-2 * READING_CONSTANTS.WEEKLY_WINDOW_DAYS, -READING_CONSTANTS.WEEKLY_WINDOW_DAYS)
    .reduce((s, r) => s + r.readingSeconds, 0);
  summary.currentWeekSeconds = currentWeek;
  summary.previousWeekSeconds = previousWeek;

  const pctChange =
    previousWeek > 0 ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : null;

  // ── Librarian insight 1: highest engagement book this week ──────────
  const top = analytics.topBooks[0];
  if (top) {
    insights.push({
      type: "top_book_engagement",
      priority: "positive",
      title: "Most Engaging Book",
      message: `"${top.title}" has the highest reading engagement${top.uniqueReaders === 1 ? "" : ` with ${top.uniqueReaders} readers`}.`,
    });
  }

  // ── Librarian insight 2: activity growth ────────────────────────────
  if (currentWeek === 0 && previousWeek === 0) {
    insights.push({
      type: "activity_growth",
      priority: "neutral",
      title: "No Activity Yet",
      message: "Reading activity will appear here once students start reading your books.",
    });
  } else if (previousWeek === 0 && currentWeek > 0) {
    insights.push({
      type: "activity_growth",
      priority: "positive",
      title: "New Momentum",
      message: "Students started reading your books this week.",
    });
  } else {
    const direction = pctChange >= 0 ? "increased" : "decreased";
    insights.push({
      type: "activity_growth",
      priority: pctChange >= 0 ? "positive" : "warning",
      title: "Activity Trend",
      message: `Reading activity ${direction} by ${Math.abs(pctChange)}% compared to last week.`,
    });
  }

  // ── Librarian insight 3: active students this week ──────────────────
  const weekAgo = daysAgoUTC(6);
  const bookIds = (await Book.find({ uploadedBy: userId }).select("_id")).map((b) => b._id);
  const activeWeek = bookIds.length
    ? await distinctReaders({ book: { $in: bookIds } }, weekAgo)
    : 0;
  if (activeWeek > 0) {
    insights.push({
      type: "active_students",
      priority: "info",
      title: "Active Readers",
      message: `${activeWeek} student${activeWeek === 1 ? "" : "s"} actively read your books this week.`,
    });
  }

  // ── Librarian insight 4: highest average completion ─────────────────
  const byProgress = [...analytics.bookEngagement]
    .filter((b) => b.uniqueReaders > 0)
    .sort((a, b) => b.averageProgress - a.averageProgress);
  if (byProgress.length > 0 && byProgress[0].averageProgress > 0) {
    insights.push({
      type: "completion_leader",
      priority: "positive",
      title: "Best Completion Rate",
      message: `"${byProgress[0].title}" has the highest average reading completion at ${byProgress[0].averageProgress}%.`,
    });
  }

  return { summary, insights };
}

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN ANALYTICS (platform-wide)
// ──────────────────────────────────────────────────────────────────────────────

export async function getAdminAnalytics() {
  const now = new Date();
  await finalizeStaleSessions();

  const trendStart = daysAgoUTC(READING_CONSTANTS.TREND_DAYS - 1);
  const weekAgo = daysAgoUTC(READING_CONSTANTS.WEEKLY_WINDOW_DAYS - 1);
  const monthAgo = daysAgoUTC(READING_CONSTANTS.MONTHLY_WINDOW_DAYS - 1);

  const [platformSeconds, trends, peak, topBooks, topStudents, dailyActive, weeklyActive, monthlyActive] =
    await Promise.all([
      totalReadingSeconds({}),
      dailyBuckets({}, trendStart, now),
      computePeakHour({}),
      bookEngagement({}),
      userEngagement({}, READING_CONSTANTS.TOP_STUDENTS_LIMIT),
      distinctReaders({}, daysAgoUTC(0)),
      distinctReaders({}, weekAgo),
      distinctReaders({}, monthAgo),
    ]);

  const todayKey = dayKey(now);
  const dailyActiveReaders =
    trends.find((t) => t.date === todayKey)?.activeReaders ?? dailyActive;

  return {
    stats: {
      platformReadingSeconds: Math.floor(platformSeconds),
      dailyActiveReaders,
      weeklyActiveReaders: weeklyActive,
      monthlyActiveReaders: monthlyActive,
      peakHour: peak ? { hour: peak.hour, totalSamples: peak.totalSamples } : null,
    },
    trends,
    peakHours: (await peakHourDistribution()).map((p) => ({
      hour: p.hour,
      label: `${String(p.hour).padStart(2, "0")}:00–${String(p.hour + 1).padStart(2, "0")}:00`,
      count: p.count,
    })),
    topBooks: topBooks.slice(0, READING_CONSTANTS.TOP_BOOKS_LIMIT).map((b) => ({
      bookId: b.bookId?.toString?.() || b.bookId,
      title: b.title || "Untitled",
      author: b.author || "Unknown",
      uniqueReaders: b.uniqueReaders,
      totalReadingSeconds: b.totalReadingSeconds,
      averageProgress: b.averageProgress,
      pagesRead: b.pagesRead,
    })),
    topStudents: topStudents.map((s) => ({
      userId: s.userId?.toString?.() || s.userId,
      name: s.name || "Unknown",
      totalReadingSeconds: s.totalReadingSeconds,
      booksRead: s.booksRead,
      averageProgress: s.averageProgress,
      sessionCount: s.sessionCount,
    })),
  };
}

/** Hourly activity distribution across all sessions (24 buckets). */
async function peakHourDistribution() {
  const rows = await ReadingLog.aggregate([
    {
      $project: {
        entries: { $objectToArray: { $ifNull: ["$activityByHour", {}] } },
      },
    },
    { $unwind: { path: "$entries", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $toInt: "$entries.k" },
        count: { $sum: "$entries.v" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const out = [];
  for (let h = 0; h < 24; h++) out.push({ hour: h, count: map.get(h) ?? 0 });
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN INSIGHTS
// ──────────────────────────────────────────────────────────────────────────────

export async function getAdminInsights() {
  const analytics = await getAdminAnalytics();
  const insights = [];
  const summary = {};

  const currentWeekSeconds = analytics.trends
    .filter((t) => t.date >= dayKey(daysAgoUTC(6)))
    .reduce((s, t) => s + t.readingSeconds, 0);
  const previousWeekSeconds = analytics.trends
    .filter((t) => t.date < dayKey(daysAgoUTC(6)) && t.date >= dayKey(daysAgoUTC(13)))
    .reduce((s, t) => s + t.readingSeconds, 0);
  const pctChange =
    previousWeekSeconds > 0
      ? Math.round(((currentWeekSeconds - previousWeekSeconds) / previousWeekSeconds) * 100)
      : null;
  summary.currentWeekSeconds = currentWeekSeconds;
  summary.previousWeekSeconds = previousWeekSeconds;
  summary.changePercentage = pctChange;

  // ── Admin insight 1: platform growth ────────────────────────────────
  if (currentWeekSeconds === 0 && previousWeekSeconds === 0) {
    insights.push({
      type: "platform_growth",
      priority: "neutral",
      title: "Awaiting Activity",
      message: "Platform reading activity will appear once students begin reading.",
    });
  } else if (previousWeekSeconds === 0) {
    insights.push({
      type: "platform_growth",
      priority: "positive",
      title: "Platform Launching",
      message: "Platform reading activity began this week.",
    });
  } else {
    const direction = pctChange >= 0 ? "increased" : "decreased";
    insights.push({
      type: "platform_growth",
      priority: pctChange >= 0 ? "positive" : "warning",
      title: "Platform Growth",
      message: `Platform reading activity ${direction} by ${Math.abs(pctChange)}% this week.`,
    });
  }

  // ── Admin insight 2: peak reading time ──────────────────────────────
  if (analytics.stats.peakHour) {
    insights.push({
      type: "peak_reading_time",
      priority: "info",
      title: "Peak Reading Time",
      message: `Peak reading time is between ${formatHourWindow(analytics.stats.peakHour.hour)}.`,
    });
  } else {
    insights.push({
      type: "peak_reading_time",
      priority: "neutral",
      title: "Peak Reading Time",
      message: "Not enough reading activity yet to determine peak hours.",
    });
  }

  // ── Admin insight 3: most engaging book ─────────────────────────────
  const top = analytics.topBooks[0];
  if (top) {
    insights.push({
      type: "most_engaging_book",
      priority: "positive",
      title: "Most Engaging Book",
      message: `"${top.title}" is the most engaging book with ${top.uniqueReaders} reader${top.uniqueReaders === 1 ? "" : "s"} and ${formatDuration(top.totalReadingSeconds)} of reading time.`,
    });
  }

  // ── Admin insight 4: weekly active readers ──────────────────────────
  insights.push({
    type: "active_readers",
    priority: "info",
    title: "Weekly Active Readers",
    message: `${analytics.stats.weeklyActiveReaders} student${analytics.stats.weeklyActiveReaders === 1 ? "" : "s"} were active this week.`,
  });

  return { summary, insights };
}

/** Human duration like "2h 15m" (used inside insight messages). */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}