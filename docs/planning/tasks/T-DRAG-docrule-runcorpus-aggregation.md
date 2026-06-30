---
type: task
schema_version: '5'
id: T-DRAG
status: closed/done
created: '2026-06-28'
related:
- '[[M-0007-example-use-case-catalog]]'
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
last_reviewed: '2026-06-30'
prs:
- https://github.com/sksizer/markdown-contract/pull/97
completion_note: 'Shipped via #97.'
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

- AC-1: auto — `src/runner/corpus.test.ts` case 1 routes a `docRule`-bearing contract through `runCorpus` over `doc-a.md` + `doc-b.md` and asserts the findings carry both documents' paths (the distinct-paths set), i.e. cross-document findings aggregate into the run `findings`.
- AC-2: auto — case 1 asserts both `doc/needs-summary` and `doc/has-owner` contribute (distinct-ids set, plus the exact ordered 4-finding shape = 2 rules × 2 docs).
- AC-3: auto — case 1's error-level rule drives `exitCode === 1`; case 2 (every doc carries a `## Summary`, so only the warn rule fires) asserts a warn-only run leaves `exitCode === 0`.
- AC-4: auto — `sdlc quality run` reports `OK 2/2` (`npm run test` and `npm run typecheck` both green); baseline-gated, no new drift.

### What worked

- The peer test's existing `vault()` temp-dir + `runCorpus({ cwd })` pattern dropped in cleanly — the new cases needed no engine or runner change, only a real `docRule` contract, so the work is pure behavior-pinning coverage as scoped.
- Fixture 16's `doc.body as { section(name): unknown }` cast let the `docRule` bodies check section presence without fighting the generic `Doc<F>` body type; `pos`-less findings auto-stamp `ctx.path`, which is exactly what makes per-document aggregation observable.
- The Step 7 baseline-gated gate cleanly subtracted the pre-existing `tests/yaml-parity.test.ts` typecheck findings, so the gate reported only this branch's (clean) status.

### Friction and automation gaps

- none observed
