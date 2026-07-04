# Handoff — Keep `everyItem` transform output and read back typed list items through `ListView`

_Task: `T-SCLI-list-item-transforms`. PR: <https://github.com/sksizer/markdown-contract/pull/215>._

## Summary

Cache everyItem transform output on the list BlockNode via a sparse typedItem(i) overlay and read it back as a typed ListView through read(); mirrors the T-SCTC/T-SCRB table slice. Flips the list-typed gate to true.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-SCLI-list-item-transforms.md` | M |
| `packages/core/src/core/content.test.ts` | M |
| `packages/core/src/core/content.ts` | M |
| `packages/core/src/core/leaves.ts` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/src/core/model.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/text-constraints.test.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/tests/components.ts` | M |

## Quality checks

OK 5/5 — core:build/typecheck/lint/test(697)/package-check pass; core:lint byte-identical to origin/main (325 warnings, exit 0), zero new drift

## PR

https://github.com/sksizer/markdown-contract/pull/215

## Spawned follow-ups

- `T-VJKB-quality-gate-stream-verb-output`
- `T-I8UZ-gap-report-code-span-pipes`
