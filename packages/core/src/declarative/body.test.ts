import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import v01 from "../../tests/fixtures/validation/01-single-required-section.js";
import v05 from "../../tests/fixtures/validation/05-strict-prefix-gap-tail.js";
import v06 from "../../tests/fixtures/validation/06-alias-sets-oneof.js";
import v09 from "../../tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.js";
import v10 from "../../tests/fixtures/validation/10-table-leaf-columns-minrows.js";
import v11 from "../../tests/fixtures/validation/11-typed-cells-enum-pattern.js";
import v12 from "../../tests/fixtures/validation/12-list-leaf-checkbox-minitems.js";
import v14 from "../../tests/fixtures/validation/14-nested-children-subsections.js";
import type { ValidationFixture } from "../../tests/harness.js";
import type { Finding } from "../core/types.js";
import { compileContractObject, DeclarativeError, loadContract } from "./index.js";

// Compare on the fields a YAML contract must reproduce exactly: id / level / line.
const shape = (findings: Finding[]): Array<{ id: string; level: string; line?: number }> =>
  findings.map((f) => ({ id: f.id, level: f.level, line: f.pos?.line }));

function peerText(stem: string): string {
  return readFileSync(
    fileURLToPath(
      new URL(`../../tests/fixtures/validation/${stem}.contract.yaml`, import.meta.url),
    ),
    "utf8",
  );
}

/** A YAML-authored contract must produce the same findings as its TS fixture, per case. */
function expectParity(fx: ValidationFixture, stem: string): void {
  const ts = fx.build();
  const yaml = loadContract(peerText(stem));
  const ctx = { path: fx.path ?? "fixture.md" };
  for (const c of fx.cases) {
    expect(shape(yaml.validate(c.source, ctx).findings), `${fx.id} — ${c.label}`).toEqual(
      shape(ts.validate(c.source, ctx).findings),
    );
  }
}

describe("body + leaf compiler — parity with the TS fixtures (sample)", () => {
  it("v01 — single required section", () => expectParity(v01, "01-single-required-section"));
  it("v05 — strict order + gap window", () => expectParity(v05, "05-strict-prefix-gap-tail"));
  it("v06 — alias sets via oneOf", () => expectParity(v06, "06-alias-sets-oneof"));
  it("v09 — maxWords + required anchor", () =>
    expectParity(v09, "09-section-content-leaf-maxwords-anchor"));
  it("v10 — table columns + minRows", () => expectParity(v10, "10-table-leaf-columns-minrows"));
  it("v11 — typed cells: enum / pattern", () => expectParity(v11, "11-typed-cells-enum-pattern"));
  it("v12 — list checkbox + minItems", () => expectParity(v12, "12-list-leaf-checkbox-minitems"));
  it("v14 — nested children subsections", () =>
    expectParity(v14, "14-nested-children-subsections"));
});

describe("body compiler — repeatable slot (T-1TA2, AC-4)", () => {
  const build = (node: Record<string, unknown>) =>
    compileContractObject({
      body: { order: "none", allowUnknown: true, sections: [node] },
    });
  const ctx = { path: "fixture.md" };

  it("repeatable: true compiles to a slot that admits repeated peers", () => {
    const c = build({ section: "Entry", repeatable: true });
    const src = ["## Entry", "", "a", "", "## Entry", "", "b", ""].join("\n");
    expect(c.validate(src, ctx).findings).toEqual([]);
  });

  it("min/max compile through and enforce structure/repeat-count", () => {
    const c = build({ section: "Entry", repeatable: true, min: 2, max: 3 });
    expect(c.validate("## Entry\n\na\n", ctx).findings.map((f) => f.id)).toEqual([
      "structure/repeat-count",
    ]);
  });

  it("repeatable must be a boolean (DeclarativeError)", () => {
    expect(() => build({ section: "Entry", repeatable: "true" })).toThrow(DeclarativeError);
  });

  it("min must be a number (DeclarativeError)", () => {
    expect(() => build({ section: "Entry", repeatable: true, min: "lots" })).toThrow(
      DeclarativeError,
    );
  });

  it("also compiles from a full YAML contract document", () => {
    const yaml = [
      "mcVersion: 1",
      "kind: contract",
      "body:",
      "  order: none",
      "  allowUnknown: true",
      "  sections:",
      "    - section: Entry",
      "      repeatable: true",
    ].join("\n");
    const c = loadContract(yaml);
    const src = ["## Entry", "", "a", "", "## Entry", "", "b", ""].join("\n");
    expect(c.validate(src, ctx).findings).toEqual([]);
  });
});
