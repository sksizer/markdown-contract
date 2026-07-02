/**
 * Projection fixtures (T-2HF6) — `parse()` tested DIRECTLY.
 *
 * These exercise the layer-1 projection in isolation (no contract / `validate()`), the
 * thing the validate-harness fixtures (still stubbed) cannot reach yet. Coverage:
 *   - section nesting + names + positions (01 / 01a shapes); H1-as-title; H2 top-level;
 *   - every block kind (table column/row/cell flattening + rowPos; list task `checked`;
 *     code verbatim; paragraph text);
 *   - frontmatter `data` + `lineForPath` (top-level + nested + array index);
 *   - `^block-id` anchor binding (block-level and section-level);
 *   - the three invariants: D2 fence opacity, D3 depth-jump attach + preserved depth,
 *     D4 no hoisting;
 *   - `tree.mdast` is the retained raw tree;
 *   - a parse → stringify → re-parse round-trip preserving the dialect constructs
 *     (the D-0002 round-trip proof).
 *
 * It also reads a real provenance document (`docs/planning/capabilities/C-0004…md`) to
 * prove the projection holds on a genuine entity file, not just inline snippets.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { describe, expect, test } from "vitest";
import type { BlockNode } from "../index.js";
import { parse } from "../index.js";
import { extractVaultRefs } from "./dialect/index.js";

/** Narrow a BlockNode to a specific kind for typed assertions. */
function blockOf<K extends BlockNode["kind"]>(
  block: BlockNode | undefined,
  kind: K,
): Extract<BlockNode, { kind: K }> {
  expect(block?.kind).toBe(kind);
  return block as Extract<BlockNode, { kind: K }>;
}

// ── Section nesting, names, positions ────────────────────────────────────────────

describe("section nesting (flat headings → tree)", () => {
  test("01 shape: a single ## Overview → root.sections=[Overview] at line 1", () => {
    const t = parse(["## Overview", "", "Rollout prose.", ""].join("\n"));
    expect(t.root.sections.map((s) => s.name)).toEqual(["Overview"]);
    const overview = t.root.sections[0]!;
    expect(overview.depth).toBe(2);
    expect(overview.pos.line).toBe(1);
    expect(overview.pos.col).toBe(1);
  });

  test("01a shape: leading # H1 is the title; ## is the top-level body section", () => {
    const t = parse(["# Widget notes", "", "## Background", "", "Loose notes."].join("\n"));
    expect(t.root.name).toBe("Widget notes"); // H1 captured as document title
    expect(t.root.sections.map((s) => ({ name: s.name, line: s.pos.line }))).toEqual([
      { name: "Background", line: 3 },
    ]);
  });

  test("H3/H4 nest under their parent H2 by heading depth", () => {
    const t = parse(
      ["## Decision", "", "### Components", "", "prose", "", "### Resolution", "", "more"].join(
        "\n",
      ),
    );
    const decision = t.root.sections[0]!;
    expect(decision.name).toBe("Decision");
    expect(decision.sections.map((s) => s.name)).toEqual(["Components", "Resolution"]);
    expect(decision.sections.every((s) => s.depth === 3)).toBe(true);
  });

  test("heading name is the exact trimmed text", () => {
    const t = parse("##   Files to touch   \n\nx\n");
    expect(t.root.sections[0]!.name).toBe("Files to touch");
  });
});

// ── Block kinds ──────────────────────────────────────────────────────────────────

