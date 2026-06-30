---
type: task
schema_version: "5"
id: T-DRAG
status: in-progress
created: 2026-06-28
related:
  - "[[M-0007-example-use-case-catalog]]"
depends_on: []
tags:
  - test
  - runner
  - docrule
  - corpus
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T06:59:27Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/97
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

| Location | Kind | Change |
|---|---|---|
| `src/runner/corpus.test.ts` | modify | add docRule-through-`runCorpus` aggregation cases (multiple docRules fire; warn-level does not bump the exit code) |
| `tests/fixtures/` | modify | a small multi-document fixture + docRule-bearing contract, if no existing tree fits |

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

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
