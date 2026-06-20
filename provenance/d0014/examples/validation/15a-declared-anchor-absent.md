> Example 15a for [[D-0014-markdown-structure-validation|D-0014]] — Declared anchor absent in
> document. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 15a · Declared anchor absent in document

## Capability

Builds on **15** (multiple anchored tables in one section via a `content` record, each table bound
to its block by `^anchor`). This edge stresses the *resolution* of those bindings: when the
contract declares an anchor (`risks`) that no block in the document carries, the binding cannot
resolve. The well-formed sibling binding (`components`) still resolves, so the failure is
per-binding, not all-or-nothing — one `structure/anchor-missing` finding while the other field
stays typed.

## Use case

A Decision whose `## Decision` section is contracted to hold two named tables — a `components`
table and a `risks` table — each pinned to its block by a `^block-id`. An author writes both
tables but forgets the `^risks` marker on the second. The structure is otherwise valid, so the
contract must localize the failure to the missing binding, not reject the whole section.

## Sample document

```md
## Decision

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | Projection | mdast → DocTree |
^components

| Risk | Mitigation |
| ---- | ---------- |
| Scope creep | Spike S6 |
```

The second table carries no `^risks` block-id; `^components` resolves on the first.

## Proposed contract

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

**PASS** — the conforming document tags *both* tables. Add `^risks` after the second table:

```md
| Risk | Mitigation |
| ---- | ---------- |
| Scope creep | Spike S6 |
^risks
```

Both content-record bindings resolve, so `validate` returns no findings and a typed value with both
tables exposed as `TableView`s on `doc.body.decision` (per §6 "Naming a table as a field"):

```jsonc
// DecisionContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": {
      "decision": {
        "components": { "columns": ["#", "Component", "Resolution"], "rowCount": 1 },
        "risks":      { "columns": ["Risk", "Mitigation"],          "rowCount": 1 }
      }
    }
  }
}
```

**FAIL** — the sample document above (no `^risks` marker). The `components` binding resolves; the
`risks` binding finds no block carrying `^risks`, so one `structure/anchor-missing` finding fires
(leaf-agnostic, error), localized to the `## Decision` heading (the section owning the unresolved
binding — the absent block has no position of its own). (Had `^risks` instead landed on a block of
the wrong kind, that would be `structure/block-kind` at the offending block, not anchor-missing.)

```jsonc
// DecisionContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 1 },
    "message": "Decision section declares content table ‘risks’ bound to ^risks, but no block carries that block-id" }
]
```

## Gaps & questions

The contract is expressible — a `content` record of anchor-bound `table(...)` leaves is documented
verbatim in §6 ("Multiple typed tables in one section use the `content` record"). The
unresolved-binding case is now decided (F3, decision B): it is a structure-plane finding, not a new
content-plane id.

- A contract-declared content-record `anchor` that resolves to no block reuses
  `structure/anchor-missing` (leaf-agnostic, `error`, pos at the owning section's heading since the
  missing block has no source position) — the same id §5.3 documents for a *section's* `anchor:`
  requirement (`SectionOpts.anchor`). The binding-resolution case does **not** get its own id; the
  earlier `content/<leaf>/anchor-not-found` guess is dropped.
- If the anchor instead resolves to a block of the *wrong kind*, that is `structure/block-kind`
  (leaf-agnostic, `error`, pos at the offending block) — the same family member C5 and F3 unify
  with `structure/block-missing`. Kind and presence are structure; only a present, correct-kind
  block's data shape is content.
