> Example 15b for [[D-0014-markdown-structure-validation|D-0014]] — Undeclared anchor
> reachable only dynamically. Exercises the proposed API (proposed-shape.md); non-normative;
> where they disagree, that doc wins.

# 15b · Undeclared anchor reachable only dynamically

## Capability

Builds on step 15 (multiple anchored tables in one section via a `content` record, each table bound
to its block by `^anchor`). This edge stresses the OOM access rule from §6: types come *only* from
the contract. A `^anchor` the contract never declares is **not** a typed field — it produces no
finding (the section still validates), and it is reachable only dynamically via `doc.byAnchor("…")`,
which hands back `TableView<Record<string, string>>` — columns read from the document, every cell
typed `string`. So the contract is closed for *typing* but the projection stays open for *access*:
extra anchored content rides along, untyped, instead of being rejected.

## Use case

A `## Decision` section that the contract pins to two named tables (`^components`, `^risks`), but
where an author has added a third `^extra` table the contract was never updated to know about —
a scratch comparison the team keeps inline. The document is still conforming: the contract asserts
what `^components`/`^risks` must look like and says nothing about other anchors (`allowUnknown`
governs sections, and undeclared *blocks* are simply not constrained). A consumer can still reach
the extra table generically through `doc.byAnchor("extra")`, but without row types.

## Sample document

```md
## Decision

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | parser    | remark-gfm |
^components

| Risk          | Mitigation        |
| ------------- | ----------------- |
| fence parsing | spike S6          |
^risks

| Option | Note            |
| ------ | --------------- |
| A      | rejected, slow  |
| B      | chosen          |
^extra
```

## Proposed contract

Same contract as step 15 — the `content` record binds two tables by `^anchor`; `^extra` is absent
from it by design.

```ts
import { contract, sections, section, table } from "markdown-contract";

export const DecisionContract = contract({
  body: sections({}, [
    section("Decision", {
      content: {
        components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
        risks:      table({ anchor: "risks",      columns: ["Risk", "Mitigation"] }),
      },
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. `^components` and `^risks` satisfy their declared `table(...)` leaves;
`^extra` is an undeclared anchored block, so the contract imposes nothing on it and it raises no
finding. The two declared tables become typed fields; `^extra` is reachable only dynamically.

```jsonc
// DecisionContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": {
      "decision": { "components": {}, "risks": {} }  // both TableView<Row>; no `extra` field
    }
  }
}
```

A consumer reads the declared tables typed, and the undeclared one untyped via `byAnchor`:

```ts
const doc = DecisionContract.read(source, { path });

doc.body.decision.components;                 // TableView<{ "#": string; Component: string; Resolution: string }>
doc.body.decision.risks;                      // TableView<{ Risk: string; Mitigation: string }>

// @ts-expect-error — `extra` is not a declared field on the contract-derived model
doc.body.decision.extra;

const extra = doc.byAnchor("extra");          // TableView<Record<string, string>>
extra.columns;                                // ["Option", "Note"] — read from the document
extra.rows[1].Option;                         // "B" — typed string, no enum/row typing
```

**FAIL** — there is no failure to demonstrate for the *undeclared* anchor: by the §6 access rule an
anchor the contract does not declare is never a finding, only an untyped access path. The only way
to turn `^extra` into a finding is to *declare* it (add
`extra: table({ anchor: "extra", columns: [...] })` to the `content` record), at which point it
follows the normal table-leaf rules of steps 10/15 — which is no longer this edge. So this case has
a PASS arm only.

## Gaps & questions

The contract uses only documented API, and §6's access table (line "`^anchor` the contract doesn't
declare → `doc.byAnchor("components")` → `Record<string,string>`") states the behaviour directly.
One genuine type-surface ambiguity:

- `byAnchor` is documented with two return types. The §6 access table and the closing prose say a
  doc-root `doc.byAnchor("…")` for an undeclared anchored *table* yields
  `TableView<Record<string, string>>`. But `SectionView.byAnchor(id)` is typed
  `BlockView | undefined`, and the only documented signature for `byAnchor` lives on `SectionView`.
  Whether the doc-root `doc.byAnchor` is a distinct, table-narrowed signature, or `BlockView` is a
  supertype that narrows to `TableView` for table blocks, is unstated.
  - Proposed delta: add an explicit doc-root method to the model surface, e.g.
    `byAnchor(id: string): BlockView | undefined` on `Doc`, plus a documented narrowing
    (`block.kind === "table"` ⇒ `TableView<Record<string, string>>`), or a typed overload
    `byAnchorTable(id: string): TableView<Record<string, string>> | undefined`.
  - Open question: is `byAnchor` meant to return `undefined` for a missing anchor (matching
    `SectionView.byAnchor`), and does the doc-root variant search all sections or only root-level
    anchored blocks?
