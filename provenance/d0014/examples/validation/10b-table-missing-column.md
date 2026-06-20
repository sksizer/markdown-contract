> Example 10b for [[D-0014-markdown-structure-validation|D-0014]] — Table missing a declared
> column. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 10b · Table missing a declared column

## Capability

No new API surface — this stresses a failure mode of step 10's `table({ columns })` content leaf.
The leaf declares the column set the projected `table` node must carry. Step 10 covers the happy
path and `minRows`; 10a covers an empty/below-`minRows` table. Here the table is well-formed and has
enough rows, but its header omits a *declared* column (`Change`). The leaf compiles to a Zod schema
over the projected `BlockNode` of kind `"table"`, whose `columns: string[]` is matched against the
contract's declared `columns`. A declared column with no matching header is a missing column.

## Use case

A task's `## Files to touch` table whose contract fixes the columns `Location | Kind | Change`. An
author writes the table but forgets the `Change` column, leaving `Location | Kind`. The contract
must catch the missing column rather than silently treating the table as conforming.

## Sample document

```md
## Files

| Location | Kind   | Change          |
| -------- | ------ | --------------- |
| `a.ts`   | modify | add the leaf    |
| `b.ts`   | add    | new projection  |
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

**PASS** — the sample above. The `## Files` heading projects to a `SectionNode` whose sole `table`
block has `columns === ["Location", "Kind", "Change"]` and two rows (≥ `minRows`). All declared
columns are present, so the leaf passes.

```jsonc
// FilesContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    // sole content: table(...) ⇒ heading is the table (OOM §6 first-match row)
    "body": { "files": { /* TableView<{ Location; Kind; Change }>, rowCount 2 */ } }
  }
}
```

**FAIL** — mutate the table so the `Change` column is dropped from the header (and its cells):

```md
## Files

| Location | Kind   |
| -------- | ------ |
| `a.ts`   | modify |
| `b.ts`   | add    |
```

The projected `table` block now has `columns === ["Location", "Kind"]`. The declared `Change` column
has no matching header, so the leaf emits one column-missing finding naming the missing column. Row
count still satisfies `minRows`, so no `minRows` finding fires:

```jsonc
// FilesContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "content/table/column-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "table is missing declared column ‘Change’" }
]
```

## Gaps & questions

The mechanism is documented (the `table` leaf declares `columns`, projection gives the node's actual
`columns`, the leaf is "just Zod" over that node), but proposed-shape.md never names the finding
**id** for a declared column that is absent. §5.3 names `structure/*` and `frontmatter/*` ids; the
`table` leaf's failure ids are unspecified. The id, level, and message above
(`content/table/column-missing`) are inferred, not documented — the same gap 10a/10c will hit for
`minRows` and extra-column failures.

- **Proposed delta:** add a short "leaf finding ids" table to §3 enumerating the ids each leaf can
  emit — e.g. `content/table/column-missing` (missing declared column), `table/min-rows`,
  `list/min-items`, `list/item-kind`, `code/lang-mismatch`, `content/max-words` — each with its
  default `level` and a message template. Without it, every content-leaf example must invent ids.
- **Open question:** is a missing declared column the *same* id as an undeclared/extra column (one
  `content/table/column-missing` with a directional message), or two distinct ids
  (`content/table/column-missing` vs `content/table/column-extra`)? 10c (extra column) needs this
  answered to stay consistent with 10b.
