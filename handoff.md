# Handoff — Keep the transform output at validate-time and cache it on the projection table node

_Task: `T-SCTC-table-cell-transform-capture`. PR: <https://github.com/sksizer/markdown-contract/pull/182>._

## Summary

Cache a table cell transform's parsed output on the projection BlockNode via a new sparse, closure-backed typed(row,col) accessor, populated from validateTable's existing per-cell safeParse; raw rows and the content/table/cell finding shape are unchanged, and the cache never serializes onto the public tree.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-SCTC-table-cell-transform-capture.md` | M |
| `packages/core/src/core/content.test.ts` | M |
| `packages/core/src/core/content.ts` | M |
| `packages/core/src/core/projection.test.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/types.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/182

## Spawned follow-ups

- `T-HYSY-paths-resolver-detects-moved-path-symbol (upstream sksizer/dev#606)`
- `T-TBL1-preflight-permissions-reconcile-dispatch-context (upstream sksizer/dev#607)`