describe("block kinds", () => {
  test("table: columns + rows flattened (inlineCode/text → value), rowPos per body row", () => {
    const t = parse(
      [
        "## Files",
        "",
        "| Location          | Kind   |",
        "| ----------------- | ------ |",
        "| `src/a.ts`        | modify |",
        "| `src/b.ts`        | add    |",
      ].join("\n"),
    );
    const table = blockOf(t.root.sections[0]!.blocks[0], "table");
    expect(table.columns).toEqual(["Location", "Kind"]);
    expect(table.rows).toEqual([
      ["src/a.ts", "modify"], // inlineCode cell flattened to its value (no backticks)
      ["src/b.ts", "add"],
    ]);
    expect(table.rowPos(0).line).toBe(5);
    expect(table.rowPos(1).line).toBe(6);
    expect(table.pos.line).toBe(3);
  });

  test("list: ordered flag + task-list checked", () => {
    const t = parse(["## A", "", "- [ ] todo", "- [x] done", "- plain"].join("\n"));
    const list = blockOf(t.root.sections[0]!.blocks[0], "list");
    expect(list.ordered).toBe(false);
    expect(list.items.map((i) => ({ text: i.text, checked: i.checked }))).toEqual([
      { text: "todo", checked: false },
      { text: "done", checked: true },
      { text: "plain", checked: undefined }, // plain item carries no `checked`
    ]);
    expect(list.items[0]!.pos.line).toBe(3);
  });

  test("list: ordered list reports ordered:true", () => {
    const t = parse(["## A", "", "1. one", "2. two"].join("\n"));
    const list = blockOf(t.root.sections[0]!.blocks[0], "list");
    expect(list.ordered).toBe(true);
    expect(list.items.map((i) => i.text)).toEqual(["one", "two"]);
  });

  test("code: lang + verbatim value (null lang for an unlabelled fence)", () => {
    const t = parse(["## A", "", "```ts", "const x = 1;", "```"].join("\n"));
    const code = blockOf(t.root.sections[0]!.blocks[0], "code");
    expect(code.lang).toBe("ts");
    expect(code.value).toBe("const x = 1;");

    const t2 = parse(["## A", "", "```", "raw", "```"].join("\n"));
    expect(blockOf(t2.root.sections[0]!.blocks[0], "code").lang).toBeNull();
  });

  test("paragraph: flattened inline text", () => {
    const t = parse(["## A", "", "Some **bold** and `code` text."].join("\n"));
    const para = blockOf(t.root.sections[0]!.blocks[0], "paragraph");
    expect(para.text).toBe("Some bold and code text.");
  });
});

// ── Frontmatter ──────────────────────────────────────────────────────────────────

describe("frontmatter", () => {
  const src = [
    "---",
    "id: D-0014",
    "status: open/proposed",
    "related:",
    "  - one",
    "  - two",
    "nested:",
    "  a: 1",
    "  b: 2",
    "---",
    "",
    "## Body",
  ].join("\n");

  test("data is parsed; raw is verbatim; pos is the opening ---", () => {
    const t = parse(src);
    expect(t.frontmatter).not.toBeNull();
    expect(t.frontmatter!.data).toEqual({
      id: "D-0014",
      status: "open/proposed",
      related: ["one", "two"],
      nested: { a: 1, b: 2 },
    });
    expect(t.frontmatter!.raw).toContain("id: D-0014");
    expect(t.frontmatter!.pos.line).toBe(1);
  });

  test("lineForPath maps top-level keys, nested keys, and array indices to source lines", () => {
    const t = parse(src);
    const lf = t.frontmatter!.lineForPath.bind(t.frontmatter!);
    expect(lf(["id"])).toBe(2);
    expect(lf(["status"])).toBe(3);
    expect(lf(["related"])).toBe(4);
    expect(lf(["related", 1])).toBe(6); // the second array element ("two")
    expect(lf(["nested"])).toBe(7);
    expect(lf(["nested", "b"])).toBe(9);
    expect(lf(["does-not-exist"])).toBeUndefined();
  });

  test("frontmatter is null when absent", () => {
    expect(parse("## Just a body\n").frontmatter).toBeNull();
  });
});

// ── ^block-id anchors (the addressing primitive — must work) ──────────────────────

