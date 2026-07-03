> Example 07 for [[D-0016-per-node-source-fidelity|D-0016]] — cell-depth raw: verbatim table cells.
> Non-normative; the decision wins.

# 07 · Cell — verbatim table cells

## Affordance

The flattened `table.rows` / `table.columns` drop inline markup — a `` `code` `` cell becomes bare
`code`, because `flattenInline` keeps only the `inlineCode` node's value, and mdast stores that value
with the **surrounding backticks already stripped** (the delimiters are not part of the node's
`value`). It is not a special case for code: the flat view reduces every inline construct to plain
text, so the backticks have nowhere to survive. `table.cell(row, col).raw()` returns the **verbatim
cell source, markup intact**. The flat form stays the default for the common case; the raw view is
there when the bytes matter.

## Input

```md
| Location                 | Kind   |
|--------------------------|--------|
| `src/core/frontmatter.ts`| new    |
| `src/core/projection.ts` | modify |
```

## Consumer code

```ts
const tree = parse(source);
const table = tree.root.sections[0].blocks.find((b) => b.kind === "table")!;

// flattened default — backticks stripped
table.rows[0][0];                 // "src/core/frontmatter.ts"        ← no backticks

// verbatim cell — markup preserved
table.cell(0, 0).raw();           // "`src/core/frontmatter.ts`"      ← backticks intact
table.cell(0, 0).range;           // { start, end } — the cell's source offsets
table.cell(0, 0).mdast();         // Mdast.TableCell (readonly) — inline children, positions
```

## Before / after

```ts
const colOf = (name: string) => table.columns.indexOf(name);

// before — re-read the raw line and re-split on "|" because rows[] flattened the backticks away
// (this is the parseOperationsTable / parse-touchpoints workaround, verbatim in the sdlc/dev repo)
const docLines = source.split("\n");
const raw0 = splitRow(docLines[table.rowPos(0).line - 1])[colOf("Location")]; // "`src/core/frontmatter.ts`"

// after — ask the cell for its bytes
const raw1 = table.cell(0, colOf("Location")).raw();                          // "`src/core/frontmatter.ts`"
```

## Why it matters

`parseOperationsTable` (PR #518) and the already-merged `parse-touchpoints` both carry the identical
`rowPos(i)` → re-read-the-line → re-split-on-`|` dance, for one reason: they must preserve the
backticks in a `Location` cell that `rows[][]` throws away. Per-cell `raw()` removes the whole
workaround — and unlike re-splitting a raw line, it handles escaped pipes and multi-line cells
correctly, because the boundary comes from the parser, not a `"|".split`.

## Notes

- Consumes the table model shared with [09](./09-structured-cells-three-views.md), where the same
  cell also carries a contract-typed value.
- `table.cellPos(row, col)` (M-0011) gives the cell's `SourcePos` with `col`; `cell(row,col).range`
  is the offset form the raw slice uses. The convergence question (decision, Open questions) is
  whether these are one primitive.
