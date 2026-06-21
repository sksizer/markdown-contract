---
type: decision
schema_version: '1'
id: D-0003
status: open/accepted
title: Structure plane — a tree grammar over sections and block kinds
created: '2026-06-20'
related:
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - structure-plane
  - grammar
  - engine
  - sections
need_human_review: true
---
# Structure plane — a tree grammar over sections and block kinds

## Summary

- The body is validated by a combinator tree grammar — `sections` / `section` / `optional` / `oneOf`
  / `gap` with nested `children` — the one axis a schema language cannot express.
- Ordering and unknown-placement are independent knobs: `order` ∈ `none` | `recognized-relative` |
  `strict`, crossed with `allowUnknown`, with `gap({min,max})` locally admitting bounded extras.
- The structural **kind-gate** lives here: block presence and block kind are structure
  (`structure/block-missing`, `structure/block-kind`), gating the content leaf.
- Duplicate / collision findings are structural: `structure/duplicate-section`,
  `structure/key-collision`, plus the build-time `contract/key-collision` throw.
- Doctype tightness is expressed level-by-level — declare `children` where the shape is enumerated,
  `gap()` where it is open.

^summary

## Context

Section sequence and nesting — "these required sections, in this relative order, with optional gaps,
some interchangeably spelled" — is the one axis Zod's array vocabulary provably cannot express, and the
axis the corpus most needs validated. Murata's taxonomy makes the reason formal: regular tree grammars
and schema languages are *incomparable* — neither subsumes the other. So the structure plane is a tree
grammar, a distinct mechanism from the content plane's Zod, each doing only what it is the right tool
for.

## Decision

### The combinators

```ts
function sections<B>(opts: LevelOpts, specs: Spec[]): SectionSeq<B>;
function section(name: string | string[], opts?: SectionOpts): Spec;  // string[] = alias set
function optional(spec: Spec): Spec;
function oneOf(names: string[], opts?: SectionOpts): Spec;            // interchangeable spellings
function gap(opts?: { min?: number; max?: number }): Spec;           // permit unknown sections here

interface LevelOpts {
  order?: "none" | "recognized-relative" | "strict";   // default: "none"
  allowUnknown?: boolean;                               // default: true
}
interface SectionOpts {
  optional?: boolean;
  content?: LeafSpec | Record<string, LeafSpec>;       // the content-plane leaf (D-0004)
  children?: SectionSeq<any>;                          // nested subsequence (recursion)
  rules?: Rule[];                                       // node-local named rules
  anchor?: string;                                      // require a ^block-id
}
```

Nesting is `children` — a section's subsections are themselves a `sections(...)` sequence, so the grammar
recurses to any depth, each level at its own tightness. Alias sets are `oneOf(...)` (or `section([...])`):
one declared slot, several admissible spellings — the single home for the alias vocabulary the three
former code-side alias tables are deleted in favour of.

### Ordering × unknowns — two independent knobs

| `order` | recognized sections… |
|---|---|
| `"strict"` | in declared order, contiguous — no unknowns between them *unless* a `gap()` sits there |
| `"recognized-relative"` | in declared relative order; unknowns interleave freely (an implicit `gap()` between every position) |
| `"none"` | any order |

`allowUnknown` is the per-level default for positions with no marker; `gap()` *locally* admits unknown
sections regardless. So `allowUnknown: true` ⇒ unknowns everywhere; `allowUnknown: false` ⇒ unknowns only
at explicit `gap()` positions. The "definitive prefix, then extras" shape is the latter with one `gap()`:

```ts
sections({ order: "strict", allowUnknown: false }, [
  section("Title"), section("Overview"), section("Status"),
  gap(),                           // unknown/extra sections permitted only from here onward
  optional(section("Appendix")),   // still anchors after the gap
]);
```

`gap({ min, max })` bounds how many extras the window admits. A `gap()` carries **no** child-structure
expectation: to constrain a section's children you *declare* the section with `children:`. Defining
structure on something declared free-form is a contradiction, so `gap()` never grows a per-element schema
(G4).

### The structural kind-gate (C5, F3)

Block presence and block kind are structure, not content. The structure plane therefore emits, and
*gates* the content leaf with, the block/anchor family:

