---
type: task
schema_version: '5'
id: T-SCDF
status: in-progress
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
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
last_reviewed: '2026-07-04'
readiness_verified_at: '2026-07-04T09:42:01Z'
---
# Dogfood structured cells on a realistic worked contract and close the milestone

## Goal

Prove the assembled feature end-to-end on a realistic worked contract — the task "Files to touch" table from [[D-0015-structured-cells]] use case 1 (`Location | Kind | Change`, where `Location` transforms its backticked `path#symbol` grammar) plus a transforming list — and close [[M-0011-structured-cells]]: zero structured-cells fixtures left skipped, no existing golden moved, imports one-way. Because Zod `.transform()` is a TS-API feature (the declarative YAML front-end has a closed vocabulary and no code escape hatch — deferred by D-0011), the dogfood is a realistic **TS** contract in the corpus, not one of the YAML `contracts/*`.

## Today

| Location | Role today |
|---|---|
| `contracts/task.contract.yaml` | Validates SDLC task docs (incl. their `Files to touch` table) declaratively — but YAML, closed vocabulary, no Zod transform; it cannot express a transforming cell. |
| `packages/core/tests/fixtures/consumption/` | The TS + YAML consumption corpus; the home for a realistic worked dogfood contract. |
| `packages/core/tests/components.ts#IMPLEMENTED` | The three structured-cells gates (`cell-typed` / `list-typed` / `cell-pos`), flipped `true` by the prior tasks. |
| `packages/core/tests/FIXTURES.md` | Documents the corpus and the greening switch. |

## Proposed

Add a realistic worked dogfood contract to the consumption corpus: a TS contract over a task-shaped document whose `Files to touch` section is a `table({ columns: ["Location", "Kind", "Change"], cells: { Location: <transform>, Kind: z.enum([...]) } })` and whose `Dependencies` (or similar) section is a `list({ everyItem: <transform> })`. Its `.ts` expectation reads back typed `row.Location.path` / `row.Location.symbol`, the `Kind` enum, and typed list items, and asserts `cellPos(...).col` / `inlineSpans(...)` on the same document. Run the full suite to confirm all three gates are `true` with zero structured-cells fixtures skipped, a no-transform contract is byte-identical (no golden moved), and `cli → runner → core` imports stay one-way.

## Approach

