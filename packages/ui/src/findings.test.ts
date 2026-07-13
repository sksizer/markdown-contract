/**
 * Peer test (CONVENTIONS.md): the contract of the pure finding helpers — given
 * these findings, you get exactly these per-level tallies.
 */
import { describe, expect, it } from "bun:test";
import { countByLevel } from "./findings";
import type { Finding } from "./types";

function finding(level: Finding["level"]): Finding {
  return { id: "content/field-invalid", level, path: "docs/guide.md", message: "m" };
}

describe("countByLevel", () => {
  it("tallies findings per severity level", () => {
    const findings = [finding("error"), finding("warn"), finding("warn"), finding("report")];
    expect(countByLevel(findings)).toEqual({ error: 1, warn: 2, report: 1 });
  });

  it("always carries all three keys, zeroed when absent", () => {
    expect(countByLevel([])).toEqual({ error: 0, warn: 0, report: 0 });
  });
});
