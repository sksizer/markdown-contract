---
type: task
schema_version: '5'
id: T-DRAG
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0007-example-use-case-catalog]]'
depends_on: []
tags:
  - test
  - runner
  - docrule
  - corpus
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Aggregate `docRule` findings through `runCorpus` into `exitCode` (multi-rule, mixed levels)

## Goal

Cover the currently-untested path where a contract carrying `docRule`(s) is routed through `runCorpus`, so cross-document findings aggregate into the run's `findings` / `exitCode`. Promoted from backlog B-DRAG; surfaced by catalog examples `REAL-WORLD-SCHEMAS-12` and `REAL-WORLD-SCHEMAS-13` in [[M-0007-example-use-case-catalog]].

## Today

Every existing corpus test uses **rule-less** contracts; `docRule` is only exercised through single-document `validate()` (fixture 16). Untested: a contract with `docRule`(s) through `runCorpus`, including **multiple** `docRule`s in one contract and a **warn-level** `docRule` that must NOT bump the exit code to 1.

## Proposed

Add a corpus test with a contract carrying `docRule`s, run it through `runCorpus`, and assert: cross-document findings appear in the aggregated `findings`; multiple `docRule`s all fire; an error-level `docRule` finding sets `exitCode` 1; a warn-level `docRule` does not.

## Approach

Extend `src/runner/corpus.test.ts` (or add cases beside it) with a small multi-doc fixture and a docRule-bearing contract; assert on the aggregated `findings`/`exitCode`. No engine change — pins existing aggregation behavior.

## Files to touch

- `src/runner/corpus.test.ts`
- a small multi-document fixture under `tests/fixtures/` if needed

## Acceptance criteria

- [ ] A `runCorpus` test routes a `docRule`-bearing contract and asserts cross-document findings aggregate into the run `findings`.
- [ ] Multiple `docRule`s in one contract all contribute findings.
- [ ] An error-level `docRule` sets `exitCode === 1`; a warn-level `docRule` leaves the exit code unchanged (no bump to 1).
- [ ] `npm run typecheck` and `npm test` stay green.

## Out of scope

- Single-document `docRule` behavior (already covered by fixture 16).
- New docRule features — coverage only.

## Dependencies

- None blocking. Builds on `runCorpus` and the docRule plane. Promoted from the B-DRAG backlog note.
