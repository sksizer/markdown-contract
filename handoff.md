# Handoff — Add knip to detect unused files, exports, and dependencies

_Task: `T-HIL6-knip-dead-code`. PR: <https://github.com/sksizer/markdown-contract/pull/143>._

## Summary

Add knip dead-code detection: root knip.json (workspaces-scoped to packages/core), knip@^5 + lint:deps script, cached runInCI:false moon lint-deps task, and a report-only knip.yml workflow. Baseline: 13 genuine findings (9 exports, 4 types); deletes nothing.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/knip.yml` | A |
| `bun.lock` | M |
| `docs/planning/tasks/T-HIL6-knip-dead-code.md` | M |
| `docs/planning/tasks/T-SQFB-document-moon-runinci-dedicated-workflow.md` | A |
| `docs/planning/tasks/T-W1CX-knip-baseline-dead-code-cleanup.md` | A |
| `knip.json` | A |
| `package.json` | M |
| `packages/core/moon.yml` | M |

## Quality checks

OK 3/3 (baseline-gated; build/typecheck/test)

## PR

https://github.com/sksizer/markdown-contract/pull/143

## Spawned follow-ups

- `T-W1CX-knip-baseline-dead-code-cleanup`
- `T-SQFB-document-moon-runinci-dedicated-workflow`
