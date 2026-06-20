> Question U1 for [[D-0014-markdown-structure-validation|D-0014]] — the `ListView` shape (the one §6
> view it names but never defines). Part of the consumption-API review (Phase U in
> ../review-checklist.md). Non-normative; records the decision, folded into
> [proposed-shape.md](../proposed-shape.md) §6 at the consumption fold.

# U1 · ListView shape

**Surfaced by:** [[04-sectionview-content|c04]] (also lightly [[11-real-task-consumed|c11]]).

## The question

§6 declares `SectionView.lists: ListView[]`, and `byAnchor`'s `BlockView` union has a `list` arm —
but **`ListView` is never defined**. Its raw input already exists: the projection's
`ListItem = { text; checked?; pos }` (§2, C3). What is the view wrapper's surface — a lean iterable,
or a full `TableView`-style mirror with helper methods?

## Recommendation — a lean iterable mirror of `TableView`

```ts
interface ListView extends Iterable<ListItem> {   // for…of yields ListItem (Iterable provides the iterator)
  ordered: boolean;            // <ol> vs <ul>
  items: ListItem[];           // ListItem = { text; checked?; pos } — §2/C3
  length: number;              // item count (the TableView.rowCount analog)
  pos: SourcePos;
}
```

Iterable like `TableView` (so `for (const item of view)` reads), but **thinner**:

- **No `column()`** — a list has no columns.
- **No `itemPos(i)` / `find()`** — each `ListItem` already carries its own `pos` (C3), and
  `view.items.find(...)` on the plain array covers lookup. Adding them would be redundant surface.
- A **checkbox list** (`everyItem: "checkbox"`) just guarantees every `item.checked` is a boolean
  (not `undefined`); the type need not change — `checked?: boolean` covers both.

The symmetry that matters (iterable + `items` + `length` + `pos`) is kept; the table-only machinery
(`columns` / `column()` / `rowPos()`) is dropped because lists don't have it.

### Alternative — full `TableView` mirror

Add `find(p)` and `itemPos(i)` for one-to-one symmetry with `TableView`. Rejected as redundant
(`items.find`, `item.pos` already do it), but trivially addable later if the ergonomics ask.

## Decision

**Resolved (2026-06-20).** Define **`ListView`** as a lean iterable mirror of `TableView`:
`extends Iterable<ListItem>` (so `for…of` yields `ListItem`) +
`{ ordered; items: ListItem[]; length; pos }`. **No** `column()` / `find()` / `itemPos()` — each
`ListItem` already carries its `pos` (C3) and `items.find(...)` covers lookup. A checkbox list keeps
`checked?: boolean` (true/false rather than undefined). The explicit
`[Symbol.iterator](): Iterator<T>` line is **redundant** with `extends Iterable<T>` and is dropped —
and **`TableView` gets the same cleanup** at the §6 fold. Folds into proposed-shape.md §6.
