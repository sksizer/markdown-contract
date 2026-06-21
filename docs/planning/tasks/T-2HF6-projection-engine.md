---
type: task
schema_version: '5'
id: T-2HF6
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped `parse()` -> a positioned DocTree on remark-parse + remark-gfm + remark-frontmatter, with the Obsidian dialect (anchors + wikilinks) sourced in-house — resolving D-0002. Invariants D2-D4 hold and structure/heading-depth-jump is emitted. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0004-dialect-aware-projection]]'
- '[[D-0002-projection-and-dialect]]'
depends_on:
- '[[T-9XB3-test-harness-and-fixtures]]'
tags:
- projection
- parsing
- obsidian
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Implement the projection — one parse into a positioned DocTree, GFM + invariants, and the resolved Obsidian dialect

## Goal

Implement `parse()` → `DocTree` (`C-0004` / `D-0002`): the single substrate every other
component reads. The base projection is dialect-aware out of the box — GFM tables / lists and
`^block-id` anchors are always on, and the Obsidian `[[wikilink]]` / `![[transclusion]]` dialect
ships bundled and enabled by default (`opts.extensions` is additive for further dialects). This
task also resolves the one open decision in the corpus — the *sourcing* of that bundled dialect
(`D-0002`: build in-house vs adopt). Everything downstream is blocked on a stable, positioned
tree, so this lands first among the implementation tasks.

## Today

`parse` is a stub; no parser dependencies wired.

| Location | Role today |
|---|---|
| `src/core/projection.ts` | `parse` stub (from `T-4QM9`) |
| `src/core/types.ts` | `DocTree` / `SectionNode` / `BlockNode` / `ListItem` / `SourcePos` declarations |
| `tests/fixtures/` | Projection fixtures, skipped, awaiting this task |
| `provenance/d0014/research/landscape.md` | The prior build-vs-adopt sweep for the dialect arm |

## Proposed

`src/core/projection.ts` implements `parse()`: unified/remark + `remark-gfm` ^4 +
`remark-frontmatter` → a positioned section tree (`SectionNode` / `BlockNode` / `ListItem`,
each with a `SourcePos`), position-aware frontmatter exposing `lineForPath`, and the raw
`tree.mdast` retained. The three committed invariants hold (fence opacity; no depth-jump
synthesis, emitting the `structure/heading-depth-jump` signal; no hoisting). The base projection
bundles GFM + `^block-id` anchors + the Obsidian wikilink / transclusion dialect on by default
(`opts.extensions` is additive for further dialects); `^block-id` anchors bind to their blocks.
The bundled dialect is *sourced* per the arm chosen by resolving `D-0002`. The projection fixtures
are un-skipped and green.

## Approach

1. **Resolve the `D-0002` sourcing spike first** (build vs adopt the *bundled* wikilink /
   transclusion dialect — not whether it ships by default, which is settled): prototype both arms
   over the corpus (in-house `micromark-extension-obsidian` vs adopt-a-wikilink/OFM-plugin +
   in-house `^block-id`), prove `parse → render → git diff` clean, pick one, and record the
   outcome on the ADR (move it off `open`).
2. Implement the mdast → projection pass: nest flat headings into sections, flatten table
   cells to strings, attach a `SourcePos` to every node, retain `tree.mdast`.
3. Implement position-aware frontmatter parsing + `lineForPath`.
4. Implement the base projection bundling GFM + `^block-id` anchors + the Obsidian dialect on by
   default (sourcing the dialect per the chosen arm); `^block-id` anchors resolve to
   `BlockNode.anchor` / `SectionNode.anchors`; keep `opts.extensions` additive.
5. Enforce the invariants (fence opacity, depth-jump attach + warn signal, no hoisting).
6. Un-skip and green the projection fixtures.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/projection.ts` | modify | Implement `parse()` → `DocTree` |
| `src/core/dialect/` | new | The bundled (default-on) Obsidian dialect parser/adapter, sourced per the resolved `D-0002` arm |
| `package.json` | modify | Add `remark` / `remark-gfm` / `remark-frontmatter` (+ dialect deps) |
| `tests/fixtures/` | modify | Un-skip the projection fixtures |

## Acceptance criteria

- [x] AC-1: `parse()` returns a `DocTree` of nested `SectionNode`s, `BlockNode`s, and
  `ListItem`s, each carrying a `SourcePos`.
- [x] AC-2: `remark-gfm` tables/lists project to `table` / `list` `BlockNode`s **out of the box**
  (base, no config); `tree.mdast` is retained and exposed.
- [x] AC-3: The three invariants hold, each covered by a fixture — fence opacity; a depth jump
  attaches to the nearest ancestor and emits `structure/heading-depth-jump`; no hoisting of
  blockquote / list-item blocks.
- [x] AC-4: `frontmatter.lineForPath(path)` maps a key path to its source line.
- [x] AC-5: `^block-id` anchors are base (always on); `[[wikilinks]]` and `![[transclusions]]`
  parse via the **default-on** bundled dialect (sourced per the resolved `D-0002` arm);
  `opts.extensions` adds further dialects without re-enabling the defaults.
- [x] AC-6: The `D-0002` dialect-*sourcing* decision (build vs adopt) is resolved and recorded on
  the ADR (status moved off `open/proposed` with the chosen arm and a round-trip proof).
- [x] AC-7: The projection fixtures are un-skipped and green.

## Out of scope

- Structure-grammar and content-leaf validation (the two plane tasks).
- The typed consumption model and the CLI.
- Any document repair / normalization.

## Dependencies

- Needs the harness + stubs from `[[T-9XB3-test-harness-and-fixtures]]`.
- Resolving the `D-0002` bundled-dialect sourcing spike (build vs adopt) is the first step of this task.
