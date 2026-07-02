/**
 * Unit tests for the content plane (T-5LW7) — the leaf data-shape checks and the
 * frontmatter Zod pass, exercising the cases the fixture corpus does not pin directly:
 * the `extraColumns: "ignore"` no-op, the `everyItem: ZodType` form, the AC-4 deferral to
 * the structure plane (wrong-kind / absent block), the row-line remap on a cell finding,
 * and the frontmatter `lineForPath` remap for enum / unknown-key / required / type.
 */
import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { Finding } from "../index.js";
import { code, contract, list, maxWords, section, sections, table } from "../index.js";

const CTX = { path: "fixture.md" };

/** Validate `source` against `c`, returning the findings (deterministically sorted). */
function find(c: ReturnType<typeof contract>, source: string): Finding[] {
  return c.validate(source, CTX).findings;
}

/** The (id, line) pairs of the findings, for compact assertions. */
function shape(findings: Finding[]): { id: string; line: number | undefined }[] {
  return findings.map((f) => ({ id: f.id, line: f.pos?.line }));
}

// ── Table ──────────────────────────────────────────────────────────────────────

describe("table leaf", () => {
  const filesTable = (extra?: "ignore" | "error") =>
    contract({
      body: sections({}, [
        section("Files", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            minRows: 1,
            ...(extra ? { extraColumns: extra } : {}),
          }),
        }),
      ]),
    });

  test("column-missing — one finding per declared column absent", () => {
    const src = ["## Files", "", "| Location |", "| -------- |", "| a.ts     |"].join("\n");
    expect(shape(find(filesTable(), src))).toEqual([
      { id: "content/table/column-missing", line: 3 },
      { id: "content/table/column-missing", line: 3 },
    ]);
  });

  test("min-rows — header-only table fires the row floor", () => {
    const src = ["## Files", "", "| Location | Kind | Change |", "| - | - | - |"].join("\n");
    expect(shape(find(filesTable(), src))).toEqual([{ id: "content/table/min-rows", line: 3 }]);
  });

  test("extraColumns: error — one column-extra per undeclared column", () => {
    const src = [
      "## Files",
      "",
      "| Location | Kind | Change | Owner |",
      "| - | - | - | - |",
      "| a.ts | add | new | alice |",
    ].join("\n");
    expect(shape(find(filesTable("error"), src))).toEqual([
      { id: "content/table/column-extra", line: 3 },
    ]);
  });

  test("extraColumns: ignore (and default) — an undeclared column is silent", () => {
    const src = [
      "## Files",
      "",
      "| Location | Kind | Change | Owner |",
      "| - | - | - | - |",
      "| a.ts | add | new | alice |",
    ].join("\n");
    expect(find(filesTable("ignore"), src)).toEqual([]);
    expect(find(filesTable(), src)).toEqual([]); // default is ignore
  });

  test("typed cell enum — the finding localizes to the offending row via rowPos(i)", () => {
    const c = contract({
      body: sections({}, [
        section("Files", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            cells: { Kind: z.enum(["add", "modify", "delete"]) },
          }),
        }),
      ]),
    });
    const src = [
      "## Files", // 1
      "", // 2
      "| Location | Kind   | Change |", // 3 header
      "| -------- | ------ | ------ |", // 4 delimiter
      "| a.ts     | add    | new    |", // 5 row 0
      "| b.ts     | rename | edit   |", // 6 row 1 — bad
      "| c.ts     | delete | gone   |", // 7 row 2
    ].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "content/table/cell", line: 6 }]);
  });

  test("AC-4 — a wrong-kind block defers to the structure plane (no content finding)", () => {
    const c = filesTable();
    // A list where a table is declared: structure emits block-kind; content stays silent.
    const src = ["## Files", "", "- not a table"].join("\n");
    const ids = find(c, src).map((f) => f.id);
    expect(ids).toContain("structure/block-kind");
    expect(ids.some((id) => id.startsWith("content/"))).toBe(false);
  });
});

// ── List ────────────────────────────────────────────────────────────────────────

describe("list leaf", () => {
  test("everyItem: checkbox — item-kind per non-checkbox item, at its line", () => {
    const c = contract({
      body: sections({}, [
        section("Acceptance criteria", { content: list({ everyItem: "checkbox", minItems: 1 }) }),
      ]),
    });
    const src = [
      "## Acceptance criteria", // 1
      "", // 2
      "- [ ] one", // 3 checkbox
      "- bare", // 4 not a checkbox
      "- [x] three", // 5 checkbox
    ].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "content/list/item-kind", line: 4 }]);
  });

  test("everyItem: ZodType — runs over each item's text", () => {
    const c = contract({
      body: sections({}, [
        section("Tags", { content: list({ everyItem: z.string().regex(/^#/) }) }),
      ]),
    });
    const src = ["## Tags", "", "- #alpha", "- beta", "- #gamma"].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "content/list/item-kind", line: 4 }]);
  });

  test("min-items — the count floor fires below the bound", () => {
    const c = contract({
      body: sections({}, [
        section("Acceptance criteria", { content: list({ everyItem: "checkbox", minItems: 2 }) }),
      ]),
    });
    const src = ["## Acceptance criteria", "", "- [ ] only one"].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "content/list/min-items", line: 3 }]);
  });
});

// ── Code ───────────────────────────────────────────────────────────────────────

