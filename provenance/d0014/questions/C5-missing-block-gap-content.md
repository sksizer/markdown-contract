> Question C5 for [[D-0014-markdown-structure-validation|D-0014]] — a declared leaf with no matching
> block, and per-admitted-section content. Part of the open-decision review (see
> ../review-checklist.md). Non-normative; records the decision, folded into proposed-shape.md at H1.

# C5 · missing block + gap content

**Surfaced by:** [[21-real-milestone-or-skill-doctype|21]], [[21a-table-inside-blockquote-or-list|21a]].

## Part 1 — a declared content leaf finds no matching block

`section("Files", { content: table({...}) })` says the section's content *is* a table. If the
section exists but has **no table** (just prose, or — per 21a — a table buried in a blockquote that
the projection doesn't surface as a section-level block), the slot's expected block kind is absent.

**Recommend: `structure/block-missing`** (leaf-agnostic), **not** a per-leaf `content/*` id.
*Reopened 2026-06-19 (F3 decision B):* a block's *kind/presence* is a **tree-grammar** property
(structure), not a schema one — the content plane owns only the *data inside* a correctly-kinded
block. So "no table-kind block at this slot" is structural. One id spans every leaf (the expected
kind rides in the message: `Expected a table in "Files"; none found`); `error`; `pos` = the section
heading (A2 — the absent block has no node). This *sharpens* the plane boundary:
`structure/block-missing` (no table) vs `content/table/column-missing` (a column within a *present*
table is absent) is now a clean cross-plane contrast — skeleton vs data.

## Part 2 — constraining gap()-admitted sections

Case 21: under a `gap()` window, can you assert each admitted unknown subsection has some shape
(e.g. "every free-named H3 must be a checkbox list")?

**Recommend: steer it to a parent `rule()`; do *not* add `{ each }` to `gap()` (v1).** `gap()` is a
positional window marker — its job is "unknowns permitted here." Giving it a per-element content
spec grows it into a mini content-model (a marker sprouting a sub-language — the exact scope-creep
D-0014 guards against). If you need to constrain admitted sections, a node-level `rule()` that walks
`node.sections` does it cleanly today. `gap({ each })` stays a *possible future sugar* if the
pattern proves common — not v1.

## Decision

**Resolved (2026-06-19; Part 1 revised same day per F3 decision B).** **Part 1:** a declared content
leaf with no matching block → **`structure/block-missing`** (leaf-agnostic, `error`), `pos` = the
section heading (A2). Block *kind/presence* is structural (tree grammar); the content plane keeps
only data-shape checks, so `content/table/column-missing` (a column within a *present* table)
contrasts cleanly across the plane line. **Part 2:** per-admitted-section content goes to a parent
`rule()` walking `node.sections`; `gap()` gets **no `{ each }`** in v1 — it stays a bare positional
marker (`{ each }` is possible future sugar). Fold into proposed-shape.md at H1 (block presence/kind
move into the structure plane; a leaf helper emits a structural kind-gate + a content Zod schema).
