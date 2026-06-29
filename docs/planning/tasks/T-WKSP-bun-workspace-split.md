---
type: task
schema_version: '5'
id: T-WKSP
status: open/ready
created: '2026-06-28'
related:
  - '[[M-0005-monorepo-tooling]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[D-0006-packaging]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
  - '[[T-MOON-adopt-moon-monorepo]]'
tags:
  - monorepo
  - workspace
  - bun
  - packaging
need_human_review: true
impact: medium
complexity: large
autonomy: supervised
---
# Split the repo into a Bun workspace — `packages/core` (+ `apps/web` placeholder)

## Goal

Carry out the physical workspace restructure that [[T-MOON-adopt-moon-monorepo]] deliberately deferred (per [[D-0010-monorepo-tooling]] D3): move today's single root package into **`packages/core`** (the canonical npm library + CLI of [[D-0006-packaging]], `tsc`/`vitest` flow unchanged) under **Bun workspaces** with one `bun.lock`, and scaffold an **`apps/web`** placeholder so later UI work ([[D-0012-distribution-single-exec-and-web-ui]] / M-0009) only *adds* a project rather than retools. This closes M-0005's "Bun workspace with `packages/core` + `apps/web` scaffolded under one lockfile" success criterion.

## Today

moon is adopted over the **single root project** ([[T-MOON-adopt-moon-monorepo]], shipped #61): `.moon/workspace.yml` maps `markdown-contract: '.'`, the toolchain pins Bun 1.3.14 / Node 20.20.2, and `build`/`typecheck`/`test`/`lint:docs` are cached moon tasks with CI on `moon ci`. There is **no `workspaces` key in `package.json`** and **no `packages/` directory** — the library still lives at the repo root. The npm publish flow is `tsc -p tsconfig.build.json` → `dist/`.

## Proposed

A Bun workspace with two projects under one lockfile:

- **`packages/core`** — the existing library + CLI bin, moved verbatim (`src/`, `tests/`, `tsconfig*.json`, `vitest.config.ts`, the `package.json` that publishes to npm). It stays the canonical, runtime-neutral npm artifact; consumers are unaffected.
- **`apps/web`** — a placeholder app directory (the Nuxt SPA + daemon of [[D-0012-distribution-single-exec-and-web-ui]] lands here later); empty/minimal for now so the graph has the slot.

The root `package.json` gains a `workspaces` (Bun) declaration; moon's `projects` map is updated to point at `packages/core` (+ `apps/web`) instead of `.`.

## Approach

1. Add a root `package.json` `workspaces: ["packages/*", "apps/*"]` (Bun workspace) and move the library into `packages/core/` (git mv `src`, `tests`, `tsconfig*.json`, `vitest.config.ts`, and the publishable `package.json`).
2. Re-resolve the lockfile with `bun install` so `bun.lock` reflects the workspace; commit it (it is currently untracked).
3. Update `.moon/workspace.yml` `projects` to `core: 'packages/core'` (and `web: 'apps/web'`), and move/retarget `moon.yml` task definitions so `inputs`/`outputs` are relative to `packages/core`.
4. Scaffold a minimal `apps/web` (placeholder `package.json` + README) so the workspace resolves; no UI code yet.
5. Keep the npm publish flow intact — `packages/core` publishes exactly as today; verify `moon run core:build`/`:test` and a dry-run `npm pack` from `packages/core`.

## Files to touch

- root `package.json` (add `workspaces`), `bun.lock` (commit), `.gitignore`.
- `.moon/workspace.yml`, `moon.yml` (project map + task `inputs`/`outputs` paths).
- move into `packages/core/`: `src/`, `tests/`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, the publishable `package.json`.
- new `apps/web/` placeholder.
- `.github/workflows/ci.yml` if task paths change.

## Acceptance criteria

- [ ] `packages/core` builds, typechecks, and tests via moon (`moon run core:check` or equivalent) with caching intact; `bun install` resolves the workspace from one `bun.lock`.
- [ ] The npm artifact is unchanged: `npm pack` (or publish dry-run) from `packages/core` produces the same `dist/` + bin as today; consumers see no difference.
- [ ] `apps/web` exists as a resolvable workspace member (placeholder), so a future UI app is an add, not a retool.
- [ ] CI (`moon ci`) is green against the new project layout; `sdlc.yaml` quality checks still pass.

## Out of scope

- The actual web UI / Nuxt app and daemon — [[D-0012-distribution-single-exec-and-web-ui]] / M-0009; this task only scaffolds the `apps/web` slot.
- The `bun build --compile` binary matrix — M-0008 ([[D-0012-distribution-single-exec-and-web-ui]]).
- Any Rust crate — [[D-0010-monorepo-tooling]] explicitly adds none.

## Dependencies

- Depends on [[T-MOON-adopt-moon-monorepo]] (moon + Bun toolchain already in place; closed/done). Governed by [[D-0010-monorepo-tooling]] D1/D3. Supersedes the workspace-split intent of the closed T-AE0J.
