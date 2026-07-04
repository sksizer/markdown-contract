# Handoff — Ratchet down the Biome cognitive-complexity ceiling from 46 toward 15

_Task: `T-D8TE-ratchet-biome-complexity-ceiling`. PR: <https://github.com/sksizer/markdown-contract/pull/220>._

## Summary

Lowered Biome noExcessiveCognitiveComplexity ceiling 46->15; refactored 15 of 16 offending functions behavior-preservingly, 1 scoped biome-ignore with rationale; 697 tests green.

## Files changed

| Path | Role |
|---|---|
| `biome.jsonc` | M |
| `docs/planning/tasks/T-D8TE-ratchet-biome-complexity-ceiling.md` | M |
| `packages/core/src/cli/run.ts` | M |
| `packages/core/src/core/content.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/structure.ts` | M |
| `packages/core/src/core/text-match.ts` | M |
| `packages/core/src/declarative/body.ts` | M |
| `packages/core/src/declarative/infer.ts` | M |
| `packages/core/src/declarative/schema.ts` | M |
| `packages/core/src/declarative/text.ts` | M |
| `packages/core/src/runner/corpus.ts` | M |

## Quality checks

OK 6/6 (baseline-gated; pre-existing lint:deps findings ignored)

## PR

https://github.com/sksizer/markdown-contract/pull/220

## Spawned follow-ups

- `T-PXZ0-baseline-refresh-on-config-verb-change`
- `T-2HDX-normalize-cwd-relative-baseline-paths`
- `T-XYKD-readiness-gate-accept-basename-path-match`
