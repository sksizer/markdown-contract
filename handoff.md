# Handoff — Prototype: mock vault & findings JSON payload shapes (the UI data seam)

_Task: `T-D7X1-web-ui-mock-api-shapes`. PR: <https://github.com/sksizer/markdown-contract/pull/111>._

## Summary

Defined the prototype web-UI mock API seam: types/api.ts (vault/status/finding/drift/SSE + 6 D-0012 route envelopes), all-states fixtures + empty registry, and the single mockApi loader; non-breaking re-export refactor keeps the sibling's components compiling.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-D7X1-web-ui-mock-api-shapes.md` | M |
| `prototype/web-ui/mocks/api-fixtures.ts` | A |
| `prototype/web-ui/mocks/builders.ts` | M |
| `prototype/web-ui/mocks/composables.ts` | M |
| `prototype/web-ui/mocks/index.ts` | M |
| `prototype/web-ui/mocks/loader.ts` | A |
| `prototype/web-ui/mocks/types.ts` | M |
| `prototype/web-ui/types/api.ts` | A |
| `prototype/web-ui/types/index.ts` | A |

## Quality checks

OK 2/2 (npm run test, npm run typecheck; baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/111

## Spawned follow-ups

- `T-ENNF-prototype-web-ui-quality-gate`
- `T-OIUU-task-work-default-baseline-dir`
