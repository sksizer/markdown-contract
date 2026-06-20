> Example 10c for [[D-0014-markdown-structure-validation|D-0014]] — Table with an extra
> column. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 10c · Table with an extra column

## Capability

Edge of step 10 (`table({ columns, minRows })` content leaf). Step 10 declares the *expected*
columns; 10b stresses a **missing** declared column. This case stresses the opposite — a document
table that carries an **extra, undeclared** column (`Owner`) beyond the declared set. By default
(`extraColumns: "ignore"`) the extra column is admitted and defaults to string per the OOM rule
(§6 TableView): "declared cells take their Zod type; undeclared columns default to string." Setting
`extraColumns: "error"` (C2) instead reports the undeclared column — turning the column declaration
from a *lower bound* (required columns present) into an *exact set*. This case pins that knob.

## Use case

A `## Files` table the contract pins to three required columns (`Location | Kind | Change`). An
author adds a fourth column the contract never declared (`Owner`). The same table contract as step
10 must decide: tolerate the extra column (forward-compatible authoring), or flag it as an
undeclared column the contract did not sanction.

## Sample document

```md
## Files

| Location  | Kind   | Change | Owner |
| --------- | ------ | ------ | ----- |
| `a.ts`    | add    | new    | alice |
| `b.ts`    | modify | edit   | bob   |
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

export const FilesContract = contract({
  body: sections({}, [
    section("Files", {
      content: table({ columns: ["Location", "Kind", "Change"], minRows: 1, extraColumns: "error" }),
    }),
  ]),
});
```

## Expected findings

**PASS** — drop the extra `Owner` column so only the three declared columns
(`Location | Kind | Change`) remain. All declared columns are present, `minRows: 1` is met, and
`extraColumns: "error"` finds no undeclared column to report — **empty findings**. The consumer's
typed `TableView<Row>` exposes the declared columns as typed fields.

```jsonc
// FilesContract.validate(source-without-Owner, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "files": { "table": { /* TableView over the three declared columns */ } } }
  }
}
```

**FAIL** — the sample above. All three declared columns (`Location`, `Kind`, `Change`) are present
and `minRows: 1` is met (2 rows), but the extra `Owner` column is undeclared and the contract sets
`extraColumns: "error"`. So the extra column is reported rather than admitted-and-defaulted:

```jsonc
// table({ columns: ["Location","Kind","Change"], minRows: 1, extraColumns: "error" })
[
  { "id": "content/table/column-extra", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "table has undeclared column ‘Owner’; declared columns are Location, Kind, Change" }
]
```

## Gaps & questions

**Resolved (C2).** `table()` carries `extraColumns?: "ignore" | "error"` (default `"ignore"`,
preserving accept-and-default-to-string). With `extraColumns: "error"` an undeclared column emits
`content/table/column-extra` (error) at the table's `pos`; the directional counterpart is
`content/table/column-missing` (the 10b case). `columns` is otherwise a lower bound — opting into
`"error"` is what asserts an *exact* set.
