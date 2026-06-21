---
type: task
schema_version: '5'
id: T-9XB3
status: open/ready
created: '2026-06-20'
related:
- '[[C-0001-contract-validation]]'
- '[[C-0002-typed-consumption]]'
- '[[DR-0004-validate-sdlc-corpus]]'
- '[[D-0001-finding-model]]'
depends_on:
- '[[T-4QM9-framework-skeleton]]'
tags:
- testing
- fixtures
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# A fixture-driven test harness seeded from the provenance corpus, designed to green incrementally

## Goal

Establish the testing shape and the fixture strategy before the engine is built, so each
implementation task has a target to green. The provenance examples — already authored as a
graded corpus of validation and consumption cases — become the end-to-end fixtures; the
harness runs each (markdown in → expected findings / typed model out) and is built to grow
incrementally, lighting up cases as components land, the same way the question corpus was
built up one decision at a time.

## Today

A single smoke test; the rich example corpus sits unused in provenance.

| Location | Role today |
|---|---|
| `tests/smoke.test.ts` | Asserts the package imports and exposes its exports |
| `provenance/d0014/examples/validation/` | ~50 graded validation cases (section grammar, leaves, anchors, rules, real-corpus end-to-end) |
| `provenance/d0014/examples/consumption/` | ~11 typed-model cases (read door, dual-key, views, byAnchor) |

## Proposed

`tests/` carries a fixture-driven harness: a `fixtures/` tree derived from the provenance
validation + consumption examples, each fixture pairing an input document with its expected
findings (`id` / `level` / line) or its typed-model assertions. A loader runs them table-style
under vitest. Fixtures whose component isn't implemented yet are skipped (not failing) and
tagged by component, so each later task un-skips its own slice. `tests/FIXTURES.md` documents
the format and the incremental-greening convention. `npm run test` is green and reports active
vs skipped counts.

## Approach

1. Choose the fixture format — an input `.md` plus a sibling expectation (expected findings
   and/or model assertions); keep it diffable and easy to add to.
2. Port the provenance validation cases (`01`..`21b`) and consumption cases (`01`..`11`) into
   `tests/fixtures/`, preserving their graded pairing (pass case + its failing variant).
3. Build the harness loader that discovers fixtures and asserts findings / model against the
   public API.
4. Tag each fixture by component (`projection` / `structure` / `content` / `validate` /
   `consumption` / `cli`) and `skip` those whose component is still stubbed, so the suite is
   green now and un-skips per task.
5. Write `tests/FIXTURES.md` (format + how a task greens its slice).
6. `npm run test` green; print active vs skipped counts.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/fixtures/` | new | Fixture corpus derived from the provenance examples |
| `tests/harness.ts` | new | Fixture loader + finding/model assertions |
| `tests/validation.test.ts` | new | Runs the validation fixtures through the harness |
| `tests/consumption.test.ts` | new | Runs the consumption fixtures through the harness |
| `tests/FIXTURES.md` | new | Fixture format + incremental-greening convention |
| `tests/smoke.test.ts` | modify | Keep as the minimal import check |

## Acceptance criteria

- [ ] AC-1: A fixture harness discovers fixture cases and runs them under `npm run test`.
- [ ] AC-2: The provenance validation + consumption examples are represented as fixtures
  (1:1 with the example set, or a logged list of any deliberately deferred).
- [ ] AC-3: Each fixture declares its expected findings (`id` / `level` / line) and/or its
  typed-model assertions.
- [ ] AC-4: Fixtures for unimplemented components are skipped (not failing) and tagged by
  component so an implementation task can un-skip its slice.
- [ ] AC-5: `npm run test` is green and reports a count of active vs skipped fixtures.
- [ ] AC-6: `tests/FIXTURES.md` documents the format and the incremental-greening convention.

## Out of scope

- Implementing the components the fixtures target — that is the six implementation tasks.
- Performance / benchmark testing; coverage gating.

## Dependencies

- Needs the stubbed public surface from `[[T-4QM9-framework-skeleton]]` to import and assert
  against.
