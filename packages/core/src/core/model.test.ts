/**
 * Direct unit tests for the consumption object model (T-6PV4 / D-0005) — the edges the
 * fixture corpus (c01–c11) may not isolate: `unknown` partitioning (empty + non-empty),
 * absent-optional → `undefined`, the three dual-key access paths reaching one view, `byAnchor`
 * for a declared vs an undeclared anchor, nested `sections` recursion, `text("prose")` vs
 * `text("all")`, and the `TableView` surface (iteration / `column` / `find` / `rowPos`). These
 * build the model through the public `read()` door, so they exercise the same path consumers do.
 */
import { describe, expect, test } from "vitest";
import { z } from "zod";

import { contract, gap, list, optional, section, sections, table } from "../index.js";
import type { SectionGroup, SectionView, TableView } from "../index.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PATH = { path: "model.test.md" };

describe("unknown partitioning", () => {
  test("body.unknown is [] when every section is declared", () => {
    const c = contract({
      body: sections({ order: "none", allowUnknown: true }, [section("Alpha"), section("Beta")]),
    });
    const doc = c.read("## Alpha\n\na\n\n## Beta\n\nb\n", PATH);
    expect((doc.body as any).unknown).toEqual([]);
    expect((doc.body as any).alpha.name).toBe("Alpha");
  });

  test("a section matching no declared slot lands in unknown (document order), not a key", () => {
    const c = contract({
      body: sections({ order: "strict", allowUnknown: false }, [
        section("Title"),
        section("Status"),
        gap(),
      ]),
    });
    const doc = c.read("## Title\n\nt\n\n## Status\n\non track\n\n## Risks\n\nthin\n", PATH);
    const body = doc.body as any;
    expect(body.unknown.length).toBe(1);
    expect(body.unknown[0].name).toBe("Risks");
    expect(body.unknown[0].text()).toBe("thin");
    // An unknown section is NOT an enumerable dual-key key.
    expect(Object.keys(body)).not.toContain("Risks");
    expect(Object.keys(body)).not.toContain("risks");
    // …but `.section()` (the dynamic/edge accessor) still reaches it.
    expect(body.section("Risks")?.name).toBe("Risks");
  });

  test("unknown and section are non-enumerable; an empty group deep-equals {}", () => {
    const c = contract({ body: sections({}, [section("Solo")]) });
    const doc = c.read("## Solo\n\nx\n\n### Child\n\ny\n", PATH);
    // `Solo` declares no `children` grammar, so the H3 `Child` is undeclared at the nested level
    // and lands in unknown (non-enumerable) — the nested group still has no enumerable keys.
    const childGroup = (doc.body as any).solo.sections as SectionGroup;
    expect(childGroup).toEqual({});
    expect(Object.keys(childGroup)).toEqual([]);
    expect(typeof childGroup.section).toBe("function");
    expect(childGroup.unknown.map((s: SectionView) => s.name)).toEqual(["Child"]);
  });
});

describe("absence", () => {
  test("a declared optional section that is absent reads as undefined on every path", () => {
    const c = contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Present"),
        optional(section("Maybe")),
      ]),
    });
    const doc = c.read("## Present\n\nhere\n", PATH);
    const body = doc.body as any;
    expect(body.maybe).toBeUndefined();
    expect(body["Maybe"]).toBeUndefined();
    expect(body.section("Maybe")).toBeUndefined();
    expect(body.maybe?.text()).toBeUndefined();
  });
});

describe("dual-key — three paths, one view", () => {
  test("exact bracket, lowerCamelCase, and .section() reach the same SectionView", () => {
    const c = contract({
      body: sections({ order: "none", allowUnknown: true }, [section("Files to touch")]),
    });
    const doc = c.read("## Files to touch\n\nprose\n", PATH);
    const body = doc.body as any;
    const exact = body["Files to touch"];
    const camel = body.filesToTouch;
    const accessed = body.section("Files to touch");
    expect(exact).toBe(camel);
    expect(accessed).toBe(exact); // a non-promoted prose section: all three are the SectionView
    expect(exact.name).toBe("Files to touch");
  });

  test("a sole content:table() section promotes its key to the TableView; .section() stays the SectionView", () => {
    const c = contract({
      body: sections({}, [section("Files", { content: table({ columns: ["File", "Kind"] }) })]),
    });
    const doc = c.read("## Files\n\n| File | Kind |\n| - | - |\n| a.ts | add |\n", PATH);
    const body = doc.body as any;
    expect(body["Files"]).toBe(body.files); // bracket === dotted (the promoted TableView)
    expect(body.files.kind).toBe("table");
    expect(body.files.rowCount).toBe(1);
    expect(body.section("Files").name).toBe("Files"); // the underlying SectionView
  });
});

