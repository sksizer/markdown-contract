# Handoff — Add a CI workflow that runs the quality checks (test, typecheck) on PRs and pushes to main

_Task: `T-VQ1N-ci-quality-checks`. PR: <https://github.com/sksizer/markdown-contract/pull/44>._

## Summary

Add .github/workflows/ci.yml (npm ci, then npm run typecheck and npm run test as separate steps, Node 20 pinned via actions/setup-node@v4) plus a CI status badge in README.md; quality gate green.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | A |
| `README.md` | M |
| `docs/planning/tasks/T-VQ1N-ci-quality-checks.md` | M |

## Quality checks

OK 2/2 (baseline-gated; pre-existing findings ignored)

## PR

https://github.com/sksizer/markdown-contract/pull/44

## Spawned follow-ups

- `task-mutators-scope-docs-generate`
- `baseline-capture-runs-worktree-init`
- `preflight-flags-uncommitted-lease-authority`
