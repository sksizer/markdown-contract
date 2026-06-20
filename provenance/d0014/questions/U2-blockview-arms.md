> Question U2 for [[D-0014-markdown-structure-validation|D-0014]] — the `BlockView` union arms (only
> the `table` arm is defined). Part of the consumption-API review (Phase U in
> ../review-checklist.md). Non-normative; records the decision, folded into
> [proposed-shape.md](../proposed-shape.md) §6 at the consumption fold.

# U2 · BlockView arms

**Surfaced by:** [[07-byanchor-declared-vs-dynamic|c07]].

## The question

F2 makes `byAnchor(id)` return **`BlockView | undefined`**, a `kind`-discriminated union you narrow
via `if (b?.kind === "table")`. But §6 only defines the **`table`** arm (`TableView`). An `^anchor`
can tag *any* block (table / list / code / paragraph, F2), so the union needs all four arms, two of
which (`code`, `paragraph`) have no view type yet. What are they?

## Recommendation — four `kind`-discriminated arms, mirroring the projection

`BlockView` is the OOM mirror of the projection's `BlockNode` (§2) — same four kinds, each view
carrying a literal **`kind`** discriminant so narrowing works:

```ts
type BlockView = TableView | ListView | CodeView | ParagraphView;   // narrow on .kind

interface TableView<Row = Record<string, string>> extends Iterable<Row> {
  kind: "table";                       // ← discriminant (new)
  columns: string[]; rows: Row[]; rowCount: number; pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;
}

interface ListView extends Iterable<ListItem> {   // U1
  kind: "list";                        // ← discriminant (new)
  ordered: boolean; items: ListItem[]; length: number; pos: SourcePos;
}

interface CodeView      { kind: "code";      lang: string | null; value: string; pos: SourcePos }
interface ParagraphView { kind: "paragraph"; text: string;                       pos: SourcePos }
```

- **`TableView` / `ListView` gain `kind`** — the discriminant the union narrows on (and, for
  `TableView<Row>`, the default `Row = Record<string, string>` is the dynamic `byAnchor` case).
- **`CodeView` / `ParagraphView` are thin** — code is `lang` + `value`, a paragraph is `text`; no
  iteration, just the projection node's content + `pos` + `kind`. They mirror `BlockNode`'s `code` /
  `paragraph` arms one-to-one.
- Views carry **no `anchor` field** (you reached the block *by* its anchor; the views stay
  content-focused, consistent with the existing `TableView`).

So `byAnchor("x")` → `BlockView`; `if (b?.kind === "table") b.rows`, `=== "list" b.items`,
`=== "code" b.value`, `=== "paragraph" b.text`.

## Decision

**Resolved (2026-06-20).** `BlockView` = `TableView | ListView | CodeView | ParagraphView`,
`kind`-discriminated. Add a literal `kind` field to `TableView` (`"table"`) and `ListView`
(`"list"`); define thin `CodeView { kind:"code"; lang; value; pos }` and
`ParagraphView { kind:"paragraph"; text; pos }`, mirroring the projection's `BlockNode` arms.
`TableView<Row = Record<string,string>>` defaults to the dynamic `byAnchor` case; views carry no
`anchor` field. Folds into proposed-shape.md §6.
