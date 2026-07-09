// Peer test (CONVENTIONS.md): each formatter's contract as plain
// input → output cases.
import { describe, expect, it } from "bun:test";
import { formatDuration, formatRelativeTime, scheduleLabel } from "./format";

const NOW = Date.parse("2026-07-09T12:00:00Z");

describe("formatRelativeTime", () => {
  it("names the recency bands", () => {
    expect(formatRelativeTime("2026-07-09T11:59:30Z", NOW)).toBe("just now");
    expect(formatRelativeTime("2026-07-09T11:56:00Z", NOW)).toBe("4m ago");
    expect(formatRelativeTime("2026-07-09T10:00:00Z", NOW)).toBe("2h ago");
    expect(formatRelativeTime("2026-07-06T12:00:00Z", NOW)).toBe("3d ago");
  });

  it("falls back to the date for old timestamps and to the input for garbage", () => {
    expect(formatRelativeTime("2026-01-01T00:00:00Z", NOW)).toBe("2026-01-01");
    expect(formatRelativeTime("not a date", NOW)).toBe("not a date");
  });
});

describe("formatDuration", () => {
  it("is sub-second precise when short, minute-grouped when long", () => {
    expect(formatDuration("2026-07-09T12:00:00.000Z", "2026-07-09T12:00:00.400Z")).toBe("0.4s");
    expect(formatDuration("2026-07-09T12:00:00Z", "2026-07-09T12:00:12Z")).toBe("12.0s");
    expect(formatDuration("2026-07-09T12:00:00Z", "2026-07-09T12:02:05Z")).toBe("2m 05s");
  });

  it("is null while the run is still going (or for nonsense input)", () => {
    expect(formatDuration("2026-07-09T12:00:00Z", null)).toBeNull();
    expect(formatDuration("2026-07-09T12:00:00Z", "garbage")).toBeNull();
  });
});

describe("scheduleLabel", () => {
  it("shows the cron expression or a quiet placeholder", () => {
    expect(scheduleLabel("0 9 * * *")).toBe("0 9 * * *");
    expect(scheduleLabel(null)).toBe("no schedule");
    expect(scheduleLabel("")).toBe("no schedule");
  });
});
