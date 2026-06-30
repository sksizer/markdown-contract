---
type: task
schema_version: '5'
id: T-SCPP
status: planning/proposed
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[D-0002-projection-and-dialect]]'
- '[[DR-0002-typed-consumption]]'
depends_on:
- '[[T-SCFX-structured-cells-fixture-scaffold]]'
tags:
- structured-cells
- projection
- position-preservation
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: '2026-06-30'
---
# Preserve per-cell `col` and inline-code byte spans on the projection (axis C1)

## Goal

Stop flattening away the byte positions a position-precise consumer needs. `flattenInline` collapses an `inlineCode` node to its `value`, dropping the span; a table node carries only line-grained `pos` / `rowPos(i)`, never a per-cell `col`. Add — additively — a per-cell `cellPos(row, col): SourcePos` with `col` set, and an inline-code **span overlay** recording each cell's (and paragraph's) inline-code byte ranges, computed once where `flattenInline` runs. This ships **independently** of transforms (it is a projection enrichment) and unblocks the masking consumer (`scan-placeholders`) that could not migrate onto the tree. Flips the `cell-pos` gate.

## Today

| Location | Role today |
|---|---|
| `src/core/projection.ts#flattenInline` | Flattens an inline subtree to plain text; an `inlineCode` contributes only its `value` — the backtick span (and its byte range) is lost. |
| `src/core/types.ts#SourcePos` | `SourcePos { line; col? }` — `col` is already optional (D-0014 C3 deferred it, non-breaking). |
| `src/core/types.ts` (`table` arm) | Carries `pos` (block line) and `rowPos(i)` (row line); no per-cell `col`, no inline-span record. |
| `src/core/projection.test.ts` | Peer tests for the projection (positions, flattening). |

## Proposed

`flattenInline`'s replacement records, per inline-code run, an `InlineSpan { start: SourcePos; end: SourcePos; raw: string }` (the byte/column range + the backticked text) while still returning the flattened string every other consumer relies on. The `table` arm of `BlockNode` gains additive `cellPos(row, col): SourcePos` (with `col` set) and `inlineSpans(row, col): InlineSpan[]`; paragraphs gain the analogous inline-span accessor. Existing `pos` / `rowPos(i)` and the flattened string are untouched. Whether spans are threaded from mdast's `inlineCode.position` or recomputed against the flattened text is resolved in this task (the implementation spike question from `proposed-shape.md` §7). Flips `cell-pos` and un-skips the position fixtures.

## Approach

1. Define the `InlineSpan { start: SourcePos; end: SourcePos; raw: string }` type in `src/core/types.ts`; add `cellPos(row, col)` and `inlineSpans(row, col)` to the `table` arm of `BlockNode`, and an inline-span accessor to the paragraph arm.
2. In `src/core/projection.ts`, change `flattenInline` (or its caller) to emit, alongside the flattened string, the inline-code spans for the subtree — deciding between threading mdast `inlineCode.position` offsets and recomputing against the flattened text, and recording the choice in the task's closeout note.
3. Populate `cellPos(row, col)` with `col` set for table cells (using the column's start offset within the row), and attach the per-cell / per-paragraph `inlineSpans`.
4. Keep `pos`, `rowPos(i)`, `anchor`, raw `rows`, and the flattened cell/paragraph text byte-identical; the new accessors are purely additive.
5. Flip `cell-pos` to `true` in `tests/components.ts`, un-skip the position fixtures, and add peer tests in `src/core/projection.test.ts` asserting `cellPos(...).col` precision and `inlineSpans(...)` ranges (including a cell with multiple inline-code runs and a cell with none).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/types.ts` | modify | Add `InlineSpan`; add `cellPos(row, col)` + `inlineSpans(row, col)` to the `table` arm and an inline-span accessor to the paragraph arm of `BlockNode` |
| `src/core/projection.ts` | modify | Record inline-code spans in `flattenInline`'s replacement; set per-cell `col`; attach the overlays |
| `src/core/projection.test.ts` | modify | Peer tests for `cellPos(...).col` and `inlineSpans(...)` ranges (multi-span, zero-span cells) |
| `tests/components.ts` | modify | Flip `cell-pos` to `true` |
| `tests/fixtures/consumption/` | modify | Un-skip the position-preservation fixtures gated by `cell-pos` |

## Acceptance criteria

- [ ] AC-1: A table node exposes `cellPos(row, col)` whose `col` locates the cell's start column (full precision, not just the row line).
- [ ] AC-2: `inlineSpans(row, col)` returns one `InlineSpan` per inline-code run in that cell, each carrying `{ start, end }` byte/column endpoints and the `raw` backticked text; a cell with no inline code returns an empty array.
- [ ] AC-3: Paragraphs expose the analogous inline-span accessor.
- [ ] AC-4: Existing `pos`, `rowPos(i)`, raw `rows`, and the flattened cell/paragraph text are byte-identical to before; the accessors are additive only.
- [ ] AC-5: `cell-pos` is `true` and the position fixtures run and pass; no previously-passing fixture or golden changes.
- [ ] AC-6: `npm run build`, `npm run test`, and `npm run typecheck` pass.

## Out of scope

- Transforms and typed read-back (`T-SCTC` / `T-SCRB` / `T-SCLI`) — position preservation is independent and does not depend on them.
- Putting `col` on a `content/table/cell` **finding** — that remains D-0014 C3's call; this task is the model/projection surface only.
- Migrating `scan-placeholders` onto the overlay — that is the downstream consumer's work ([[DR-0002-typed-consumption]]), unblocked by this task.

## Dependencies

- [[T-SCFX-structured-cells-fixture-scaffold]] — provides the gated position fixtures this greens. Independent of the transform tasks.
