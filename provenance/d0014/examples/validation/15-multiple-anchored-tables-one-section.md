> Example 15 for [[D-0014-markdown-structure-validation|D-0014]] — Multiple anchored tables in
> one section. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 15 · Multiple anchored tables in one section

## Capability

The `content` *record* form of `SectionOpts` — `content: Record<string, ZodType>` (§3) resolved by
`^anchor` (§6, "Multiple typed tables in one section"). Where step 10 gave a section a single
`content: table(...)` leaf, here a section carries *several* typed tables. Each named field in the
record is a `table({ anchor, columns })` leaf; the projector binds it to the document block that
ends with the matching `^block-id`, and each resolves to its own typed `TableView<Row>`. The
`anchor:` on the leaf is the join key between the contract field and the projected `table` BlockNode
(`BlockNode.anchor`, §2 layer 1).

## Use case

A `## Decision` section that records two distinct manifests in one place: a *components* table (what
each part resolves to) and a *risks* table (each risk and its mitigation). Both live under the same
heading, so the sole-table `.table` accessor cannot disambiguate them — the contract names each by
its `^anchor`, yielding stable, typed `doc.body.decision.components` / `doc.body.decision.risks`
fields regardless of authoring order.

## Sample document

```md
## Decision

| # | Component  | Resolution                  |
| - | ---------- | --------------------------- |
| 1 | projection | mdast → DocTree             |
| 2 | grammar    | sections/section combinators |
^components

| Risk                  | Mitigation                |
| --------------------- | ------------------------- |
| remark-gfm not pinned | pin in spike S6           |
^risks
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

export const DecisionTablesContract = contract({
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

**PASS** — the sample above. The `## Decision` heading projects to a `SectionNode` with two `table`
BlockNodes; the first carries `anchor === "components"`, the second `anchor === "risks"`. Each
contract field resolves by anchor and its header matches the declared `columns`, so both leaves
type-check and findings is empty.

```jsonc
// DecisionTablesContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": {
      "decision": { "components": {}, "risks": {} }
      // each a TableView<Row>: components rowCount 2, risks rowCount 1
    }
  }
}
```

A consumer reads each as a typed iterable:

```ts
doc.body.decision.components.column("Component");   // string[], length 2
doc.body.decision.risks.find((r) => r.Risk.includes("gfm"))?.Mitigation;  // "pin in spike S6"
```

**FAIL** — mutate the `risks` table's header to drop the `Mitigation` column (leave `^risks`):

```md
## Decision

| # | Component  | Resolution      |
| - | ---------- | --------------- |
| 1 | projection | mdast → DocTree |
^components

| Risk                  |
| --------------------- |
| remark-gfm not pinned |
^risks
```

The `components` field still resolves and type-checks. The `risks` field resolves by anchor, but its
projected header `["Risk"]` is missing the declared column `Mitigation`, so the `risks` leaf fails:

```jsonc
// DecisionTablesContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "table/column-mismatch", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 9 },
    "message": "risks table is missing declared column ‘Mitigation’" }
]
```

## Gaps & questions

None — expressible with the API as documented.