1. Author the dogfood document (`.md`) — a realistic task-shaped doc with a `Files to touch` table (backticked `path#symbol` Locations, `Kind` values) and a transforming list section.
2. Author the TS contract exercising a transforming `Location` cell + the `Kind` enum + a transforming `everyItem` list, and the `.ts` expectation asserting typed table rows, typed list items, and per-cell positions / inline spans on that one document.
3. Run `bunx moon run core:test` and confirm: `cell-typed`, `list-typed`, `cell-pos` are all `true`; no structured-cells fixture is skipped; the full suite is green.
4. Verify backward-compat: a corpus contract with no transforming cells produces byte-identical rows + findings (the "no golden moves" guard from `T-SCFX` still holds), and confirm no pre-existing golden changed across the milestone.
5. Confirm imports stay one-way (`cli → runner → core`) and the change is confined to `packages/core/src/core`; update `packages/core/tests/FIXTURES.md` to describe the dogfood contract.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/fixtures/consumption/` | new | The realistic worked dogfood contract (`.md` + `.ts`) exercising a transforming cell + transforming list + positions |
| `packages/core/tests/FIXTURES.md` | modify | Document the dogfood contract and the closed state of the three structured-cells gates |

## Acceptance criteria

- [ ] AC-1: A realistic worked TS contract reads back typed `Location` (`{ path, symbol? }`), the `Kind` enum, and typed list items from one document — no consumer re-parse.
- [ ] AC-2: The same document's `cellPos(...).col` and `inlineSpans(...)` are asserted, exercising transforms and positions together.
- [ ] AC-3: `cell-typed`, `list-typed`, and `cell-pos` are all `true`; running the suite reports zero structured-cells fixtures skipped.
- [ ] AC-4: A no-transform contract is byte-identical (rows + findings); no pre-existing fixture golden changed across the milestone.
- [ ] AC-5: Imports stay one-way (`cli → runner → core`); the structured-cells change is confined to `packages/core/src/core`.
- [ ] AC-6: `bunx moon run core:build`, `bunx moon run core:test`, and `bunx moon run core:typecheck` pass.

## Out of scope

- Declarative YAML exposure of transforms (a code escape hatch for `*.contract.yaml`) — deferred by D-0011; not part of this milestone.
- Downstream consumer migrations (`parse-touchpoints` / `resolve-touchpoints` / `scan-placeholders`) — the driver this unblocks ([[DR-0002-typed-consumption]]), owned by the consumer.
- The paragraph generalization ([[T-SCPA-paragraph-transform-adr]]).

## Dependencies

- [[T-SCRB-typed-row-read-back]], [[T-SCLI-list-item-transforms]], [[T-SCPP-cell-position-preservation]] — the three engine slices this exercises together.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `c16` in `bunx moon run core:test` reads back typed `Location` (`{ path, symbol? }`), the `Kind` enum, and typed `{ ref, text }` list items from one document; assertions pass with no consumer re-parse.
- AC-2: auto — `c16` asserts `cellPos(rows[0], "Location").col === 3` and `inlineSpans(...)` returning the real span (`raw: "`packages/core/src/core/leaves.ts#table`"`) on the same document — transforms and positions together.
- AC-3: auto — consumption census reports `16 active / 0 skipped / 16 total`; `c12`/`c13`/`c14`/`c16` all run (`cell-typed`/`list-typed`/`cell-pos` are all `true`), zero structured-cells fixtures skipped.
- AC-4: auto — change is additive (two new files + two additive edits); no existing fixture golden changed, and `c15-no-transform-parity` still passes (`git diff --stat origin/main..HEAD` touches no golden).
- AC-5: auto — `bun run lint:deps` passes (one-way `cli → runner → core`); `git diff --name-only origin/main..HEAD -- packages/core/src/` is empty (no engine change; the dogfood is tests + docs only).
- AC-6: auto — full gate `OK 6/6`: `core:build`, `core:typecheck`, `core:lint`, `core:test`, `core:package-check`, `lint:deps` all pass.

### What worked

- The incremental-greening harness paid off: the three engine slices had already flipped their gates `true`, so the dogfood fixture activated by construction and the census line (`16 active / 0 skipped`) proved the milestone closed with zero extra wiring.
- The sibling fixtures (`12`/`13`/`14`/`15`) were a precise template — the combined worked contract fell out of composing their `build()` shapes into one `sections({}, [...])` body.
- The baseline-gated quality gate cleanly separated this branch's drift (zero new) from the 12 pre-existing findings, so the gate was unambiguous.

### Friction and automation gaps

- The `Location` transform receives cell text with inline-code backticks ALREADY FLATTENED (projection unwraps `` `a/b.ts#sym` `` → `a/b.ts#sym` before the cell schema runs), so D-0015's canonical *backticked* `LOCATION_RE` from `provenance/d0015/proposed-shape.md` rejects every row — the worked-example regex is wrong against the shipped projection. The dogfood surfaced this only by running the suite. — The proposed-shape worked example should be corrected to the flattened grammar (or the projection's flatten-before-cell-schema ordering documented at the `table({ cells })` API), so the next author does not copy a regex that cannot match. → [[T-IB37-document-flattened-cell-grammar]]
- `Doc.inlineSpans(row, col)` content-matches against the RAW row, but a transformed row's `Location` is an object, so passing the typed row returns `[]`; the fixture had to re-form the raw cell string from the typed value (a `rawLocation()` helper) to content-match, while `cellPos` (reference-matched on the `TableView`) accepts the typed row directly. This asymmetry is exactly what use case 2 (`scan-placeholders` masking) would hit downstream. — `inlineSpans` should accept the same row reference `cellPos` does (reference-match, not content-match) so a consumer with typed rows can read spans without reconstructing raw cell text; captured as a follow-up. → [[T-OX98-typed-row-source-coordinate-handle]]

### Spawned follow-up tasks

- [[T-IB37-document-flattened-cell-grammar]] (https://github.com/sksizer/markdown-contract/pull/222) — correct the D-0015 worked-example `LOCATION_RE` to the flattened cell grammar and document the flatten-before-cell-schema ordering at the `table({ cells })` API; spawned (Local).
- [[T-OX98-typed-row-source-coordinate-handle]] — give `inlineSpans` reference-match parity with `cellPos` so typed rows resolve by identity; linked (existing planning/draft, itself spawned from [[T-SCPP-cell-position-preservation]]).
