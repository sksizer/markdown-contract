---
type: task
schema_version: '5'
id: T-DREF
status: open/ready
created: '2026-06-28'
related:
- '[[M-0007-example-use-case-catalog]]'
depends_on: []
tags:
- test
- dialect
- docrule
- wikilinks
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T05:29:43Z'
last_reviewed: '2026-06-30'
---
# Dialect referential-integrity docRules: dead in-doc anchors and dangling vault wikilinks

## Goal

Exercise two novel referential-integrity compositions the engine *allows* but no fixture covers, so they are documented as supported and regression-guarded. Promoted from backlog B-DREF; surfaced by catalog examples `DIALECT-10` and `DIALECT-11` in [[M-0007-example-use-case-catalog]].

## Today

Two currently-uncovered compositions:

1. A `docRule` pairing `extractVaultRefs` with `byAnchor` to flag a `#^anchor` fragment that resolves nowhere **in the same document** (in-doc dead-anchor referential integrity).
2. A **cross-document** `docRule` over a vault (via `runCorpus`) checking that each wikilink target exists, emitting a `warn`-level finding when it doesn't.

## Proposed

Add fixtures + a docRule for each: one in-document dead-anchor check, and one cross-document wikilink-existence check over a small vault. Assert the findings (and warn-level for the cross-doc case).

## Approach

Author the two docRules as fixtures (in-doc via single-document `validate`; cross-doc via `runCorpus`), with small markdown inputs that contain a dead anchor and a dangling wikilink respectively. Coverage of existing composition primitives — no new engine surface unless the open question below is taken up.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/fixtures/validation/` | modify | add an in-doc dead-anchor docRule fixture (`extractVaultRefs` + `byAnchor`) |
| `src/runner/corpus.test.ts` | modify | add a cross-document wikilink-existence case (warn-level) over a small vault |
| `tests/fixtures/` | modify | a small vault fixture for the cross-document case |

## Acceptance criteria

- [ ] A docRule flags a `#^anchor` fragment that resolves nowhere in the same document (in-doc dead-anchor).
- [ ] A cross-document docRule over a vault emits a `warn`-level finding for a wikilink whose target page does not exist.
- [ ] `npm run typecheck` and `npm test` stay green.

## Out of scope

- Promoting vault-wide wikilink validation to a **first-class, shipped feature** (see Dependencies open question) — this task only covers it as a documented composition.

## Dependencies

- Builds on `extractVaultRefs`, `byAnchor`, and `runCorpus`. Promoted from the B-DREF backlog note.
- **Open question (from [[M-0007-example-use-case-catalog]]):** whether vault-wide wikilink validation should become a first-class supported feature rather than only a documented composition. This task assumes "documented composition"; promoting it to a feature is separate, future work.