| id | Fires when |
|---|---|
| `structure/anchor-missing` | a declared `^anchor` resolves to no block |
| `structure/block-missing` | a declared content slot has no block of the expected kind (C5) |
| `structure/block-kind` | an addressed block is present but the wrong kind (F3) |

A non-table never reaches table-column validation — the content leaf ([[D-0004-content-plane]]) runs only
after the kind-gate passes.

### Duplicates and key collisions (F4)

| id | Fires when |
|---|---|
| `structure/duplicate-section` | two sibling sections share the exact same heading |
| `structure/key-collision` | two sibling sections have distinct headings that collapse to the same camelCase key (error) |
| `contract/key-collision` | two *declared* names collide in camelCase — a build-time throw, caught at definition time |

These guarantee the dual-key invariant the typed model ([[D-0005-consumption-oom]]) relies on: within a
sibling scope every exact name and every camelCase key is unique.

### Doctype tightness, level by level (G2, G4)

A doctype is modelled at its own tightness per level: tight where it enumerates (declared `section`s with
`children`, e.g. a milestone's `Deliverables` H3 categories or a skill's fixed sub-sections), `gap()`
where it is open. Optional sections are `optional(section(...))` (G2); presence is declared, not inferred.

## Why

- **A tree grammar, not Zod, for sequence and nesting.** Murata: schema languages and regular tree
  grammars are incomparable. Forcing Zod to express "required sub-schemas in order with optional gaps over
  a flat sibling sequence" is the exact thing it cannot do, and its issue paths cannot carry `<path>:<line>`
  without a position-carrying projection. The grammar is the right expressiveness class; Zod stays at the
  leaves.
- **Kind is structure because kind is a tree-grammar property.** Whether a slot holds a table or a list is a
  shape-of-the-tree question, decided before any data-shape question. Putting the kind-gate in the structure
  plane lets it *gate* content cleanly and keeps the content plane purely about data.
- **Two independent knobs, not one ordering mode.** Separating `order` from `allowUnknown` (with `gap()` as
  the local override) is what lets a strict prefix coexist with an open tail — the real corpus shape — without
  a bespoke per-doctype mode.

## Consequences

- `validateBody` and the standalone H2 walkers retire; the body is one grammar over the projection.
- The three drifting code-side alias tables collapse into `oneOf` / alias sets declared once in the contract.
- The dual-key invariant is *enforced* (not assumed) by `structure/duplicate-section` and
  `structure/key-collision`, so the typed model's keys are guaranteed unique within a scope.
- Doctype authors must choose, per level, between declaring `children` and leaving a `gap()` — which makes a
  doctype's intended tightness explicit and inspectable.

## Open questions

- The leaf-set-v1 boundary (which structural kind-gates ship v1 vs defer) is shared with
  [[D-0004-content-plane]] (the S6 spike); the structure-plane share is confirming the kind-gate firing
  positions over the real corpus's heterogeneous, gap-laden doctypes.

## References

- [[C-0005-two-plane-contract-engine]] — the capability this plane realizes.
- [[D-0001-finding-model]] — the `structure/*` finding shape emitted here.
- [[D-0002-projection-and-dialect]] — the `SectionNode` / `BlockNode` substrate the grammar reads.
- [[D-0004-content-plane]] — the content leaf the kind-gate gates.
- [[D-0005-consumption-oom]] — the dual-key model the collision findings guarantee.
- `provenance/d0014/questions/B1-section-missing.md`, `B2-duplicate-and-cross-alias.md`,
  `B3-unpermitted-unknown-section.md`, `B4-gap-count.md`, `B5-multi-section-disorder.md` — section grammar semantics.
- `provenance/d0014/questions/C5-missing-block-gap-content.md` — `structure/block-missing` (the kind-gate non-anchor sibling).
- `provenance/d0014/questions/F3-anchor-unresolved.md` — the kind-gate / block-anchor family.
- `provenance/d0014/questions/F4-camelcase-collision.md` — duplicate / key-collision findings.
- `provenance/d0014/questions/G2-optional-today.md`, `G4-milestone-skill-tightness.md` — doctype tightness.
- `provenance/d0014/proposed-shape.md` §3 — the contract API, ordering and unknown sections.
