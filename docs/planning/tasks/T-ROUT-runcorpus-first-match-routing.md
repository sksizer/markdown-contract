---
type: task
schema_version: '5'
id: T-ROUT
status: open/ready
created: '2026-06-28'
last_reviewed: '2026-06-30'
related:
- '[[M-0007-example-use-case-catalog]]'
- '[[T-J9TZ-cli-and-corpus-runner]]'
depends_on: []
tags:
- test
- runner
- corpus
- routing
need_human_review: false
impact: high
complexity: small
autonomy: supervised
readiness_verified_at: '2026-06-30T05:29:43Z'
---
# Pin first-match-wins rule precedence and per-rule exclude in runCorpus

## Goal

Add the missing routing-precedence cases to the corpus runner's peer test.
`src/runner/corpus.ts` is the first-match router at the heart of every
multi-contract run; its peer test (`src/runner/corpus.test.ts`) covers the glob
matcher and run-stats but **does not pin routing precedence**. Pin its core
promise: among overlapping `include` globs the **earliest matching
rule wins** (and a file is reported exactly once), a trailing catch-all rule fires only for
files no earlier rule matched, and a **per-rule** (in-config) `exclude` removes a file from
that rule.

## Today

`src/runner/corpus.test.ts` exists but only covers the glob matcher and
`runCorpus` run-stats (scanned/matched/unmatched, per-rule counts, the *global*
`--exclude` pre-filter) — it asserts nothing about routing **precedence**.
`src/declarative/config.test.ts` covers a
named `contracts` map and a *global* `runCorpus` exclude pre-filter, and
`tests/fixtures/corpus/markdown-contract.config.mjs` wires multiple rules — but those rules
use **disjoint** globs (`D-*` vs `T-*`), so nothing asserts precedence when globs
**overlap**, nor a per-rule `exclude`. Surfaced by catalog examples `DECLARATIVE-YAML-11`,
`EMBED-AND-CI-03`, and `REAL-WORLD-SCHEMAS-11` in [[M-0007-example-use-case-catalog]].

## Proposed

A `src/runner/corpus.test.ts` peer test (per the repo's peer-test convention) asserting:

- overlapping `include` globs → the earliest rule wins; the file is validated once against
  that rule's contract (no double-report);
- a trailing catch-all (`**/*.md`) rule matches only files unmatched by earlier rules;
- a per-rule `exclude` drops a file from that rule so it falls through to a later matching
  rule (or is skipped if none).

## Approach

1. Build small in-memory `CorpusConfig`s (2–3 rules) over a tiny fixture tree (reuse an
   existing fixtures tree or add a minimal one).
2. Use two trivially-distinguishable contracts (each requires a different section) so
   *which contract ran* is observable from the finding ids.
3. Assert per-file that the finding came from the expected rule's contract, and assert
   counts to prove no double-reporting.
4. Add the per-rule `exclude` case and the trailing catch-all case.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/runner/corpus.test.ts` | modify | add cases: overlapping globs (first-match), trailing catch-all, per-rule exclude |
| `tests/fixtures/` | maybe | a minimal multi-file tree if no existing one fits |

## Acceptance criteria

- [ ] AC-1: `src/runner/corpus.test.ts` exists and runs under vitest.
- [ ] AC-2: A two-overlapping-rule config proves first-match precedence — the file is
  validated against the earliest matching rule only, exactly once.
- [ ] AC-3: A trailing fallback `**/*.md` rule is shown to fire only for files no earlier rule matched.
- [ ] AC-4: A per-rule `exclude` is shown to drop a file from that rule.
- [ ] AC-5: The test reads as documentation (leads with a plain input→output case) per
  `CLAUDE.md`.

## Out of scope

Changing `runCorpus` behavior — this **pins** existing behavior, it does not modify it. The
global include/exclude pre-filter is already tested; this task is about *per-rule* routing.

## Dependencies

Closes a test gap identified by [[M-0007-example-use-case-catalog]]; concerns the corpus
runner delivered by [[T-J9TZ-cli-and-corpus-runner]].
