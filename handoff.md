# Handoff — Make the quality gate catch .d.ts declaration-emit regressions that tsc --noEmit misses

_Task: `T-QX1Q-gate-covers-declaration-emit`. PR: <https://github.com/sksizer/markdown-contract/pull/233>._

## Summary

Added core:build to the lefthook pre-push gate (bunx moon run core:build core:typecheck core:test) so .d.ts declaration-emit regressions (TS4023-family) fail at local push instead of one CI round-trip later; updated lefthook.yml comments and the README git-hooks bullet. sdlc.yaml and CI unchanged (already cover :build).

## Files changed

| Path | Role |
|---|---|
| `README.md` | M |
| `docs/planning/tasks/T-QX1Q-gate-covers-declaration-emit.md` | M |
| `lefthook.yml` | M |

## Quality checks

OK 6/6 (baseline-gated; pre-existing findings ignored)

## PR

https://github.com/sksizer/markdown-contract/pull/233

## Spawned follow-ups

- `document-cross-module-dts-emit-condition`
- `document-lefthook-prepush-run-caveat`
- `serialize-moon-in-quality-line-mode`
