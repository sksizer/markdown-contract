> Question F2 for [[D-0014-markdown-structure-validation|D-0014]] — `byAnchor` return type + scope.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# F2 · byAnchor types

**Surfaced by:** [[15b-undeclared-anchor-dynamic-access|15b]].

## The question

`byAnchor(id)` resolves a `^anchor` to a block. [§6 of `proposed-shape.md`](../proposed-shape.md)
(the OOM section) left it **self-contradictory**: the "Naming a table as a field" prose says
`doc.byAnchor("…")` returns `TableView<Record<string, string>>`, while the `SectionView` interface a
few lines down declares `byAnchor(id): BlockView | undefined`. Same method, two return types — pick
one (and, in passing, the table-narrowing and search scope).

## Recommendation

**Uniform return: `byAnchor(id): BlockView | undefined`** at *both* doc-root and section level. An
anchor can tag *any* block (table / list / code), so the generic `BlockView` is correct; the
doc-root "returns a TableView" line was too narrow.

`BlockView` is a **discriminated union on `kind`**, so you narrow idiomatically — no separate
`byAnchorTable()`:

```ts
const b = doc.byAnchor("components");
if (b?.kind === "table") {
  b.rows;          // b is now TableView<Record<string, string>>
}
```

**Scope:**

- **`doc.byAnchor(id)`** searches the **whole document** — anchors are document-unique (Obsidian
  block-ids are unique within a note), so a doc-wide lookup is well-defined.
- **`section.byAnchor(id)`** searches **within that section** (its blocks + nested subsections).
- Both return `undefined` for a missing anchor (no throw); a *declared* content-record anchor that
  resolves to nothing is the separate F3 finding.

No `byAnchorTable()` — `kind`-narrowing covers it; add a typed convenience later only if the
ergonomics demand. Dynamic blocks are `Record<string,string>`-typed (undeclared → not in the
inferred type), per C2.

## Decision

**Resolved (2026-06-19).** Uniform **`byAnchor(id): BlockView | undefined`** at both doc-root and
section scope. `BlockView` is a **`kind`-discriminated union**; narrow idiomatically
(`if (b?.kind === "table") b.rows`). **Union-only — no `byAnchorTable()`** convenience (add later
only if the ergonomics demand it). Scope: `doc.byAnchor` searches the **whole document**,
`section.byAnchor` searches **within that section** (its blocks + nested subsections). A missing
anchor returns **`undefined`** (no throw); a *declared* content-record anchor that resolves to
nothing is the separate **F3** finding. `byAnchor` is a pure projection lookup over the `^block-id`
axis only — heading text is the *separate* section axis (`.section(...)` / dual-key), never an
anchor. Fold into proposed-shape.md §6 at H1 — reconcile the line-448 prose (currently "returns a
`TableView`") to the line-464 interface (`BlockView | undefined`).
