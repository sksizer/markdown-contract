---
type: decision
schema_version: '1'
id: D-0017
status: open/accepted
title: Repeatable sections — a declared heading may recur as peers, surfaced as a collection
created: '2026-07-04'
related:
  - '[[D-0003-structure-plane]]'
  - '[[D-0005-consumption-oom]]'
tags:
  - repeatable-sections
  - structure-plane
  - oom
  - grammar
need_human_review: true
---
# Repeatable sections — a declared heading may recur as peers, surfaced as a collection

## Summary

- A section slot may be declared **repeatable** — `section(name, { repeatable: true })` (plus optional `min` / `max`) — so a heading legitimately recurs as peers at one level (a per-entry `## Entry`, a changelog's `## Release`, a per-day `## Schedule`).
- The construct is a flag on the existing `SectionOpts`, threaded through the same `SectionOpts` → `Slot` → `optsFor` machinery `optional` / `content` / `children` already ride — **not** a separate `each()` node.
- A repeatable slot **suspends the per-level-uniqueness rule (D-0003) for its own peers**: its exact repeats emit no `structure/duplicate-section`, and its key-colliding variants emit no `structure/key-collision`. A repeated heading that is **not** declared repeatable still errors — no change to the default.
- The consumption model (D-0005) binds a repeatable slot's dual-key key to a **positional array** of the per-occurrence value — `SectionView[]`, or a promoted `TableView<Row>[]` when the slot's sole content is a `table(...)` leaf — in document order. `.section(name)` still returns the first occurrence's `SectionView`.
- `min` / `max` bound the occurrence count; a present slot outside its bounds is a new error-level `structure/repeat-count`. Malformed bounds (`min`/`max` without `repeatable`, `min > max`) are a build-time `contract/repeat-bounds` throw.

^summary

## Context

D-0003's structure plane enforces per-level heading-key uniqueness: two sibling sections with the exact same heading are `structure/duplicate-section`, and two distinct headings collapsing to the same camelCase key are `structure/key-collision` — both error-level. This is what guarantees D-0005's dual-key invariant: within one sibling scope every exact name and every generated key resolves to exactly one `SectionView`.

But some documents legitimately want a section to recur as peers — a list-of-entries shape where the *heading* is the record delimiter (`## Entry` … `## Entry` … `## Entry`). Today every such document is invalid by construction, and the config inferer (`init`) cannot emit a faithful contract for one: it would have to produce a contract that fails its own accept-by-construction self-check. This was surfaced by T-KCOL as the inverse of the collision it guards against. We need a first-class way to say "this heading may recur," validated and typed, without weakening the uniqueness rule for every other section.

## Decision

### The construct — a flag on `SectionOpts`, not a new node

Repeatability rides on the existing `SectionOpts`:

```ts
interface SectionOpts {
  optional?: boolean;
  content?: LeafSpec | Record<string, LeafSpec>;
  children?: SectionSeq;
  rules?: Rule[];
  anchor?: string;
  repeatable?: boolean;   // this heading may recur as peers at one level
  min?: number;           // minimum occurrence count (requires repeatable)
  max?: number;           // maximum occurrence count (requires repeatable)
}

section("Entry", { repeatable: true });
section("Release", { repeatable: true, min: 1, content: table({ columns: ["Version", "Date"] }) });
```

We chose the flag over a dedicated `each()` / `each:` grammar node deliberately:

- **Consistency.** `optional`, `content`, `children`, `anchor`, and `rules` are already `SectionOpts` knobs on one `section()` slot; repeatability is another property of the *same* slot, not a different kind of node. Authors declare it exactly where they declare everything else about the section.
- **Minimal disruption.** The matcher already resolves each `Spec` to a `Slot` and each heading to its `SectionOpts` via `optsFor`; the model already keys declared slots into the dual-key group. A flag threads through both unchanged — `slotsOf` copies `repeatable` / `min` / `max` onto the `Slot`, `optsFor(seq, name)?.repeatable` tells the model a slot is a collection. A new node kind would have forced a second code path through the ordering walk, the collision guards, the OOM partition, and the declarative compiler.
- **Typing falls out.** `section()` already infers `SectionValue<O>` onto the spec's phantom; wrapping that base value in `[]` when `O extends { repeatable: true }` is a one-line refinement that flows through `sections()` → `BodyOf` → `Infer` with no new machinery.

### Structure plane — peers admitted, uniqueness preserved elsewhere

A heading matching a declared repeatable slot is exempt from the two uniqueness findings: exact repeats emit no `structure/duplicate-section`, and a key-colliding spelling of a repeatable slot emits no `structure/key-collision`. Every other heading keeps D-0003's behavior exactly. Concretely:

- **Slot filling.** All occurrences of a repeatable heading fill the *one* slot, so a present collection never trips `structure/section-missing`; a required repeatable slot that is entirely absent is still `structure/section-missing` (its absence, not its count).
- **Ordering.** Consecutive repeats do not misfire `structure/section-order`. Under `order: strict` the matcher stays on the repeatable slot's cursor, consuming consecutive matching peers without advancing past it, and a filled repeatable slot behaves like a satisfied slot when a later slot arrives. Under `recognized-relative` a repeat of the current slot is in declared order by construction. `order: none` needs no change (and is what the inferer emits).
- **Bounds.** `min` / `max` bound the occurrence count of a *present* slot; below `min` or above `max` is `structure/repeat-count` (error-level, registered beside the other `structure/*` defaults). Bounds are only meaningful on a repeatable slot and `min ≤ max` — a violation is caught at contract-build time as `contract/repeat-bounds` (a `ContractBuildError`, mirroring the existing `contract/key-collision` throw).

### Consumption OOM — a positional array under the dual-key keys

The typed model change to D-0005: a declared repeatable slot binds its dual-key keys (exact heading text + generated lowerCamelCase alias) to an **array** of the per-occurrence value, collected in document order:

```ts
// section("Entry", { repeatable: true })
doc.body.entry        // SectionView[]      — doc.body["Entry"] is the same array
doc.body.entry[0]     // SectionView        — positionally indexable, typed by the inner shape
doc.body.section("Entry")  // SectionView   — still the FIRST occurrence (byExact first-wins)

// section("Release", { repeatable: true, content: table(...) })
doc.body.release      // TableView<Row>[]   — each element the promoted table, mirroring the
                      //                       sole-content:table() promotion (D-0005 §6)
```

Each element is the same value a non-repeatable slot would bind — a `SectionView`, or the promoted `TableView` when the slot's sole `content` is a `table(...)` leaf. A non-repeatable slot binds a single value, unchanged. The array flows only through the model; the projection (`tree`) is untouched, and the model stays a lazy, additive facade the validator never depends on (D-0005).

### Declarative DSL & the inferer

The YAML body DSL accepts `repeatable: true` (plus numeric `min` / `max`) on a section node, type-checked with `DeclarativeError`; the semantic bound checks stay the engine's `contract/repeat-bounds` throw. The `init` inferer emits a repeatable slot when a heading appears as exact-duplicate peers (the same spelling ≥ 2 times) within any single doc, so the generated contract passes its own accept-by-construction self-check instead of erroring on `structure/duplicate-section`. The existing T-KCOL variant-collision handling (distinct spellings colliding on a key) is unchanged — repeatable is only for exact-duplicate peers; the inferer does not emit `min` / `max`.

## Why

- **The uniqueness rule is right by default and wrong only where declared.** D-0003's per-level uniqueness is what makes the dual-key model trustworthy; weakening it globally would break every non-repeatable section. Scoping the exemption to *declared* repeatable slots keeps the guarantee everywhere it is not explicitly waived.
- **A collection is the honest type for repeated peers.** If a heading can appear N times, the only faithful model is an N-length array. Keying it under the same dual-key keys (rather than inventing subfield keys) keeps navigation uniform with every other section — `doc.body.<slot>` still reaches the section(s), now as a list.
- **Accept-by-construction stays intact.** Making repeated peers a first-class, validated shape is exactly what lets the inferer produce a runnable contract for a document class it previously could only reject.

## Consequences

- The dual-key invariant now reads: within a sibling scope, every exact name and every generated key resolves to exactly one value — a single `SectionView` / `TableView` for a normal slot, or one array for a repeatable slot. `SectionGroup`'s index signature admits `SectionView[]` and `TableView[]` accordingly.
- `structure/repeat-count` joins the `structure/*` family (error-level); `contract/repeat-bounds` joins `contract/key-collision` as a build-time throw.
- The model change is additive and back-compatible: a contract that declares no repeatable slot produces byte-identical findings and an identical typed model to before.
- Nested/recursive repeatable structures and inferred `min` / `max` are out of scope here — the single-level flag lands first; deeper nesting can follow on the same `SectionOpts` construct.

## References

- [[D-0003-structure-plane]] — the per-level-uniqueness rule (`structure/duplicate-section`, `structure/key-collision`) this decision scopes an exemption into, and the `structure/*` finding family `structure/repeat-count` joins.
- [[D-0005-consumption-oom]] — the dual-key typed model this decision extends with the positional-array binding for a repeatable slot.
- `provenance/d0014/proposed-shape.md` §3 (contract / ordering) and §6 (the typed model, table promotion) — the surfaces the flag and the array binding thread through.
