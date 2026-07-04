# Handoff — Delete dead code from the knip baseline (T-HIL6 follow-up)

_Task: `T-W1CX-knip-baseline-dead-code-cleanup`. PR: <https://github.com/sksizer/markdown-contract/pull/209>._

## Summary

Resolved all 13 packages/core knip dead-code findings (4 dead re-exports deleted, 9 internal-only symbols de-exported); packages/core findings 13 to 0, quality gate OK 5/5.

## Files changed

| Path | Role |
|---|---|
| `docs/index.md` | M |
| `docs/planning/tasks/T-64SI-init-out-defaults-to-inferred-root.md` | M |
| `docs/planning/tasks/T-W1CX-knip-baseline-dead-code-cleanup.md` | M |
| `packages/core/src/core/dialect/index.ts` | M |
| `packages/core/src/core/dialect/wikilinks.ts` | M |
| `packages/core/src/core/grammar.ts` | M |
| `packages/core/src/core/leaves.ts` | M |
| `packages/core/src/core/registry.ts` | M |
| `packages/core/src/declarative/text.ts` | M |
| `packages/core/src/runner/index.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/209

## Spawned follow-ups

- `T-QX1Q-gate-covers-declaration-emit`
- `T-32OG-knip-per-workspace-scope-gate`
