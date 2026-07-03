import { describe, expect, it } from "bun:test";

import type { Finding } from "../../types/api";
import { findingToDrift } from "./runs";

function finding(id: string, overrides: Partial<Finding> = {}): Finding {
  return { id, level: "error", path: "notes/a.md", message: "detail", ...overrides };
}

describe("findingToDrift", () => {
  it("a missing section reads as section-removed", () => {
    expect(findingToDrift(finding("structure/section-missing")).kind).toBe("section-removed");
  });
  it("an unknown frontmatter key reads as field-added", () => {
    expect(findingToDrift(finding("frontmatter/unknown-key")).kind).toBe("field-added");
  });
  it("a missing frontmatter field reads as field-removed", () => {
    expect(findingToDrift(finding("frontmatter/required-missing")).kind).toBe("field-removed");
  });
  it("an order violation reads as order-changed", () => {
    expect(findingToDrift(finding("structure/section-order")).kind).toBe("order-changed");
  });
  it("anything else (e.g. a type mismatch) reads as field-changed", () => {
    expect(findingToDrift(finding("frontmatter/type")).kind).toBe("field-changed");
  });
  it("targets carry file and line; detail carries rule and message", () => {
    expect(findingToDrift(finding("frontmatter/type", { pos: { line: 3 } }))).toEqual({
      kind: "field-changed",
      target: "notes/a.md:3",
      detail: "frontmatter/type — detail",
    });
  });
});
