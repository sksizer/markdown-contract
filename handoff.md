# Handoff — Pin first-match-wins rule precedence and per-rule exclude in runCorpus

_Task: `T-ROUT-runcorpus-first-match-routing`. PR: <https://github.com/sksizer/markdown-contract/pull/108>._

## Summary

Pinned runCorpus first-match routing precedence, trailing catch-all, and per-rule exclude in the corpus runner's peer unit test (src/runner/corpus.test.ts) — 3 new describe blocks, 5 cases; runCorpus behavior unchanged.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-ROUT-runcorpus-first-match-routing.md` | M |
| `src/runner/corpus.test.ts` | M |

## Quality checks

OK 2/2 (npm run test + npm run typecheck)

## PR

https://github.com/sksizer/markdown-contract/pull/108

## Spawned follow-ups

- `T-HHZB-task-work-baseline-dir-main-checkout`