describe("^block-id anchors", () => {
  test("trailing anchor on a paragraph binds to that block (text stripped)", () => {
    const t = parse(["## Summary", "", "Some prose here.", "^summary"].join("\n"));
    const para = blockOf(t.root.sections[0]!.blocks[0], "paragraph");
    expect(para.text).toBe("Some prose here."); // anchor token removed from text
    expect(para.anchor).toBe("summary");
  });

  test("standalone anchor after a code block binds to the preceding block", () => {
    const t = parse(["## A", "", "```", "hi", "```", "", "^code-id"].join("\n"));
    const code = blockOf(t.root.sections[0]!.blocks[0], "code");
    expect(code.anchor).toBe("code-id");
    expect(t.root.sections[0]!.blocks).toHaveLength(1); // the anchor para is not a block
  });

  test("anchor row absorbed under a table becomes the table anchor (not a data row)", () => {
    const t = parse(
      ["## D", "", "| # | C |", "| - | - |", "| 1 | x |", "| 2 | y |", "^components"].join("\n"),
    );
    const table = blockOf(t.root.sections[0]!.blocks[0], "table");
    expect(table.anchor).toBe("components");
    expect(table.rows).toEqual([
      ["1", "x"],
      ["2", "y"],
    ]); // the ^components row is NOT a data row
  });

  test("section-level anchor (no preceding block) lands on SectionNode.anchors", () => {
    const t = parse(["## Notes", "", "^section-id"].join("\n"));
    expect(t.root.sections[0]!.anchors).toEqual(["section-id"]);
    expect(t.root.sections[0]!.blocks).toHaveLength(0);
  });
});

// ── Invariants ───────────────────────────────────────────────────────────────────

describe("invariant D2 — fenced code is opaque", () => {
  test("a ## line inside a fence does not become a section", () => {
    const t = parse(
      [
        "## Capability",
        "",
        "## Sample document",
        "",
        "```md",
        "## Decision",
        "",
        "We will adopt the projection.",
        "```",
      ].join("\n"),
    );
    // Only the two real H2s — the in-fence "## Decision" is opaque code.
    expect(t.root.sections.map((s) => s.name)).toEqual(["Capability", "Sample document"]);
    const code = blockOf(t.root.sections[1]!.blocks[0], "code");
    expect(code.value).toContain("## Decision"); // verbatim inside the fence value
  });

  test("a pipe / ^id line inside a fence is verbatim, not a table / anchor", () => {
    const t = parse(["## A", "", "```", "| a | b |", "^notanchor", "```"].join("\n"));
    const code = blockOf(t.root.sections[0]!.blocks[0], "code");
    expect(code.value).toBe("| a | b |\n^notanchor");
    expect(code.anchor).toBeUndefined();
  });
});

describe("invariant D3 — no depth-jump synthesis", () => {
  test("H2 then H4 attaches the H4 directly under the H2, preserving depth: 4", () => {
    const t = parse(["## Decision", "", "prose", "", "#### Components", "", "more"].join("\n"));
    const decision = t.root.sections[0]!;
    expect(decision.depth).toBe(2);
    // The H4 is a DIRECT child of the H2 — no synthesized intermediate H3.
    expect(decision.sections).toHaveLength(1);
    const components = decision.sections[0]!;
    expect(components.name).toBe("Components");
    expect(components.depth).toBe(4); // TRUE depth preserved → jump re-derivable downstream
    expect(components.pos.line).toBe(5);
  });

  test("no finding is emitted by the projection itself (findings are a later plane)", () => {
    // The projection returns a DocTree only — there is no findings channel here.
    const t = parse(["## A", "", "#### Deep"].join("\n"));
    expect(t).not.toHaveProperty("findings");
    expect(t.root.sections[0]!.sections[0]!.depth).toBe(4);
  });
});

describe("invariant D4 — no hoisting", () => {
  test("a table inside a blockquote is NOT a section-level table block", () => {
    const t = parse(
      [
        "## Deliverables",
        "",
        "> | Item   | Status |",
        "> | ------ | ------ |",
        "> | Engine | done   |",
      ].join("\n"),
    );
    // The quoted table is nested in a blockquote → not hoisted to section.blocks.
    expect(t.root.sections[0]!.blocks.filter((b) => b.kind === "table")).toHaveLength(0);
  });

  test("a table inside a list item is NOT a section-level table block", () => {
    const t = parse(
      ["## D", "", "- intro", "", "  | a | b |", "  | - | - |", "  | 1 | 2 |"].join("\n"),
    );
    expect(t.root.sections[0]!.blocks.filter((b) => b.kind === "table")).toHaveLength(0);
    // The list itself is heading-direct, so it IS a section block.
    expect(t.root.sections[0]!.blocks.filter((b) => b.kind === "list")).toHaveLength(1);
  });
});

