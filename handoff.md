# Handoff — Preserve per-cell `col` and inline-code byte spans on the projection (axis C1)

_Task: `T-SCPP-cell-position-preservation`. PR: <https://github.com/sksizer/markdown-contract/pull/187>._

## Summary

Add additive cellPos(col)/inlineSpans position overlay (mdast-threaded spans) to the projection and model facade; flip the cell-pos gate and green the position fixture. All existing pos/rowPos/flattened text byte-identical.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-EW8J-refresh-planning-paths-post-monorepo-split.md` | M |
| `docs/planning/tasks/T-SCPP-cell-position-preservation.md` | M |
| `packages/core/src/core/model.ts` | M |
| `packages/core/src/core/projection.test.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/text-constraints.test.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/tests/components.ts` | M |
| `packages/core/tests/fixtures/consumption/14-cell-position.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/187

## Spawned follow-ups

- `T-OX98-typed-row-source-coordinate-handle`
- `T-EW8J-refresh-planning-paths-post-monorepo-split`
- `T-LF7V-gap-report-strip-path-annotation (upstream sksizer/dev #609)`
