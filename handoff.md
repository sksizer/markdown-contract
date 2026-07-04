# Handoff — init defaults the scaffold write to the single inferred root, not cwd

_Task: `T-64SI-init-out-defaults-to-inferred-root`. PR: <https://github.com/sksizer/markdown-contract/pull/208>._

## Summary

Default init scaffold write target to the single inferred root (absRoots[0]) instead of cwd; multi-root keeps cwd with a stderr warning; explicit --out unchanged. Fixes the init <dir> -> init <dir> --check round-trip from any cwd.

## Files changed

| Path | Role |
|---|---|
| `docs/index.md` | M |
| `docs/planning/capabilities/C-0008-config-scaffolding.md` | M |
| `docs/planning/decisions/D-0009-config-inference.md` | M |
| `docs/planning/tasks/T-64SI-init-out-defaults-to-inferred-root.md` | M |
| `docs/planning/tasks/T-W1CX-knip-baseline-dead-code-cleanup.md` | M |
| `packages/core/src/cli/run.ts` | M |
| `packages/core/tests/inference.cli.test.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/208

## Spawned follow-ups

- none
