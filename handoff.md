# Handoff — Dogfood structured cells on a realistic worked contract and close the milestone

_Task: `T-SCDF-structured-cells-dogfood`. PR: <https://github.com/sksizer/markdown-contract/pull/223>._

## Summary

Added consumption fixture c16 (16-typed-task-contract) dogfooding structured cells end-to-end: a transforming backticked Location cell + Kind enum + transforming everyItem list + per-cell cellPos/inlineSpans on one realistic task doc; census 16 active / 0 skipped, gates all true. Tests + docs only, no src change.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-OX98-typed-row-source-coordinate-handle.md` | M |
| `docs/planning/tasks/T-SCDF-structured-cells-dogfood.md` | M |
| `packages/core/tests/FIXTURES.md` | M |
| `packages/core/tests/fixtures/consumption/16-typed-task-contract.md` | A |
| `packages/core/tests/fixtures/consumption/16-typed-task-contract.ts` | A |
| `packages/core/tests/fixtures/consumption/index.ts` | M |

## Quality checks

OK 6/6

## PR

https://github.com/sksizer/markdown-contract/pull/223

## Spawned follow-ups

- `T-IB37-document-flattened-cell-grammar`
- `T-OX98-typed-row-source-coordinate-handle`
