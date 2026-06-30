---
type: task
schema_version: '5'
id: T-SCDF
status: planning/proposed
created: '2026-06-30'
related:
- '[[M-0010-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[DR-0002-typed-consumption]]'
depends_on:
- '[[T-SCRB-typed-row-read-back]]'
- '[[T-SCLI-list-item-transforms]]'
- '[[T-SCPP-cell-position-preservation]]'
tags:
- structured-cells
- dogfood
- consumption
- closeout
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
---
# Dogfood structured cells on a realistic worked contract and close the milestone

## Goal

Prove the assembled feature end-to-end on a realistic worked contract — the task "Files to touch" table from [[D-0015-structured-cells]] use case 1 (`Location | Kind | Change`, where `Location` transforms its backticked `path#symbol` grammar) plus a transforming list — and close [[M-0010-structured-cells]]: zero structured-cells fixtures left skipped, no existing golden moved, imports one-way. Because Zod `.transform()` is a TS-API feature (the declarative YAML front-end has a closed vocabulary and no code escape hatch — deferred by D-0011), the dogfood is a realistic **TS** contract in the corpus, not one of the YAML `contracts/*`.

## Today

| Location | Role today |
|---|---|
| `contracts/task.contract.yaml` | Validates SDLC task docs (incl. their `Files to touch` table) declaratively — but YAML, closed vocabulary, no Zod transform; it cannot express a transforming cell. |
| `tests/fixtures/consumption/` | The TS + YAML consumption corpus; the home for a realistic worked dogfood contract. |
| `tests/components.ts#IMPLEMENTED` | The three structured-cells gates (`cell-typed` / `list-typed` / `cell-pos`), flipped `true` by the prior tasks. |
| `tests/FIXTURES.md` | Documents the corpus and the greening switch. |

## Proposed

Add a realistic worked dogfood contract to the consumption corpus: a TS contract over a task-shaped document whose `Files to touch` section is a `table({ columns: ["Location", "Kind", "Change"], cells: { Location: <transform>, Kind: z.enum([...]) } })` and whose `Dependencies` (or similar) section is a `list({ everyItem: <transform> })`. Its `.ts` expectation reads back typed `row.Location.path` / `row.Location.symbol`, the `Kind` enum, and typed list items, and asserts `cellPos(...).col` / `inlineSpans(...)` on the same document. Run the full suite to confirm all three gates are `true` with zero structured-cells fixtures skipped, a no-transform contract is byte-identical (no golden moved), and `cli → runner → core` imports stay one-way.

## Approach

1. Author the dogfood document (`.md`) — a realistic task-shaped doc with a `Files to touch` table (backticked `path#symbol` Locations, `Kind` values) and a transforming list section.
2. Author the TS contract exercising a transforming `Location` cell + the `Kind` enum + a transforming `everyItem` list, and the `.ts` expectation asserting typed table rows, typed list items, and per-cell positions / inline spans on that one document.
3. Run `npm run test` and confirm: `cell-typed`, `list-typed`, `cell-pos` are all `true`; no structured-cells fixture is skipped; the full suite is green.
4. Verify backward-compat: a corpus contract with no transforming cells produces byte-identical rows + findings (the "no golden moves" guard from `T-SCFX` still holds), and confirm no pre-existing golden changed across the milestone.
5. Confirm imports stay one-way (`cli → runner → core`) and the change is confined to `src/core`; update `tests/FIXTURES.md` to describe the dogfood contract.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/fixtures/consumption/` | new | The realistic worked dogfood contract (`.md` + `.ts`) exercising a transforming cell + transforming list + positions |
| `tests/FIXTURES.md` | modify | Document the dogfood contract and the closed state of the three structured-cells gates |

## Acceptance criteria

- [ ] AC-1: A realistic worked TS contract reads back typed `Location` (`{ path, symbol? }`), the `Kind` enum, and typed list items from one document — no consumer re-parse.
- [ ] AC-2: The same document's `cellPos(...).col` and `inlineSpans(...)` are asserted, exercising transforms and positions together.
- [ ] AC-3: `cell-typed`, `list-typed`, and `cell-pos` are all `true`; running the suite reports zero structured-cells fixtures skipped.
- [ ] AC-4: A no-transform contract is byte-identical (rows + findings); no pre-existing fixture golden changed across the milestone.
- [ ] AC-5: Imports stay one-way (`cli → runner → core`); the structured-cells change is confined to `src/core`.
- [ ] AC-6: `npm run build`, `npm run test`, and `npm run typecheck` pass.

## Out of scope

- Declarative YAML exposure of transforms (a code escape hatch for `*.contract.yaml`) — deferred by D-0011; not part of this milestone.
- Downstream consumer migrations (`parse-touchpoints` / `resolve-touchpoints` / `scan-placeholders`) — the driver this unblocks ([[DR-0002-typed-consumption]]), owned by the consumer.
- The paragraph generalization ([[T-SCPA-paragraph-transform-adr]]).

## Dependencies

- [[T-SCRB-typed-row-read-back]], [[T-SCLI-list-item-transforms]], [[T-SCPP-cell-position-preservation]] — the three engine slices this exercises together.
