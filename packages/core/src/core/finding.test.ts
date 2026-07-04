import { describe, expect, test } from "vitest";

import { ContractError, finding, notImplemented } from "./finding.js";
import type { Finding } from "./types.js";

// finding.ts owns the strict-door error and the uniform stub-throw. (The rule-author
// finding() factory lives on Ctx — see registry.ts; the standalone finding() export stays a
// stub until the validate plane assembles findings.)

const findings: Finding[] = [
  { id: "frontmatter/enum", level: "error", path: "x.md", message: "bad status" },
];

describe("ContractError — the failure read() throws", () => {
  test("is an Error named ContractError that carries the findings as data", () => {
    const err = new ContractError(findings);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ContractError");
    expect(err.findings).toBe(findings);
  });

  test("its default message counts the findings", () => {
    expect(new ContractError(findings).message).toBe(
      "contract validation failed with 1 finding(s)",
    );
  });

  test("a custom message is used verbatim", () => {
    expect(new ContractError([], "boom").message).toBe("boom");
  });
});

describe("notImplemented — the single stub throw", () => {
  test("builds an Error reading '<op>: not implemented'", () => {
    expect(notImplemented("parse").message).toBe("parse: not implemented");
  });
});

describe("finding — the bare factory fills the shared shape from a partial", () => {
  test("a minimal partial defaults level to 'error' and path to '', omitting pos/fix", () => {
    expect(finding({ id: "frontmatter/enum", message: "bad status" })).toEqual({
      id: "frontmatter/enum",
      level: "error",
      path: "",
      message: "bad status",
    });
  });

  test("every supplied field rides through verbatim (level, path, pos, fix)", () => {
    expect(
      finding({
        id: "structure/section-missing",
        message: "Summary is missing",
        level: "warn",
        path: "docs/a.md",
        pos: { line: 5, col: 1 },
        fix: { description: "add a Summary heading" },
      }),
    ).toEqual({
      id: "structure/section-missing",
      level: "warn",
      path: "docs/a.md",
      message: "Summary is missing",
      pos: { line: 5, col: 1 },
      fix: { description: "add a Summary heading" },
    });
  });
});
