> Example 11 for [[D-0014-markdown-structure-validation|D-0014]] — Typed cells: enum /
> pattern. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 11 · Typed cells: enum / pattern

## Capability

The `cells` key on the `table()` leaf (introduced as a structure leaf in step 10).
`cells: { Col: ZodType }` attaches a per-cell Zod schema to a *declared* column, validating every
row's value in that column. Layer 1 has already flattened each cell to a string, so the schema runs
over a scalar, not an mdast subtree. This is the first per-value content assertion *inside* a table:
`z.enum([...])` constrains a column to a closed set, `z.string().regex(...)` to a pattern. Columns
without a `cells` entry stay plain `string`. The same declaration drives the typed `TableView<Row>`
(§6): declared cells take their Zod type in the inferred `Row`, undeclared columns default to
string.

## Use case

A change-manifest table — the `## Files` section of a task or plan — where each row names a file,
the kind of edit, and where it lives. The `Kind` column is a closed vocabulary (`add` / `modify` /
`delete`); the `Location` column must look like a repo-relative path. Plain presence checks miss a
typo'd `Kind` or a stray absolute path; per-cell Zod catches both at the offending row.

## Sample document

```md
## Files

| File       | Kind   | Location                  |
| ---------- | ------ | ------------------------- |
| grammar.ts | add    | packages/ts/mc/src/       |
| leaves.ts  | modify | packages/ts/mc/src/       |
| legacy.ts  | delete | plugin/lib/model/legacy/  |
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

export const FilesContract = contract({
  body: sections({}, [
    section("Files", {
      content: table({
        columns: ["File", "Kind", "Location"],
        cells: {
          Kind: z.enum(["add", "modify", "delete"]),
          Location: z.string().regex(/^[A-Za-z0-9._\/-]+\/$/),
        },
      }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. All three rows have a `Kind` drawn from the enum and a `Location`
matching the path pattern. The `## Files` section's sole `content: table(...)` promotes the table to
the `doc.body.files` field, typed from the column + cell declaration:

```jsonc
// FilesContract.validate(source, { path: "docs/.../task.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "files": {} }   // TableView<{ File: string; Kind: "add"|"modify"|"delete"; Location: string }>
  }
}
```

A consumer reading the OOM gets typed rows from the cell schema:

```ts
const doc = FilesContract.read(source, { path });
for (const r of doc.body.files) r.Kind;                 // "add" | "modify" | "delete"
doc.body.files.find((r) => r.Kind === "delete")?.File;  // "legacy.ts"
```

**FAIL** — mutate one row's `Kind` to a value outside the enum (`rename`) and leave the rest intact:

```md
## Files

| File       | Kind   | Location                  |
| ---------- | ------ | ------------------------- |
| grammar.ts | add    | packages/ts/mc/src/       |
| leaves.ts  | rename | packages/ts/mc/src/       |
| legacy.ts  | delete | plugin/lib/model/legacy/  |
```

Row 2's `Kind` cell fails `z.enum([...])`. The structure (columns, row count) is still valid, so a
single per-cell finding fires, localized to the offending row's source line:

```jsonc
// FilesContract.validate(source, { path: "docs/.../task.md" }).findings
[
  { "id": "table/cell", "level": "error",
    "path": "docs/.../task.md", "pos": { "line": 6 },
    "message": "Files: column ‘Kind’ row 2: expected add | modify | delete, got ‘rename’" }
]
```

## Gaps & questions

The contract itself uses only documented API. The Finding `id` and message wording for a failed
per-cell Zod schema are not pinned by proposed-shape.md, and row-precise `pos` for a cell failure
depends on the unresolved S7 question — how Zod `issues[].path` entries remap onto the projection
node's `line` (proposed-shape.md §7).

- The `cells` Zod runs over a string array under one `table()` schema, so a Zod issue path is
  `[rowIndex, column]`, not a `SourcePos`. Mapping it to the offending row's line is exactly the S7
  remap, unresolved for leaves as well as sections.
- No `id` namespace is documented for per-cell failures; this example assumes `table/cell` by
  analogy with `structure/*` and `frontmatter/*`, but the value is a guess.
