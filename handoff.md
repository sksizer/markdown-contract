# Handoff — `init --out` placement of the written scaffold

_Task: `T-IOUT-init-out-placement`. PR: <https://github.com/sksizer/markdown-contract/pull/93>._

## Summary

Added a CLI test covering init --out scaffold placement: init --meta --out <dir> writes markdown-contract.yaml + contracts/*.contract.yaml under <dir>, leaving cwd untouched. Coverage-only, no src change.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-IOUT-init-out-placement.md` | M |
| `tests/inference.cli.test.ts` | M |

## Quality checks

OK 2/2 (baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/93

## Spawned follow-ups

- none