// ── tree.mdast retained ──────────────────────────────────────────────────────────

describe("tree.mdast (F1)", () => {
  test("the raw layer-0 Root is retained and exposed", () => {
    const t = parse("## A\n\nprose\n");
    expect(t.mdast.type).toBe("root");
    expect(Array.isArray(t.mdast.children)).toBe(true);
    expect(t.mdast.children.some((c) => c.type === "heading")).toBe(true);
  });
});

// ── Dialect round-trip proof (D-0002) ────────────────────────────────────────────

describe("dialect round-trip (D-0002 proof)", () => {
  const stringify = (md: string): string => {
    const proc = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkStringify);
    return String(proc.stringify(proc.parse(md)));
  };

  test("^anchor, [[wikilink]] and ![[transclusion]] survive parse → stringify → re-parse", () => {
    const src = [
      "## Summary",
      "",
      "Prose with [[WikiTarget|alias]] and ![[Embed#^blk]] inline.",
      "^summary",
    ].join("\n");

    // Recognized in the original.
    const before = extractVaultRefs(src);
    expect(before.map((r) => r.kind)).toEqual(["wikilink", "transclusion"]);
    expect(before[0]!.target).toBe("WikiTarget");
    expect(before[1]!.target).toBe("Embed");

    // Round-trip through remark-stringify, then re-parse.
    const roundTripped = stringify(src);
    const t = parse(roundTripped);

    // The ^summary anchor still binds to its block after the cycle.
    const para = blockOf(t.root.sections[0]!.blocks[0], "paragraph");
    expect(para.anchor).toBe("summary");

    // The vault-reference constructs still recognize (tolerant of remark-stringify escaping).
    const after = extractVaultRefs(roundTripped);
    expect(after.map((r) => r.kind)).toEqual(["wikilink", "transclusion"]);
    expect(after[0]!.target).toBe("WikiTarget");
    expect(after[1]!.target).toBe("Embed");
  });
});

// ── A real provenance document ───────────────────────────────────────────────────

describe("real document (provenance entity file)", () => {
  test("the C-0004 capability doc projects: H1 title, H2 sections, frontmatter, ^summary", () => {
    // docs/planning lives at the workspace root, not inside packages/core, so
    // this real-document fixture climbs out of the package (src/core → package
    // root → packages/ → workspace root). See T-WKSP post-mortem: a follow-up may
    // vendor this doc as a package-local fixture to restore package isolation.
    const path = fileURLToPath(
      new URL(
        "../../../../docs/planning/capabilities/C-0004-dialect-aware-projection.md",
        import.meta.url,
      ),
    );
    const t = parse(readFileSync(path, "utf8"));

    // Frontmatter parses with the entity's stamp keys.
    expect(t.frontmatter).not.toBeNull();
    const fm = t.frontmatter!.data as Record<string, unknown>;
    expect(fm.id).toBe("C-0004");
    expect(fm.type).toBe("capability");
    expect(t.frontmatter!.lineForPath(["id"])).toBeGreaterThan(0);

    // The `# Dialect-aware projection` H1 is the document title.
    expect(t.root.name).toBe("Dialect-aware projection");

    // The H2 body sections include Summary / Statement (top-level).
    const names = t.root.sections.map((s) => s.name);
    expect(names).toContain("Summary");
    expect(names).toContain("Statement");
    expect(t.root.sections.every((s) => s.depth === 2)).toBe(true);

    // The `^summary` anchor inside ## Summary binds (block- or section-level).
    const summary = t.root.sections.find((s) => s.name === "Summary")!;
    const anchorBound =
      summary.anchors.includes("summary") || summary.blocks.some((b) => b.anchor === "summary");
    expect(anchorBound).toBe(true);
  });
});
