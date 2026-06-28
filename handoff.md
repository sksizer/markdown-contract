# Handoff — Adopt moon as the repo's task runner + toolchain manager

_Task: `T-MOON-adopt-moon-monorepo`. PR: <https://github.com/sksizer/markdown-contract/pull/61>._

## Summary

Adopted moon 2.3.5 as the task runner over the single-package npm layout: build/typecheck/test/lint-docs run as cached moon tasks (moon.yml is the single source of truth); pinned Node 20.20.2 + Bun 1.3.14 in .moon/toolchains.yml; npm stays canonical (scripts unchanged, dist/ publish byte-identical); CI runs the suite via 'moon run :build :typecheck :test'; .moon/cache gitignored; README Develop section documents the workflow and pinned versions.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | M |
| `.gitignore` | M |
| `.moon/toolchains.yml` | A |
| `.moon/workspace.yml` | A |
| `README.md` | M |
| `docs/planning/tasks/T-MOON-adopt-moon-monorepo.md` | M |
| `moon.yml` | A |
| `package-lock.json` | M |
| `package.json` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/61

## Spawned follow-ups

- `T-U6W3-document-moon-npm-script-wrapping`
- `T-Y9JR-reconcile-docs-validation-sdlc-status`
