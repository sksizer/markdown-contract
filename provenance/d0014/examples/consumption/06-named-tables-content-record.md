> Consumption case 06 for [[D-0014-markdown-structure-validation|D-0014]] — Named tables via the
> content record. Exercises proposed-shape.md §6; non-normative; that doc wins.

# 06 · Named tables via the content record

## Affordance

Two typed tables in one section, each a named field. §6 ("Naming a table as a field") binds a
contract `content` record to its blocks by `^anchor`:
`components: table({ anchor: "components", … })` and `risks: table({ anchor: "risks", … })`. Both
resolve to their own typed `TableView<Row>` under the section's dotted key —
`doc.body.decision.components` and `doc.body.decision.risks` — regardless of authoring order.

## Consumes

[v15 — multiple anchored tables in one section](../validation/15-multiple-anchored-tables-one-section.md):
the `DecisionTablesContract`, its `## Decision` sample with `^components` and `^risks` tables, and
the PASS that types each. This tier adds only the consumer reads.

```ts
// from v15 (reused verbatim)
section("Decision", {
  content: {
    components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
    risks:      table({ anchor: "risks",      columns: ["Risk", "Mitigation"] }),
  },
});
```

## Consumer code + expected reads

```ts
const doc = DecisionTablesContract.read(source, { path });   // throws ContractError on error-level (F1)

const dec = doc.body.decision;         // SectionView — dotted camelCase of "Decision"

// both fields are TableView<Row>, typed from each leaf's column declaration (§6)
const comps = dec.components;          // TableView<{ "#": string; Component: string; Resolution: string }>
const risks = dec.risks;              // TableView<{ Risk: string; Mitigation: string }>

comps.rowCount;                        // 2
risks.rowCount;                        // 1

comps.column("Component");             // string[] — ["projection", "grammar"]
risks.find((r) => r.Risk.includes("gfm"))?.Mitigation;   // "pin in spike S6"

for (const c of comps) c.Resolution;   // iterate typed rows (TableView is Iterable<Row>)

comps.rowPos(0).line;                  // source line of the first components row (positions survive)
```

The two tables share a heading, so the sole-table `.table` accessor (§6, SectionView) cannot
disambiguate them — the `content` record names each by `^anchor`, and each name becomes a typed
field on the `SectionView`. This is the second row of §6's "Naming a table as a field" table
(content record, bound by `^anchor` → row types), distinct from a section's sole
`content: table(...)` where the heading *is* the table (case [05](./05-tableview-typed-rows.md)).

## Gaps & open consumption decisions

- Nothing new. Every read here is documented §6: dotted-key `SectionView` access, the `content`
  record → named typed fields, and `TableView`'s `rowCount` / `column` / `find` / iteration /
  `rowPos`. `TableView` itself is exercised in case [05](./05-tableview-typed-rows.md); the dynamic
  (untyped) table and `doc.byAnchor` arms are case [07](./07-byanchor-declared-vs-dynamic.md). See
  [review-checklist.md](../../review-checklist.md).
