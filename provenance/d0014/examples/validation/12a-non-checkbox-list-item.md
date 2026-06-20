> Example 12a for [[D-0014-markdown-structure-validation|D-0014]] — Non-checkbox AC item.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 12a · Non-checkbox AC item

## Capability

Edge case on **12** (`section({ content: list({ everyItem: "checkbox", minItems }) })` — a list
content leaf that requires every item to be a checkbox). 12 shows an Acceptance criteria list
where every bullet is a `- [ ]`/`- [x]` task item. 12a stresses the **`everyItem: "checkbox"`
predicate failing on a single bullet**: the list mixes proper checkbox items with one plain
`- bare bullet`, so the leaf — a Zod schema compiled over the projected `list` node — must emit
a list finding localized to the offending item. This is the "24 non-checkbox ACs" class of bug:
a list that is mostly tasks but quietly contains prose bullets that no one will ever check off.
No new API surface — the same one-section contract as 12 — just the per-item-predicate failure.

## Use case

A task-shaped markdown class with a `## Acceptance criteria` section whose every bullet must be a
checkbox, so each criterion is individually trackable to done. The author writes mostly checkbox
items but slips in a plain narrative bullet (a note, a caveat, a heading-like line) that reads
fine to a human but breaks the "every AC is checkable" invariant. The contract must flag the
non-checkbox bullet and point at its line, leaving the conforming items unflagged.

## Sample document

```md
## Acceptance criteria

- [ ] Parser pins `remark-gfm` so pipe tables project as `table` nodes
- [x] Frontmatter and body validate in a single pass
- bare bullet describing context that is not actually a checkable criterion
- [ ] Findings carry a `SourcePos` so each localizes to `<file>:<line>`
```

## Proposed contract

```ts
import { contract, sections, section, list } from "markdown-contract";

// Same contract as 12: one required Acceptance criteria section whose items are all checkboxes.
export const AcceptanceContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }),
    }),
  ]),
});
```

## Expected findings

**PASS** — every bullet is a checkbox and the list clears `minItems`:

```md
## Acceptance criteria

- [ ] Parser pins `remark-gfm` so pipe tables project as `table` nodes
- [x] Frontmatter and body validate in a single pass
- [ ] Findings carry a `SourcePos` so each localizes to `<file>:<line>`
```

```ts
const { findings, value } = AcceptanceContract.validate(source, { path });
// findings === []
// value === { frontmatter: undefined, body: { acceptanceCriteria: { /* SectionView */ } } }
```

A consumer reads the list through the typed OOM facade:

```ts
value.body.acceptanceCriteria.lists[0];        // ListView over the three items
value.body["Acceptance criteria"];             // same SectionView (exact key)
```

**FAIL** — the sample document above (one plain `- bare bullet` among three checkbox items):

```ts
AcceptanceContract.validate(source, { path: "docs/tasks/T-XXXX.md" }).findings;
```

```jsonc
[
  { "id": "content/every-item", "level": "error",
    "path": "docs/tasks/T-XXXX.md", "pos": { "line": 4 },
    "message": "Acceptance criteria item is not a checkbox (everyItem: \"checkbox\")" }
]
```

Exactly one finding. `pos.line` points at line 4 — the `- bare bullet`, the single item that
fails the `everyItem: "checkbox"` predicate; the three real checkbox items are unflagged, and
`minItems: 1` is satisfied (four items present), so no `minItems` finding fires. Level is
`error`: contract data, not a call-site choice.

## Gaps & questions

The contract and OOM access use only documented API. Two things are under-specified by
proposed-shape.md rather than contradicted, so they read as open questions:

- **The finding id for a list-leaf (Zod) failure is not enumerated.** §3 lists
  `list({ everyItem, minItems })` and says each leaf "compiles to a Zod schema over a projected
  node", but no example shows a body list leaf failing, and the only enumerated leaf-failure id
  is `frontmatter/enum` (§5.3, a frontmatter-plane failure). `content/every-item` mirrors that
  shape and the `structure/*` namespace convention, but is inferred, not documented. A blanket
  `content/zod` id (carrying the raw Zod issue message) is the alternative.
  - Proposed delta: add a finding-id row pinning the canonical id for each list leaf —
    `content/every-item` for the `everyItem` predicate (with the failing item's line) and
    `content/min-items` for `minItems` — or document `content/zod` as the umbrella id for every
    leaf failure and define how the leaf's Zod issue maps onto the node's `pos.line`.
  - Open question for human review: per-predicate ids (`content/every-item`, `content/min-items`)
    for machine-routable diagnostics, or one `content/zod` id deferring wording to the Zod issue?
    Couples to S7's open question on how Zod `issues[].path` remaps onto the projection node.

- **Per-item `pos` resolution for a whole-list leaf is not specified.** `list({...})` is a single
  Zod schema over the *list* `BlockNode` (which carries one `pos`), yet the useful diagnostic
  points at the offending *item's* line (line 4), not the list's start (line 3). The `ListItem`
  shape in the projection is referenced (`items: ListItem[]`) but its fields — including whether
  each item carries its own `SourcePos` — are not given in §2.
  - Proposed delta: specify `ListItem` as `{ checkbox: boolean | null; text: string; pos:
    SourcePos }` so a list leaf can map a per-item Zod issue back to that item's line.
  - Open question for human review: should the leaf framework expose per-item positions to leaf
    Zod schemas (so `everyItem` can localize to the bad item), or do whole-list leaves always
    report at the list's `pos` and rely on the message to name the offending item?
