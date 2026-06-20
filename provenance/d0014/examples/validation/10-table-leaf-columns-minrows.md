> Example 10 for [[D-0014-markdown-structure-validation|D-0014]] — Table leaf: columns +
> minRows. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 10 · Table leaf: columns + minRows

## Capability

The `table()` content leaf (`leaves.ts`). `content: table({ columns, minRows })` compiles to a Zod
schema over a projected `table` BlockNode: it asserts the header row matches the declared `columns`
(name and set) and that the table carries at least `minRows` data rows. This is the first leaf that
reads a *structured* block rather than prose (step 09's `maxWords`) — it depends on `remark-gfm`
projecting the pipe table to `{ kind: "table"; columns; rows }` rather than a paragraph of pipe
text.

## Use case

A section whose body *is* a manifest table: a `## Files` listing each touched location with its kind
of change. The contract pins the column vocabulary and requires at least one data row so an empty
header-only table doesn't pass as a populated manifest. Task and change-log document classes want
exactly this — a typed, non-empty table under a fixed heading.

## Sample document

```md
## Files

| Location          | Kind   | Change            |
| ----------------- | ------ | ----------------- |
| src/projection.ts | modify | flatten cells     |
| src/leaves.ts     | add    | table() leaf impl |
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

export const FilesContract = contract({
  body: sections({}, [
    section("Files", {
      content: table({ columns: ["Location", "Kind", "Change"], minRows: 1 }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. The `## Files` heading projects to a `SectionNode` whose sole block is
a `table` with `columns === ["Location", "Kind", "Change"]` (header matches) and two data rows
(`rows.length === 2 ≥ minRows`). Both the column-name match and the `minRows` floor are satisfied.

```jsonc
// FilesContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "files": {} }   // SectionView; .table is TableView<Record<string,string>>, rowCount 2
  }
}
```

The sole-table section exposes a `TableView` via `doc.body.files.table` — `rowCount` 2, iterable
rows keyed `{ Location, Kind, Change }`, all string-typed (no `cells:` declared, so untyped).

**FAIL** — mutate the document to a header-only table (drop both data rows):

```md
## Files

| Location | Kind | Change |
| -------- | ---- | ------ |
```

The header still matches `columns`, but the projected table has `rows.length === 0`, below
`minRows: 1`, so the `minRows` assertion fires:

```jsonc
// FilesContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "table/min-rows", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "Files table has 0 data rows; at least 1 required" }
]
```

## Gaps & questions

None — expressible with the API as documented.
