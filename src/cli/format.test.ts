import { describe, expect, test } from "vitest";

import type { Finding } from "../core/index.js";
import { formatHuman, formatJson, formatSarif } from "./format.js";

// format.ts turns the runner's Finding[] into the three CLI output shapes. Each case shows a
// small input and the exact string (or parsed structure) it produces.

const findings: Finding[] = [
  {
    id: "structure/section-missing",
    level: "error",
    path: "docs/a.md",
    message: "Summary is missing",
  },
  {
    id: "structure/heading-depth-jump",
    level: "warn",
    path: "docs/a.md",
    message: "H4 under H2",
    pos: { line: 5, col: 1 },
  },
];

describe("formatHuman", () => {
  test("an empty corpus reports 'No findings.'", () => {
    expect(formatHuman([])).toBe("No findings.");
  });

  test("one line per finding (path:line only when positioned), then a summary", () => {
    expect(formatHuman(findings)).toBe(
      [
        "docs/a.md error structure/section-missing — Summary is missing",
        "docs/a.md:5 warn structure/heading-depth-jump — H4 under H2",
        "",
        "2 finding(s): 1 error, 1 warn, 0 report",
      ].join("\n"),
    );
  });
});

describe("formatJson", () => {
  test("the findings array verbatim — round-trips through JSON.parse", () => {
    expect(JSON.parse(formatJson(findings))).toEqual(findings);
  });
});

describe("formatSarif — a SARIF 2.1.0 log", () => {
  const log = JSON.parse(formatSarif(findings));

  test("version + tool driver identify markdown-contract", () => {
    expect(log.version).toBe("2.1.0");
    expect(log.runs[0].tool.driver.name).toBe("markdown-contract");
  });

  test("distinct rule ids are listed once, in first-seen order", () => {
    expect(log.runs[0].tool.driver.rules).toEqual([
      { id: "structure/section-missing" },
      { id: "structure/heading-depth-jump" },
    ]);
  });

  test("each finding → one result (warn maps to 'warning'; startLine comes from pos)", () => {
    expect(log.runs[0].results[1]).toEqual({
      ruleId: "structure/heading-depth-jump",
      level: "warning",
      message: { text: "H4 under H2" },
      locations: [
        { physicalLocation: { artifactLocation: { uri: "docs/a.md" }, region: { startLine: 5 } } },
      ],
    });
  });

  test("a whole-document finding (no pos) omits the region", () => {
    expect(log.runs[0].results[0].locations[0].physicalLocation.region).toBeUndefined();
  });
});
