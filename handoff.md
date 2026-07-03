# Handoff — Wire the GitHub Pages deploy workflow for `apps/docs` (moon/Bun build → Pages)

_Task: `T-PAGE-docs-pages-deploy`. PR: <https://github.com/sksizer/markdown-contract/pull/184>._

## Summary

Added Bun-bootstrapped GitHub Pages deploy workflow (.github/workflows/deploy-docs.yml) that builds apps/docs via 'bunx moon run docs:build' and publishes with actions/deploy-pages; linked the docs site URL in README.md. AC-3 (live publish) is billing-gated and deferred.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/deploy-docs.yml` | A |
| `README.md` | M |
| `docs/planning/tasks/T-PAGE-docs-pages-deploy.md` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/184

## Spawned follow-ups

- `T-W2TM-baseline-dir-resolves-from-superproject`
