> Consumption case 01 for [[D-0014-markdown-structure-validation|D-0014]] — the `read()` door.
> Exercises proposed-shape.md §6; non-normative; where they disagree, that doc wins.

# 01 · The `read()` door

## Affordance

`Contract.read(source, ctx)` — the model-only door (§6). It returns the typed `doc` when the
document is valid, or throws `ContractError` when an `error`-level finding exists (F1). This is the
smallest consumer: validate-and-read in one call, then reach a section.

## Consumes

[v01 — single required section](../validation/01-single-required-section.md): one required
`section`, its sample document, and the contract that passes it. This tier adds only the consumer
code.

```ts
// from v01 (reused verbatim)
export const OverviewContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [ section("Overview") ]),
});
```

```md
## Overview

A one-paragraph summary of the thing.
```

## Consumer code + expected reads

```ts
const doc = OverviewContract.read(source, { path });   // throws ContractError on error-level (F1)

const ov = doc.body.overview;          // SectionView — dotted camelCase of "Overview"
ov.name;                               // "Overview"
ov.pos;                                // { line: 1 } — the heading's SourcePos
ov.text();                             // "A one-paragraph summary of the thing."
```

`read()` is the **happy-path door**: it presupposes validity (the validator already passed, OOM is
additive), so the consumer gets `doc` directly with no findings to thread. The error door
(`ContractError`) is case [10](./10-contracterror-door.md); the findings-and-doc door (`validate`)
is case [02](./02-validate-doc-and-tree.md).

## Gaps & open consumption decisions

- **U4 (`text()` flattening).** `ov.text()` returns the section's prose — but the contract for
  "prose only vs including a table/list's text, this section vs nested subsections" is unstated.
  Pinned in case 04. Here the section has a single paragraph, so the answer is unambiguous.
- **U7 (`doc` root surface).** This case uses only `doc.body.*`; whether `doc` also exposes
  `doc.byAnchor` / positions / iteration is deferred to cases 02 and 07.
- Everything else here (`read()`, dotted-key `SectionView`, `name`/`pos`/`text()`) is documented §6.