describe("byAnchor — declared vs undeclared", () => {
  const src = [
    "## Decision",
    "",
    "| # | Component |",
    "| - | --------- |",
    "| 1 | parser    |",
    "^components",
    "",
    "| Option | Note |",
    "| ------ | ---- |",
    "| A      | slow |",
    "^extra",
  ].join("\n");
  const build = () =>
    contract({
      body: sections({}, [
        section("Decision", {
          content: { components: table({ anchor: "components", columns: ["#", "Component"] }) },
        }),
      ]),
    });

  test("a declared anchor resolves to a kind-discriminated BlockView", () => {
    const doc = build().read(src, PATH);
    const b = (doc as any).byAnchor("components");
    expect(b?.kind).toBe("table");
    expect(b.columns).toEqual(["#", "Component"]);
  });

  test("an undeclared anchor still resolves dynamically (Record<string,string> table)", () => {
    const doc = build().read(src, PATH);
    const b = (doc as any).byAnchor("extra");
    expect(b?.kind).toBe("table");
    expect(b.rows[0].Option).toBe("A");
    // section-scoped byAnchor reaches the same block; a missing id is undefined.
    expect((doc.body as any).decision.byAnchor("extra")?.kind).toBe("table");
    expect((doc.body as any).decision.byAnchor("nope")).toBeUndefined();
    expect((doc as any).byAnchor("nope")).toBeUndefined();
  });

  test("named-table record fields surface each ^anchor-bound table on the SectionView", () => {
    const doc = build().read(src, PATH);
    expect((doc.body as any).decision.components.rowCount).toBe(1);
    expect((doc.body as any).decision.components.column("Component")).toEqual(["parser"]);
  });
});

describe("byAnchor — section-level anchor is NOT a block-level hit", () => {
  // A `^section-id` standing alone, with no preceding block, is a *section-level* anchor: it
  // lands on `node.anchors` (surfacing on `SectionView.anchors`) but binds to no block, so the
  // block-level `byAnchor` index does not reach it.
  const src = ["## Notes", "", "^section-id"].join("\n");
  const build = () => contract({ body: sections({}, [section("Notes")]) });

  test("the section id surfaces on SectionView.anchors but byAnchor returns undefined", () => {
    const doc = build().read(src, PATH);
    expect((doc.body as any).notes.anchors).toContain("section-id");
    expect((doc.body as any).notes.byAnchor("section-id")).toBeUndefined();
  });
});

describe("nested sections recursion", () => {
  test("SectionView.sections is the same dual-key shape, partitioned by the children grammar", () => {
    const c = contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Post-mortem", {
          children: sections({ order: "strict", allowUnknown: false }, [
            section("What worked"),
            section("What did not"),
          ]),
        }),
      ]),
    });
    const doc = c.read(
      "## Post-mortem\n\n### What worked\n\ngood\n\n### What did not\n\nbad\n",
      PATH,
    );
    const nested = (doc.body as any).postMortem.sections;
    expect(nested.whatWorked.text()).toBe("good");
    expect(nested["What did not"].text()).toBe("bad");
    expect(nested.section("What worked").name).toBe("What worked");
    expect(nested.unknown).toEqual([]);
    // one level deeper still empty-equals {}
    expect(nested.whatWorked.sections).toEqual({});
  });
});

describe("text() scope", () => {
  test("'prose' is own paragraphs (soft wraps collapsed); 'all' is the full subtree", () => {
    const c = contract({
      body: sections({}, [
        section("Intro", {
          children: sections({ order: "none", allowUnknown: true }, [section("Detail")]),
        }),
      ]),
    });
    const doc = c.read(
      "## Intro\n\nfirst line\nwrapped second line\n\n### Detail\n\ndeep prose\n",
      PATH,
    );
    const intro = (doc.body as any).intro;
    // soft wrap collapsed to a space; nested subsection prose excluded
    expect(intro.text()).toBe("first line wrapped second line");
    expect(intro.text("prose")).toBe("first line wrapped second line");
    // "all" pulls the nested subsection prose into the flattened subtree
    expect(intro.text("all")).toContain("deep prose");
    expect(intro.text("all")).toContain("first line wrapped second line");
  });
});

