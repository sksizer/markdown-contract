> Example 10a for [[D-0014-markdown-structure-validation|D-0014]] — Empty table / below
> minRows. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 10a · Empty table / below minRows

## Capability

The failure variant of step 10's `table({ columns, minRows })` leaf: a header-only table that
declares the right columns but carries **zero data rows**. `minRows: 1` is the `table(...)` leaf's
row-count floor (`leaves.ts`), compiling to a Zod assertion over the projected `table` block's
`rows`. Step 10 shows the leaf passing on a populated table; 10a stresses the lower bound — the
table is structurally well-formed (columns match) yet fails the row budget.

## Use case

A `## Files` section whose only legal content is a touched-files table with at least one entry. A
header skeleton with no data rows is a common authoring stub — the columns are typed in but the
author never filled a row. The contract must reject it rather than treat an empty table as
satisfying the section's content requirement.

## Sample document

```md
## Files

| Location | Kind   | Change           |
| -------- | ------ | ---------------- |
| a.ts     | modify | tighten the type |
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
a `table` with `columns === ["Location","Kind","Change"]` and one data row (`rowCount === 1`), so
`minRows: 1` holds.

```jsonc
// FilesContract.validate(source, { path: "docs/.../task.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    // doc.body.files is the one-table section; doc.body.files.table is its TableView
    "body": { "files": {} }   // .table.rowCount === 1, columns match the declaration
  }
}
```

**FAIL** — mutate the document to drop the data row, leaving a header-only table:

```md
## Files

| Location | Kind   | Change           |
| -------- | ------ | ---------------- |
```

The projected `table` block now has `rows === []` (`rowCount === 0`); the columns still match, so
the only violation is the row floor. The `minRows: 1` leaf fails on the table's position:

```jsonc
// FilesContract.validate(source, { path: "docs/.../task.md" }).findings
[
  { "id": "content/table-min-rows", "level": "error",
    "path": "docs/.../task.md", "pos": { "line": 3 },
    "message": "Files table has 0 rows; expected at least 1" }
]
```

## Gaps & questions

The contract itself is fully expressible — `table({ columns, minRows })` is documented (§3 leaf
helpers). What the API does **not** pin down is the *finding id and level* a leaf Zod failure
carries: §5.3 only enumerates `structure/*` and `frontmatter/*` ids, and §4 says `level` is
"contract data", but no leaf emits a worked example. `content/table-min-rows` and `level:"error"`
above are inferred, not documented.

- **Gap:** leaf (`table`/`list`/`code`/`maxWords`) findings have no documented id namespace, message
  shape, or default level — only frontmatter and structure findings are exemplified.
- **Proposed delta:** add a `content/*` finding-id table to §4 (e.g. `content/table-min-rows`,
  `content/table-column-mismatch`, `content/max-words`) with each leaf's default `level`, mirroring
  the `structure/*` ids in §5.3.
- **Open question:** when a `table` block fails *both* column-mismatch and minRows, does the leaf
  emit one merged finding or one per assertion, and at what position (the table, or the offending
  row)?
