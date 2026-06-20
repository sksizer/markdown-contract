> Consumption case 07 for [[D-0014-markdown-structure-validation|D-0014]] — byAnchor — declared vs
> dynamic. Exercises proposed-shape.md §6; non-normative; that doc wins.

# 07 · byAnchor — declared vs dynamic

## Affordance

`byAnchor(id)` reaches an `^block-id` by name and returns **`BlockView | undefined`** (F2) — a
`kind`-discriminated union narrowed idiomatically (`if (b?.kind === "table") b.rows`).
`doc.byAnchor` searches the whole document (U7's doc-wide root surface); `section.byAnchor` searches
within one section. A **declared** anchor is also a typed named field; an **undeclared** anchor is
reachable *only* via `byAnchor`, dynamically typed (`Record<string, string>` cells).

## Consumes

[v15b — undeclared anchor reachable only dynamically](../validation/15b-undeclared-anchor-dynamic-access.md):
a `## Decision` whose contract pins two anchored tables (`^components`, `^risks`) and where the
author added a third `^extra` table the contract never declared. Reuse its contract + sample
document by reference; the only added shape is the `content` record binding two tables:

```ts
// from v15b (reused) — two tables declared; ^extra is absent from the contract by design
section("Decision", {
  content: {
    components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
    risks:      table({ anchor: "risks",      columns: ["Risk", "Mitigation"] }),
  },
});
```

## Consumer code + expected reads

```ts
const doc = DecisionContract.read(source, { path });   // doc, or throws ContractError (F1)

// 1 — declared anchors are typed named fields: row types from the column declaration
doc.body.decision.components;          // TableView<{ "#": string; Component: string; Resolution: string }>
doc.body.decision.risks;               // TableView<{ Risk: string; Mitigation: string }>

// @ts-expect-error — ^extra is undeclared, so no typed field exists on the model
doc.body.decision.extra;

// 2 — the undeclared anchor is reachable ONLY via byAnchor; doc-wide search (U7)
const b = doc.byAnchor("extra");       // BlockView | undefined (F2) — NOT TableView directly
b?.kind;                               // "table" — discriminant; the only §6-defined arm (U2)

// 3 — narrow on .kind before reaching table-shaped members (F2)
if (b?.kind === "table") {
  b.columns;                           // ["Option", "Note"] — read from the document
  b.rows;                              // TableView<Record<string, string>> rows (U8 — string cells)
  b.rows[1].Option;                    // "B" — typed string, no enum/row typing
  b.column("Note");                    // string[] — column()/find() still typed string (U8)
}

// 4 — a declared anchor is reachable BOTH ways: typed field AND dynamic byAnchor
const c = doc.byAnchor("components");  // BlockView | undefined — same door, untyped rows
if (c?.kind === "table") c.rows[0]["#"];   // Record<string,string> here — types live on doc.body.decision.components

// 5 — section-scoped byAnchor searches within one section, not the whole doc
const within = doc.body.decision.byAnchor("extra");   // BlockView | undefined — same ^extra, section scope
within?.kind;                          // "table"
doc.body.decision.byAnchor("missing"); // undefined — no such anchor in this section
```

`doc.byAnchor` and `section.byAnchor` are one door at two scopes: the doc-root variant searches
every section, the section variant only its own blocks. Both hand back `BlockView | undefined`, so
the consumer narrows on `.kind` before touching `rows`/`columns` — there is no typed shortcut for an
*undeclared* anchor, by the §6 access rule (types come only from the contract).

## Gaps & open consumption decisions

- **U2 (`BlockView` arms).** Only the `table` arm (`TableView`) is defined in §6; the `list` /
  `code` / `paragraph` arms of the `kind`-discriminated union are unnamed (likely `ListView` /
  `CodeView` / `ParagraphView`). This case narrows to `table` only because narrowing to any other
  arm has no documented member to reach. See review-checklist.md.
- **U7 (`doc.byAnchor` root surface).** §6 names a doc-wide `doc.byAnchor` in the access table but
  only types `byAnchor` on `SectionView`. Whether `doc.byAnchor` is a distinct method on the model
  root, its search scope (whole document vs root-level blocks), and its `undefined`-on-miss contract
  are unpinned. This case (with 02) is where U7 resolves. See review-checklist.md.
- **U8 (dynamic `TableView`).** An undeclared/lone table is `TableView<Record<string, string>>` —
  same interface as a typed one, `column()`/`find()` still returning `string`. This case asserts
  those reads; confirm the interface is identical, just `string`-celled. See
  review-checklist.md.
