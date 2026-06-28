/**
 * Peer test for the text-constraint builders.
 *
 * STUB CONTRACT (T-TXSC): `requires` / `forbids` return a node-local `Rule` and `textRule`
 * returns a cross-plane `DocRule`, each well-formed and branded but emitting NO findings yet —
 * so the gated `text-api` fixtures type-check and run green-by-skip until T-TXAP lands the real
 * matcher. These cases pin that no-op contract; T-TXAP replaces them with the real pass/fail
 * matcher behaviour when it flips `IMPLEMENTED["text-api"]`.
 */
import { describe, expect, it } from "vitest";

import { forbids, requires, textRule } from "./text-constraints.js";
import type { Ctx, SectionNode } from "./types.js";

const node: SectionNode = {
  name: "Summary",
  depth: 2,
  pos: { line: 1 },
  sections: [],
  blocks: [],
  anchors: [],
};

const ctx: Ctx = {
  path: "fixture.md",
  finding: (f) => ({ id: f.id, level: f.level ?? "error", path: "fixture.md", message: f.message }),
};

describe("requires (stub)", () => {
  it("returns a branded node-local Rule", () => {
    const r = requires([{ pattern: "outcome" }]);
    expect(r.__brand).toBe("Rule");
    expect(r.id).toBe("text/requires");
  });

  it("emits no findings — the matcher lands in T-TXAP", () => {
    expect(requires([{ pattern: "outcome" }]).run(node, ctx)).toEqual([]);
  });
});

describe("forbids (stub)", () => {
  it("returns a branded node-local Rule", () => {
    const r = forbids([{ pattern: "TODO", normalize: false }]);
    expect(r.__brand).toBe("Rule");
    expect(r.id).toBe("text/forbids");
  });

  it("emits no findings — the matcher lands in T-TXAP", () => {
    expect(forbids([{ pattern: "TODO" }]).run(node, ctx)).toEqual([]);
  });
});

describe("textRule (stub)", () => {
  it("returns a branded cross-plane DocRule", () => {
    const r = textRule({ requires: [{ pattern: "DONE pr=" }], forbids: [{ pattern: "}scripts/" }] });
    expect(r.__brand).toBe("DocRule");
    expect(r.id).toBe("text/doc");
  });

  it("emits no findings — the matcher lands in T-TXAP", () => {
    const doc = { frontmatter: {}, body: {}, byAnchor: () => undefined };
    expect(textRule({ forbids: [{ pattern: "}scripts/" }] }).run(doc, ctx)).toEqual([]);
  });
});
