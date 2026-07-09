/**
 * Pure display formatting for the desktop screens: relative "last scan"
 * times, run durations, and schedule labels. No Vue, no Nuxt — the peer test
 * (format.test.ts) pins each contract.
 */

/** "just now" / "4m ago" / "2h ago" / "3d ago"; older dates fall back to the date. */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const seconds = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return iso.slice(0, 10);
}

/** Run duration, sub-second precise when short: "0.4s", "12.0s", "2m 05s". */
export function formatDuration(startedAt: string, finishedAt: string | null): string | null {
  if (finishedAt === null) return null;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  if (Number.isNaN(ms) || ms < 0) return null;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

/** The schedule chip's text: the cron expression, or a quiet "no schedule". */
export function scheduleLabel(schedule: string | null): string {
  return schedule !== null && schedule !== "" ? schedule : "no schedule";
}
