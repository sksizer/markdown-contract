> Example 11a for [[D-0014-markdown-structure-validation|D-0014]] — Cell enum violation.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 11a · Cell enum violation

## Capability

Builds on **11** (typed cells: `table({ cells: { Col: z.enum/regex } })`). Same typed-cell contract;
this edge stresses the *failure*: one cell holds a value outside its declared `z.enum`, so the
per-cell Zod schema rejects that row. The finding must localize to the offending row's source line
(the `rowPos` of that row), with the other rows still passing. No new API surface — it exercises how
a single bad cell turns into one localized finding rather than failing the whole table.

## Use case

A Task's `## Files to touch` table, where the `Kind` column is constrained to a fixed verb set
(`add` / `modify` / `delete`). An author writes `rename` — a plausible-but-undeclared verb. The
contract should flag exactly that one row's cell, point the diagnostic at its line, and leave the
conforming rows untouched.

## Sample document

```md
## Files to touch

| Location              | Kind   | Change                        |
| --------------------- | ------ | ----------------------------- |
| `src/projection.ts`   | add    | new mdast → DocTree projection |
| `src/grammar.ts`      | rename | move combinators out of leaves |
| `src/index.ts`        | modify | export the new surface         |
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

export const FilesContract = contract({
  body: sections({}, [
    section("Files to touch", {
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Kind: z.enum(["add", "modify", "delete"]) },
      }),
    }),
  ]),
});
```

## Expected findings

**PASS** — replace `rename` with `modify` so every `Kind` cell is in the enum. The table projects to
three rows; the `Kind` column types as `"add" | "modify" | "delete"` and every cell satisfies it.

```jsonc
// FilesContract.validate(source, { path: "docs/.../TASK.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    // filesToTouch is a TableView<{ Location: string;
    //   Kind: "add" | "modify" | "delete"; Change: string }>
    "body": { "filesToTouch": { "rowCount": 3 } }
  }
}
```

A consumer iterates typed rows: `for (const r of doc.body.filesToTouch) r.Kind;` — each `r.Kind`
narrowed to the enum union, no further guarding needed.

**FAIL** — the sample document above (row 2 `Kind` is `rename`). The first and third rows satisfy
the `Kind` enum; row 2 does not, so exactly one cell-level finding fires, positioned at that row's
line (`filesToTouch.rowPos(1)` → the `src/grammar.ts` row on line 6):

```jsonc
// FilesContract.validate(source, { path: "docs/.../TASK.md" }).findings
[
  { "id": "content/enum", "level": "error",
    "path": "docs/.../TASK.md", "pos": { "line": 6 },
    "message": "Kind: expected add | modify | delete, received ‘rename’" }
]
```

## Gaps & questions

The contract is **fully expressible** — `table({ cells: { Kind: z.enum(...) } })` is verbatim §5.2
and §11. Two things the doc does not pin down for a *cell-level* failure:

- **Finding id namespace for content-leaf Zod failures is unspecified.** The doc names
  `frontmatter/enum` (§5.3) and the `structure/*` grammar ids, but never an id for a `table`/`list`/
  `code` leaf Zod rejection. I used `content/enum` above as the natural sibling of
  `frontmatter/enum`; the doc could equally justify `table/cell-enum`.
  - *Smallest delta:* state the leaf-failure id convention in §3 / §4 — e.g. "leaf Zod failures emit
    `content/<zod-issue-code>`, parallel to `frontmatter/<code>`".
  - *Open question:* one flat `content/*` namespace, or per-leaf (`table/*`, `list/*`, `code/*`)?
- **Row localization of a cell Zod issue is the deferred S7 question.** §7 explicitly defers "how do
  Zod `issues[].path` entries remap onto the projection node's `line`". This example *assumes* a
  cell issue at `path: ["rows", 1, "Kind"]` maps to `rowPos(1)`; that mapping is not yet guaranteed
  by the documented surface.
  - *Smallest delta:* document that a leaf Zod issue whose `path` head indexes a projected row
    carries `pos = TableView.rowPos(i)` (and, when LSP/SARIF lands, the cell column via
    `SourcePos.col`).
  - *Open question:* does a cell finding ever want to localize to the *cell* (`col`) rather than the
    whole row, and is that v1 or deferred with the rest of `SourcePos.end`/`col`?
