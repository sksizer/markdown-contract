> Question F3 for [[D-0014-markdown-structure-validation|D-0014]] — finding for a declared content
> anchor that resolves to no block. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into [proposed-shape.md](../proposed-shape.md) (§2–§4)
> at step H1.

# F3 · anchor binding (resolve / kind / position)

**Surfaced by:** [[15a-declared-anchor-absent|15a]].

## The question

A content-record binds a table to an anchor:

```ts
section("Decision", {
  content: { components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }) },
});
```

The contract now *requires* a block tagged `^components` under `## Decision`. The binding can fail
in three ways — the block is **absent**, **present but the wrong kind**, or
**present but in the wrong section** — and the question is which finding each fires, in which plane,
and at which `pos`.

This is the **declared** counterpart to F2: F2's `byAnchor("x") → undefined` is the *dynamic,
undeclared* lookup (no finding); F3 is the *contract-declared* binding that the document fails to
satisfy (a finding).

## Recommendation — the three-state anchor-binding model (all structural, per decision B)

Binding a slot to an anchor can fail three ways. Under decision **B** (a block's *kind* is a
tree-grammar property → structural, not schema), all three live in the **structure** plane and they
*gate* the content leaf — you can't validate a table's columns until you have a table:

| State | What happened | id | pos |
|---|---|---|---|
| **Absent** | no block carries `^components` | `structure/anchor-missing` | section heading |
| **Wrong kind** | `^components` resolves, but to a list / paragraph | `structure/block-kind` | the offending block |
| **Wrong position** | a `^components` table exists, but under another section | → `structure/anchor-missing` | section heading |

**Absent → `structure/anchor-missing`** (reuse, no new id). The declared `^anchor` doesn't resolve;
leaf-agnostic (resolution is one operation regardless of the bound leaf). Kept over
`anchor-unresolved`: it's an absence, and joins the `*-missing` family. `error`; the block is absent
so `pos` is the section heading (A2). Both declaration sites land here:

| Declared by | Example | Failure |
|---|---|---|
| section-level `anchor:` | `section("Summary", { anchor: "summary" })` | `^summary` resolves to no block |
| content-record `anchor:` | `content: { components: table({ anchor: "components" }) }` | `^components` resolves to no block |

**Wrong kind → `structure/block-kind`** (new). The anchor positively identifies a block, but it is
the wrong *kind* for the slot. Structural, **leaf-agnostic** (the check is `node.kind === expected`;
the expected kind rides in the message: `Expected a table at ^components, found a list`). `error`.
`pos` points at the **offending block** — here we have one. This *gates* the leaf: a non-table never
reaches table-column validation.

**Wrong position → just `structure/anchor-missing`.** Anchors are document-unique and a
content-record binding resolves *within its declaring section*, so a `^components` under the wrong
heading is simply not-found here. (A friendlier "exists but misplaced" hint would be a deferred
`structure/anchor-misplaced` at `warn` — nicety, not v1.)

### The structure-plane block/anchor family (with C5, reclassified)

C5's "section declares `content: table()`, has no table at all" is the **non-anchor** sibling and,
under B, also structural → `structure/block-missing`. The full family, all structure-plane:

| id | Fires when | Fix |
|---|---|---|
| `structure/anchor-missing` | a declared `^anchor` resolves to no block (addressing failure) | tag the right block with `^id` |
| `structure/block-missing` | a declared content slot has no block of the expected kind (C5) | add the block |
| `structure/block-kind` | an addressed block is present but the wrong kind | fix the block's kind |

The content plane keeps only *data-shape* checks (`content/table/column-missing`, `min-rows`,
`content/list/*`, `content/code/lang`). **§3 consequence:** a leaf helper (`table({columns})`) is no
longer "pure Zod" — it emits a **structural kind-gate** plus a **content Zod schema**.

## Decision

**Resolved (2026-06-19, decision B).** Anchor binding fails in three states, **all structural**
(block kind is a tree-grammar property; structure gates content): **absent** → reuse
`structure/anchor-missing` (leaf-agnostic; kept over `anchor-unresolved`; `pos` = section heading);
**wrong kind** → new **`structure/block-kind`** (leaf-agnostic; `node.kind === expected`, expected
kind in the message; `pos` = the offending block); **wrong position** → falls to
`structure/anchor-missing` (binding resolves within the declaring section; anchors are
document-unique). All `error`. Unifies with C5's reclassified **`structure/block-missing`** into one
structure-plane block/anchor family; content keeps only data-shape checks. **§3 fold (H1):** a leaf
helper emits a structural kind-gate + a content Zod schema (no longer "pure Zod").
