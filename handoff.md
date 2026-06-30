# Handoff — Aggregate `docRule` findings through `runCorpus` into `exitCode` (multi-rule, mixed levels)

_Task: `T-DRAG-docrule-runcorpus-aggregation`. PR: <https://github.com/sksizer/markdown-contract/pull/97>._

## Summary

Add runCorpus peer-test cases pinning docRule cross-document finding aggregation into the run findings/exitCode (multiple rules fire across docs; error-level sets exitCode 1, warn-level leaves it 0). Coverage only, no engine change.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-DRAG-docrule-runcorpus-aggregation.md` | M |
| `src/runner/corpus.test.ts` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/97

## Spawned follow-ups

- none
