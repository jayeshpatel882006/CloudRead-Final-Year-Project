// utils/format.js
// Small display helpers shared by the analytics pages.

/** Compact duration: "3d 4h", "2h 15m", "45m", "30s". */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${s}s`;
}

/** Long-form hours+minutes: "24h 35m" (used for the headline reading-time stat). */
export function formatHoursMinutes(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Render a UTC "YYYY-MM-DD" day key (as returned by the analytics API) as a
 * short local label like "Mon 1" — the API buckets by UTC day; this converts to
 * the user's local timezone for display.
 */
export function formatDayKey(dayKey) {
  const d = new Date(`${dayKey}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}