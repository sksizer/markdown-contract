# Handoff — Document the cross-module condition for reproducing .d.ts declaration-emit regressions

_Task: `T-HPWU-document-cross-module-dts-emit-condition`. PR: <https://github.com/sksizer/markdown-contract/pull/234>._

## Summary

Documented the cross-module .d.ts declaration-emit (TS4023/TS4058) reproduction condition in packages/core/README.md and pointed the moon.yml build: comment at it; docs/comments only, no gate changes.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-HPWU-document-cross-module-dts-emit-condition.md` | M |
| `packages/core/README.md` | M |
| `packages/core/moon.yml` | M |

## Quality checks

OK 6/6 (baseline-gated; pre-existing findings ignored)

## PR

https://github.com/sksizer/markdown-contract/pull/234

## Spawned follow-ups

- `T-42LO-task-work-passes-baseline-dir (upstream: sksizer/dev#673)`
- `T-YF4K-quality-runner-warnings-not-fail (upstream: sksizer/dev#674)`