describe("anchors aggregation", () => {
  test("SectionView.anchors gathers section-level + block-bound ^block-ids", () => {
    const c = contract({ body: sections({}, [section("Summary")]) });
    const doc = c.read("## Summary\n\nthe blurb\n^summary\n", PATH);
    // `^summary` binds to the paragraph block in the projection, but it is still the section's id.
    expect((doc.body as any).summary.anchors).toEqual(["summary"]);
  });
});

describe("TableView surface", () => {
  const c = contract({
    body: sections({}, [
      section("Files", {
        content: table({
          columns: ["File", "Kind"],
          cells: { Kind: z.enum(["add", "modify", "delete"]) },
        }),
      }),
    ]),
  });
  const src = [
    "## Files",
    "",
    "| File       | Kind   |",
    "| ---------- | ------ |",
    "| grammar.ts | add    |",
    "| legacy.ts  | delete |",
  ].join("\n");

  test("iteration yields each row keyed by column name", () => {
    const doc = c.read(src, PATH);
    const files = (doc.body as any).files as TableView;
    const seen: string[] = [];
    for (const row of files) seen.push((row as any).File);
    expect(seen).toEqual(["grammar.ts", "legacy.ts"]);
  });

  test("column / find / rowPos / rowCount / columns / pos", () => {
    const doc = c.read(src, PATH);
    const files = (doc.body as any).files as TableView;
    expect(files.rowCount).toBe(2);
    expect(files.columns).toEqual(["File", "Kind"]);
    expect(files.column("Kind" as any)).toEqual(["add", "delete"]);
    expect((files.find((r: any) => r.Kind === "delete") as any)?.File).toBe("legacy.ts");
    expect(files.find((_r: any, i: number) => i === 0)).toBeDefined();
    // header line 3, separator 4, row 0 line 5, row 1 line 6
    expect(files.rowPos(0)).toEqual({ line: 5, col: 1 });
    expect(files.rowPos(1)).toEqual({ line: 6, col: 1 });
  });
});

describe("frontmatter and the doc shape", () => {
  test("doc = { frontmatter, body, byAnchor }; frontmatter is the parsed YAML", () => {
    const c = contract({
      frontmatter: z.object({ id: z.string() }).strict(),
      body: sections({ order: "none", allowUnknown: true }, [section("Body")]),
    });
    const doc = c.read("---\nid: X-1\n---\n\n## Body\n\nx\n", PATH);
    expect((doc.frontmatter as any).id).toBe("X-1");
    expect(typeof (doc as any).byAnchor).toBe("function");
    expect((doc.body as any).body.name).toBe("Body");
  });

  test("a list leaf surfaces as a ListView on SectionView.lists", () => {
    const c = contract({
      body: sections({}, [
        section("Checks", { content: list({ everyItem: "checkbox", minItems: 1 }) }),
      ]),
    });
    const doc = c.read("## Checks\n\n- [ ] one\n- [x] two\n", PATH);
    const lists = (doc.body as any).checks.lists;
    expect(lists.length).toBe(1);
    expect(lists[0].items.length).toBe(2);
    expect(lists[0].kind).toBe("list");
  });
});

describe("AC-1 — the model is additive; reading doc never changes findings", () => {
  test("findings are identical whether or not doc is accessed", () => {
    const c = contract({
      frontmatter: z.object({ id: z.string() }).strict(),
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Files", { content: table({ columns: ["File", "Kind"] }) }),
        optional(section("Notes")),
      ]),
    });
    const src = "---\nid: A-1\n---\n\n## Files\n\n| File | Kind |\n| - | - |\n| a.ts | add |\n";

    const a = c.validate(src, PATH);
    const findingsWithoutDoc = JSON.stringify(a.findings);

    const b = c.validate(src, PATH);
    void b.doc; // force the lazy model build
    void (b.doc as any)?.body; // and a navigation through it
    const findingsAfterDoc = JSON.stringify(b.findings);

    expect(findingsAfterDoc).toBe(findingsWithoutDoc);
  });
});
