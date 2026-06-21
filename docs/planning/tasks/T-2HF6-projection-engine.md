---
type: task
schema_version: '5'
id: T-2HF6
status: open/ready
created: '2026-06-20'
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
component reads. This includes resolving the one genuinely open decision in the corpus — the
Obsidian dialect build-vs-adopt spike (`D-0002` Option A vs B) — and delivering the chosen
path for `^block-id`, `[[wikilink]]`, and `![[transclusion]]`. Everything downstream is
blocked on a stable, positioned tree, so this lands first among the implementation tasks.

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
synthesis, emitting the `structure/heading-depth-jump` signal; no hoisting). The Obsidian
dialect is parsed via the arm chosen by resolving `D-0002`, with `^block-id` anchors binding
to their blocks. The projection fixtures are un-skipped and green.

## Approach

1. **Resolve the `D-0002` spike first**: prototype both arms over the corpus (in-house
   `micromark-extension-obsidian` vs adopt-a-wikilink/OFM-plugin + in-house `^block-id`),
   prove `parse → render → git diff` clean, pick one, and record the outcome on the ADR
   (move it off `open`).
2. Implement the mdast → projection pass: nest flat headings into sections, flatten table
   cells to strings, attach a `SourcePos` to every node, retain `tree.mdast`.
3. Implement position-aware frontmatter parsing + `lineForPath`.
4. Implement the dialect per the chosen arm; `^block-id` anchors resolve to `BlockNode.anchor`
   / `SectionNode.anchors`.
5. Enforce the invariants (fence opacity, depth-jump attach + warn signal, no hoisting).
6. Un-skip and green the projection fixtures.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/projection.ts` | modify | Implement `parse()` → `DocTree` |
| `src/core/dialect/` | new | The Obsidian dialect parser/adapter per the resolved `D-0002` arm |
| `package.json` | modify | Add `remark` / `remark-gfm` / `remark-frontmatter` (+ dialect deps) |
| `tests/fixtures/` | modify | Un-skip the projection fixtures |

## Acceptance criteria

- [ ] AC-1: `parse()` returns a `DocTree` of nested `SectionNode`s, `BlockNode`s, and
  `ListItem`s, each carrying a `SourcePos`.
- [ ] AC-2: `remark-gfm` tables/lists project to `table` / `list` `BlockNode`s; `tree.mdast`
  is retained and exposed.
- [ ] AC-3: The three invariants hold, each covered by a fixture — fence opacity; a depth jump
  attaches to the nearest ancestor and emits `structure/heading-depth-jump`; no hoisting of
  blockquote / list-item blocks.
- [ ] AC-4: `frontmatter.lineForPath(path)` maps a key path to its source line.
- [ ] AC-5: `^block-id` anchors, `[[wikilinks]]`, and `![[transclusions]]` parse into the
  projection per the resolved `D-0002` arm.
- [ ] AC-6: The `D-0002` build-vs-adopt decision is resolved and recorded on the ADR (status
  moved off `open/proposed` with the chosen arm and a round-trip proof).
- [ ] AC-7: The projection fixtures are un-skipped and green.

## Out of scope

- Structure-grammar and content-leaf validation (the two plane tasks).
- The typed consumption model and the CLI.
- Any document repair / normalization.

## Dependencies

- Needs the harness + stubs from `[[T-9XB3-test-harness-and-fixtures]]`.
- Resolving the `D-0002` Obsidian build-vs-adopt spike is the first step of this task.
