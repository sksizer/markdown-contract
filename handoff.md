# Handoff — Scaffold the `apps/docs` Astro + Starlight project as a moon workspace member

_Task: `T-7UTE-astro-docs-site`. PR: <https://github.com/sksizer/markdown-contract/pull/175>._

## Summary

Scaffolded apps/docs as an Astro + Starlight moon project building on the bun toolchain to static dist/ output; empty-but-wired content collection, placeholder index, and declared-empty sidebar IA. packages/core untouched.

## Files changed

| Path | Role |
|---|---|
| `.gitignore` | M |
| `.moon/workspace.yml` | M |
| `apps/docs/.gitignore` | A |
| `apps/docs/README.md` | A |
| `apps/docs/astro.config.mjs` | A |
| `apps/docs/moon.yml` | A |
| `apps/docs/package.json` | A |
| `apps/docs/public/favicon.svg` | A |
| `apps/docs/src/content.config.ts` | A |
| `apps/docs/src/content/docs/index.md` | A |
| `apps/docs/tsconfig.json` | A |
| `bun.lock` | M |
| `docs/planning/tasks/T-7UTE-astro-docs-site.md` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/175

## Spawned follow-ups

- `worktree-init-sweeps-dangling-symlinks`
- `task-work-step7-threads-baseline-dir`
- `preflight-permissions-checks-effective-mode`
