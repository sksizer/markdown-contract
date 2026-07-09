/**
 * Peer test (CONVENTIONS.md): the contract of the status/severity token tables
 * and their pure ordering helpers — given a level, you get exactly this rank;
 * given these findings, exactly this highest severity.
 */
import { describe, expect, it } from "bun:test";
import {
  highestSeverity,
  SEVERITY_ORDER,
  STATUS_ORDER,
  severityRank,
  severityTokens,
  statusTokens,
} from "./tokens";
import type { Finding } from "./types";

function finding(level: Finding["level"]): Finding {
  return { id: "structure/section-missing", level, path: "docs/guide.md", message: "m" };
}

describe("severityRank", () => {
  it("ranks error above warn above report", () => {
    expect(severityRank("error")).toBe(3);
    expect(severityRank("warn")).toBe(2);
    expect(severityRank("report")).toBe(1);
  });
});

describe("highestSeverity", () => {
  it("picks the most severe level present", () => {
    expect(highestSeverity([finding("report"), finding("error"), finding("warn")])).toBe("error");
    expect(highestSeverity([finding("report"), finding("warn")])).toBe("warn");
    expect(highestSeverity([finding("report")])).toBe("report");
  });

  it("is null for no findings", () => {
    expect(highestSeverity([])).toBeNull();
  });
});

describe("token tables", () => {
  it("covers every status in display order, keyed consistently", () => {
    expect(STATUS_ORDER).toEqual(["green", "findings", "drift", "running", "error"]);
    for (const key of STATUS_ORDER) expect(statusTokens[key].key).toBe(key);
  });

  it("covers every severity most-severe-first, keyed consistently", () => {
    expect(SEVERITY_ORDER).toEqual(["error", "warn", "report"]);
    for (const key of SEVERITY_ORDER) expect(severityTokens[key].key).toBe(key);
  });

  it("binds only var(--mc-…) references — never a color literal", () => {
    const tokens = [...Object.values(statusTokens), ...Object.values(severityTokens)];
    for (const t of tokens) {
      expect(t.color).toMatch(/^var\(--mc-/);
      expect(t.bg).toMatch(/^var\(--mc-/);
    }
  });
});
