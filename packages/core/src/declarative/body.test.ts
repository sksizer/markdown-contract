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

// NOTE: the fixture `.contract.yaml` twins migrated to mcVersion 2 (D-0020), so this parity
// sample now drives the v2 compilers; the v1 dialect keeps its own direct coverage below
// (it stays supported until the v1 retirement PR).
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

// Direct v1-dialect coverage (D-0008). The fixture corpus twins now compile through the v2
// vocabulary, so the v1 body/leaf spellings — `allowUnknown`, `optional`, `children`,
// `everyItem`, and the leaf configs — are exercised here against the compiler they target.
describe("body compiler — the v1 dialect, given this input you get exactly this", () => {
  const ctx = { path: "fixture.md" };
  const compile = (body: Record<string, unknown>) => compileContractObject({ body });
  const ids = (c: ReturnType<typeof compile>, src: string): string[] =>
    c.validate(src, ctx).findings.map((f) => f.id);

  it("order: strict + a gap window + an optional tail — the v05 shape, hand-built", () => {
    const c = compile({
      order: "strict",
      allowUnknown: false,
      sections: [
        { section: "Title" },
        { section: "Overview" },
        { gap: {} },
        { section: "Appendix", optional: true },
      ],
    });
    const pass = "## Title\n\nt\n\n## Overview\n\no\n\n## Risks\n\nr\n\n## Appendix\n\na\n";
    expect(ids(c, pass)).toEqual([]);
  });

  it("gap bounds ({ min, max }) compile and enforce structure/gap-count", () => {
    const c = compile({
      order: "strict",
      allowUnknown: false,
      sections: [{ section: "A" }, { gap: { min: 1, max: 1 } }, { section: "B" }],
    });
    expect(ids(c, "## A\n\nx\n\n## X\n\nx\n\n## B\n\nx\n")).toEqual([]);
    expect(ids(c, "## A\n\nx\n\n## B\n\nx\n")).toEqual(["structure/gap-count"]);
  });

  it("oneOf admits any listed spelling; aliases admit alternate spellings of one slot", () => {
    const c = compile({
      order: "none",
      allowUnknown: true,
      sections: [
        { oneOf: ["Goal", "Goal / Problem statement"] },
        { section: "Summary", aliases: ["TL;DR"], optional: true },
      ],
    });
    expect(ids(c, "## Goal / Problem statement\n\ng\n\n## TL;DR\n\ns\n")).toEqual([]);
    expect(ids(c, "## Goal\n\ng\n")).toEqual([]);
  });

  it("anchor requires the section's ^block-id (structure/anchor-missing when absent)", () => {
    const c = compile({
      order: "none",
      allowUnknown: false,
      sections: [{ section: "Summary", anchor: "summary", content: { maxWords: 120 } }],
    });
    expect(ids(c, "## Summary\n\nShort enough.\n^summary\n")).toEqual([]);
    expect(ids(c, "## Summary\n\nShort enough.\n")).toEqual(["structure/anchor-missing"]);
  });

  it("children recurse into a nested level with its own order/allowUnknown", () => {
    const c = compile({
      order: "none",
      allowUnknown: true,
      sections: [
        {
          section: "Decision",
          children: {
            order: "strict",
            allowUnknown: false,
            sections: [{ section: "Components" }, { section: "Resolution" }],
          },
        },
      ],
    });
    expect(ids(c, "## Decision\n\n### Components\n\nc\n\n### Resolution\n\nr\n")).toEqual([]);
    // Missing the first strict child both misses the slot and breaks the strict order.
    expect(ids(c, "## Decision\n\n### Resolution\n\nr\n")).toEqual([
      "structure/section-missing",
      "structure/section-order",
    ]);
  });

  it("content leaves: code lang, table (minRows/cells/extraColumns), list (everyItem schema)", () => {
    const c = compile({
      order: "none",
      allowUnknown: false,
      sections: [
        { section: "Snippet", content: { code: { lang: "ts" } } },
        {
          section: "Ports",
          content: {
            table: {
              columns: ["Name", "Port"],
              minRows: 1,
              extraColumns: "ignore",
              cells: { Port: { type: "string", pattern: "^\\d+$" } },
            },
          },
        },
        {
          section: "Steps",
          content: { list: { ordered: false, minItems: 2, everyItem: { type: "string" } } },
        },
      ],
    });
    const pass = [
      "## Snippet",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "## Ports",
      "",
      "| Name | Port | Notes |",
      "| ---- | ---- | ----- |",
      "| api  | 8080 | main  |",
      "",
      "## Steps",
      "",
      "- first",
      "- second",
      "",
    ].join("\n");
    expect(ids(c, pass)).toEqual([]);
  });

  it("a named-leaf record binds multiple anchored tables in one section", () => {
    const c = compile({
      order: "none",
      allowUnknown: false,
      sections: [
        {
          section: "Decision",
          content: {
            components: { table: { columns: ["Component"], anchor: "components" } },
            risks: { table: { columns: ["Risk"], anchor: "risks" } },
          },
        },
      ],
    });
    const pass = [
      "## Decision",
      "",
      "| Component |",
      "| --------- |",
      "| grammar   |",
      "^components",
      "",
      "| Risk |",
      "| ---- |",
      "| none |",
      "^risks",
      "",
    ].join("\n");
    expect(ids(c, pass)).toEqual([]);
  });

  it("list everyItem: checkbox and bare code/maxWords leaves compile", () => {
    const c = compile({
      order: "none",
      allowUnknown: false,
      sections: [
        { section: "ACs", content: { list: { everyItem: "checkbox", minItems: 1 } } },
        { section: "Notes", content: { maxWords: 5 } },
        { section: "Dump", content: { code: {} } },
      ],
    });
    const pass = [
      "## ACs",
      "",
      "- [ ] one",
      "",
      "## Notes",
      "",
      "Short.",
      "",
      "## Dump",
      "",
      "```",
      "raw",
      "```",
      "",
    ].join("\n");
    expect(ids(c, pass)).toEqual([]);
  });

  it("rejects malformed bodies with a DeclarativeError naming the path", () => {
    expect(() => compile({ order: "alphabetical", sections: [] })).toThrow(DeclarativeError);
    expect(() => compile({ allowUnknown: "yes", sections: [] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: "not-a-list" })).toThrow(DeclarativeError);
    expect(() => compile({ sections: ["not-a-map"] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ note: "no selector" }] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ oneOf: [] }] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ section: 7 }] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ section: "S", aliases: [1] }] })).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ section: "S", content: "words" }] })).toThrow(
      DeclarativeError,
    );
    expect(() => compile({ sections: [{ section: "S", content: { maxWords: "many" } }] })).toThrow(
      DeclarativeError,
    );
    expect(() => compile({ sections: [{ section: "S", content: { table: [] } }] })).toThrow(
      DeclarativeError,
    );
    expect(() =>
      compile({ sections: [{ section: "S", content: { table: { columns: [1] } } }] }),
    ).toThrow(DeclarativeError);
    expect(() =>
      compile({ sections: [{ section: "S", content: { table: { columns: ["A"], cells: 4 } } }] }),
    ).toThrow(DeclarativeError);
    expect(() => compile({ sections: [{ section: "S", content: { list: true } }] })).toThrow(
      DeclarativeError,
    );
  });
});