describe("code leaf", () => {
  const example = contract({
    body: sections({}, [section("Example", { content: code({ lang: "ts" }) })]),
  });

  test("lang mismatch — content/code/lang at the fence", () => {
    const src = ["## Example", "", "```js", "const x = 1;", "```"].join("\n");
    expect(shape(find(example, src))).toEqual([{ id: "content/code/lang", line: 3 }]);
  });

  test("lang match — no finding", () => {
    const src = ["## Example", "", "```ts", "const x = 1;", "```"].join("\n");
    expect(find(example, src)).toEqual([]);
  });
});

// ── Paragraph (maxWords) ──────────────────────────────────────────────────────────

describe("maxWords leaf", () => {
  const brief = contract({
    body: sections({ order: "none", allowUnknown: true }, [
      section("Summary", { content: maxWords(5) }),
    ]),
  });

  test("over budget — content/max-words", () => {
    const src = ["## Summary", "", "one two three four five six"].join("\n");
    expect(shape(find(brief, src))).toEqual([{ id: "content/max-words", line: 3 }]);
  });

  test("under budget — no finding", () => {
    const src = ["## Summary", "", "one two three"].join("\n");
    expect(find(brief, src)).toEqual([]);
  });
});

// ── Frontmatter (Zod over the YAML, lineForPath remap) ────────────────────────────

describe("frontmatter plane", () => {
  const schema = z.strictObject({
    id: z.string(),
    status: z.enum(["open", "closed"]),
    title: z.string().min(1),
  });
  const c = contract({ frontmatter: schema });

  test("enum mismatch — frontmatter/enum at the offending key's line", () => {
    const src = [
      "---", // 1
      "id: D-1", // 2
      "status: draft", // 3 — bad enum
      "title: t", // 4
      "---", // 5
      "",
      "# t",
    ].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "frontmatter/enum", line: 3 }]);
  });

  // ── Messages name the field (the documentary cases) ───────────────────────────
  // Every frontmatter message leads with the offending key, so a report says what to fix.

  test("missing required key — message names the field, not 'received undefined'", () => {
    const src = ["---", "status: open", "title: t", "---"].join("\n"); // id absent
    const f = find(c, src).find((x) => x.id === "frontmatter/required");
    expect(f?.message).toBe("frontmatter field ‘id’ is required");
  });

  test("const/literal mismatch — message names the field and its required value", () => {
    const lit = contract({ frontmatter: z.strictObject({ type: z.literal("capability") }) });
    const src = ["---", "type: feature", "---"].join("\n");
    const f = find(lit, src).find((x) => x.id === "frontmatter/enum");
    expect(f?.message).toBe("frontmatter field ‘type’ must be ‘capability’");
  });

  test("enum mismatch — message lists the allowed values", () => {
    const src = ["---", "id: D-1", "status: draft", "title: t", "---"].join("\n");
    const f = find(c, src).find((x) => x.id === "frontmatter/enum");
    expect(f?.message).toBe("frontmatter field ‘status’ must be one of ‘open’, ‘closed’");
  });

  test("wrong type — message names the field, the expected type, and what was found", () => {
    const typed = contract({ frontmatter: z.strictObject({ n: z.number() }) });
    const src = ["---", "n: not-a-number", "---"].join("\n");
    const f = find(typed, src).find((x) => x.id === "frontmatter/type");
    expect(f?.message).toBe("frontmatter field ‘n’ must be a number (got string)");
  });

  test("pattern mismatch — message names the field", () => {
    const pat = contract({ frontmatter: z.strictObject({ id: z.string().regex(/^C-\d{4}$/) }) });
    const src = ["---", "id: C-1", "---"].join("\n");
    const f = find(pat, src).find((x) => x.id === "frontmatter/type");
    expect(f?.message).toBe("frontmatter field ‘id’ does not match the required pattern");
  });

  test("nested path — message renders array indices readably", () => {
    const nested = contract({
      frontmatter: z.strictObject({ related: z.array(z.string()) }),
    });
    const src = ["---", "related:", "  - 42", "---"].join("\n");
    const f = find(nested, src).find((x) => x.id === "frontmatter/type");
    expect(f?.message).toBe("frontmatter field ‘related[0]’ must be a string (got number)");
  });

  test("unknown-key — frontmatter/unknown-key at the stray key's line", () => {
    const src = [
      "---", // 1
      "id: D-1", // 2
      "status: open", // 3
      "title: t", // 4
      "foo: bar", // 5 — stray
      "---", // 6
    ].join("\n");
    expect(shape(find(c, src))).toEqual([{ id: "frontmatter/unknown-key", line: 5 }]);
  });

  test("missing required — frontmatter/required, remapped where the key would sit", () => {
    const src = ["---", "id: D-1", "status: open", "---"].join("\n"); // title absent
    const ids = find(c, src).map((f) => f.id);
    expect(ids).toContain("frontmatter/required");
  });

  test("type mismatch — a non-enum non-missing failure → frontmatter/type", () => {
    const typed = contract({ frontmatter: z.strictObject({ n: z.number() }) });
    const src = ["---", "n: not-a-number", "---"].join("\n");
    const ids = find(typed, src).map((f) => f.id);
    expect(ids).toContain("frontmatter/type");
  });

  test("absent frontmatter with a declared schema still fires required-key findings", () => {
    const ids = find(c, "# title only, no frontmatter").map((f) => f.id);
    expect(ids).toContain("frontmatter/required");
  });

  test("valid frontmatter — no findings", () => {
    const src = ["---", "id: D-1", "status: open", "title: t", "---"].join("\n");
    expect(find(c, src)).toEqual([]);
  });
});
