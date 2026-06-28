# Handoff — Text-match predicate core + the `text/*` finding area

_Task: `T-TXMC-text-match-core`. PR: <https://github.com/sksizer/markdown-contract/pull/66>._

## Summary

Implemented the text-match predicate core (matchText + buildTextFindings + synthesizeTextId), registered the text/* finding plane between content and rule, and seeded text/* error defaults in the registry; foundation only, no combinator/declarative surface.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-TXMC-text-match-core.md` | M |
| `src/core/index.ts` | M |
| `src/core/registry.ts` | M |
| `src/core/text-match.test.ts` | A |
| `src/core/text-match.ts` | A |
| `src/core/validate.ts` | M |

## Quality checks

OK 2/2 (npm run test + npm run typecheck, baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/66

## Spawned follow-ups

- `T-5HX8-task-work-threads-main-baseline-dir (upstream sksizer/dev#509)`
- `T-9J63-task-work-threads-lease-authority (upstream sksizer/dev#510)`
- `T-FOJN-task-work-durable-task-state-commits (upstream sksizer/dev#511)`
