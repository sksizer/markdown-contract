> Example 21a for [[D-0014-markdown-structure-validation|D-0014]] — Table inside a blockquote
> / list item. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 21a · Table inside a blockquote / list item

## Capability

A layer-1 projection edge, not a new API knob. Builds on step 21 (a third real entity contract —
Milestone deliverables with H3 categories, or SKILL.md house-style) by placing a section's pipe
table *inside a blockquote* (`> | … |`) or a list item, rather than at the section's top level. The
pin: §2's `BlockNode` union is `table | list | code | paragraph`, each a *section-level* block in
`SectionNode.blocks`; there is no `blockquote` or `listItem` kind, and no rule for whether a table
nested inside one is hoisted to a section-level `table` BlockNode or left embedded where the `table`
leaf never sees it. §7 (S6) names this exact edge — "tables inside blockquotes/list items" — as
deferred. So the contract is writable, but its behaviour on this input is undecided.

## Use case

A Milestone (or SKILL.md) section whose deliverables table an author indented under a bullet, or
quoted inside a `>` callout — a common accident when a table is pasted into a list item or a
note-block, or when a formatter wraps example content in a blockquote. The contract declares the
section's content as `table({ columns: … })`; the question is whether the projection surfaces the
nested table as that section's `table` BlockNode (so the leaf validates it) or leaves it buried in a
blockquote/list subtree the §2 union has no node for — in which case the section reads as having
*no* table and the leaf fails for the wrong reason.

## Sample document

```md
## Deliverables

> | Item        | Status |
> | ----------- | ------ |
> | Engine      | done   |
> | Dialect ext | done   |
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

export const MilestoneContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Deliverables", {
      content: table({ columns: ["Item", "Status"], minRows: 1 }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the same table at section top level (not quoted, not indented under a bullet). It
projects to a `table` BlockNode directly in `Deliverables.blocks`, and the
`table({ columns, minRows: 1 })` leaf validates it against two body rows:

```md
## Deliverables

| Item        | Status |
| ----------- | ------ |
| Engine      | done   |
| Dialect ext | done   |
```

```jsonc
// MilestoneContract.validate(source, { path: "docs/.../milestone.md" })
{ "findings": [],
  "value": { "frontmatter": undefined,
             "body": { "deliverables": { /* SectionView; .table is the 2-row TableView */ } } } }
```

**FAIL** — the Sample document above (the table quoted inside a `>` blockquote). The *intended*
finding is that the section's declared table is unreachable because it sits in a blockquote the
projection does not flatten to a section-level `table` BlockNode:

```jsonc
// MilestoneContract.validate(source, { path: "docs/.../milestone.md" }).findings
[
  { "id": "structure/table-missing", "level": "error",
    "path": "docs/.../milestone.md", "pos": { "line": 1 },
    "message": "‘Deliverables’ declares a table but none is present at section level" }
]
```

But this outcome is **not pinned**, and `structure/table-missing` is **invented here** — no finding
id, level, or message for a content leaf that finds *no* matching block appears in
proposed-shape.md. Two undecided behaviours compound:

- If the projection *hoists* the blockquoted/listed table into `Deliverables.blocks` as a `table`
  BlockNode (flattening the wrapper), the leaf matches and the document **passes silently** — the
  same `value` as PASS — masking the fact the table was authored inside a callout.
- If the projection leaves the table embedded inside a `blockquote`/`listItem` subtree (the §2 union
  has no node for either), `Deliverables.blocks` holds no `table` BlockNode at all; the `table` leaf
  has nothing to bind to, and the failure mode (a thrown error? a `paragraph` BlockNode of the raw
  pipe text? a documented finding?) is unspecified.

Neither outcome is decided, so the FAIL findings list above is a *proposal*, not a guarantee.

## Gaps & questions

The contract is expressible with documented API (byte-identical in shape to step 10's table leaf),
but the projection's treatment of a table nested in a blockquote or list item is undefined — exactly
the S6 edge §7 defers. The relevant gaps:

- **Gap — no projection rule for wrapped blocks.** §2's `BlockNode` union
  (`table | list | code | paragraph`) has no `blockquote` or `listItem` kind, and §2 does not say
  whether a `table` (or `list`/`code`) inside a blockquote or list item is hoisted to
  `SectionNode.blocks` or stays in a subtree the union cannot represent. mdast nests such a table
  under a `blockquote`/`listItem` parent, so the projection must choose to flatten, drop, or
  downgrade it.
  - Proposed delta: pin one rule in §2 — a `table`/`list`/`code` whose nearest block ancestor is a
    `blockquote` or `listItem` is **not** promoted to a section-level `BlockNode`; it remains
    addressable only as flattened text via `SectionView.text()`. Add a documented
    `structure/table-missing` (`error`) carrying the section heading's `SourcePos` for a declared
    table leaf with no section-level table to bind.
- **Gap — content-leaf "no matching block" failure id is unstated.** §3's `table`/`list`/`code`
  leaves describe shape checks (columns, minRows, …) but never the case where the section has *no*
  block of the leaf's kind. §5.3 enumerates `structure/anchor-missing` and `structure/section-order`
  but no "declared content absent" id. The FAIL case here infers `structure/table-missing`.
  - Proposed delta: add a finding-id registry row pinning `structure/table-missing` (and siblings
    `structure/list-missing`, `structure/code-missing`) as the canonical ids for a content leaf that
    finds no matching section-level block.
- **Open question for human review** — should a table authored inside a blockquote/list item be a
  hard `error` (reject — the table is not where the contract can see it), a `warn` that still
  flattens and validates it (tolerate the wrapper), or silently hoisted (no finding)? The "reject"
  reading keeps section structure honest; the "hoist" reading is forgiving of formatter accidents.
  S6 decides, and the choice also governs the symmetric `list`/`code` cases.
