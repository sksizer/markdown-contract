---
type: task
schema_version: '5'
id: T-WKSP
status: in-progress
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
readiness_verified_at: '2026-07-01T05:20:19Z'
last_reviewed: '2026-07-01'
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
2. Make **Bun the canonical package manager**: re-resolve with `bun install` so `bun.lock` reflects the workspace and commit it (currently untracked), and **delete `package-lock.json`**. D-0006's npm-canonical rule governs the *published artifact*, not the dev PM (see the D1 clarification in [[D-0010-monorepo-tooling]]).
3. Update `.moon/workspace.yml` `projects` to `core: 'packages/core'` (and `web: 'apps/web'`), and move/retarget `moon.yml` task definitions so `inputs`/`outputs` are relative to `packages/core`.
4. **Flip task execution to Bun, except the test gate:** run `build`/`typecheck` via the moon `bun` toolchain (`bun run …`) for speed; pin the `test` task to the **node** toolchain so `vitest` executes under Node — that run is the Node-compatibility gate. Add a guard that `packages/core` imports no Bun-only APIs (`Bun.*`, `bun:*`). (This supersedes T-MOON's "wrap npm scripts" convention — see [[T-U6W3-document-moon-npm-script-wrapping]].)
5. Rework CI bootstrap from `setup-node` + `npm ci` to `setup-bun` + `bun install`; the suite still runs via `moon` (build/typecheck on Bun, test on Node).
6. Scaffold a minimal `apps/web` (placeholder `package.json` + README) so the workspace resolves; no UI code yet.
7. Keep the npm publish flow intact — `packages/core` publishes exactly as today; verify `moon run core:build`/`:test`, and that a dry-run `npm pack` from `packages/core` emits the same `dist/` + bin with **no `workspace:*` refs**.

## Files to touch

- root `package.json` (add `workspaces`), `bun.lock` (commit), **`package-lock.json` (delete)**, `.gitignore`.
- `.moon/workspace.yml`, `.moon/toolchains.yml` (Bun primary; `test` pinned to node), `moon.yml` (project map + task `inputs`/`outputs` paths + per-task `toolchain`).
- move into `packages/core/`: `src/`, `tests/`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, the publishable `package.json`.
- new `apps/web/` placeholder.
- `.github/workflows/ci.yml` (`setup-node` + `npm ci` → `setup-bun` + `bun install`; task paths).

## Acceptance criteria

- [ ] `packages/core` builds, typechecks, and tests via moon with caching intact; `bun install` resolves the workspace from **one `bun.lock`**, and `package-lock.json` is removed.
- [ ] Build/typecheck run on the moon **bun** toolchain; the `test` task runs **vitest under pinned Node** and passes — this is the Node-compatibility gate.
- [ ] `packages/core` imports no Bun-only APIs (`Bun.*`, `bun:*`) — verified so a dev-time Bun dependency cannot leak into the published library.
- [ ] The npm artifact is unchanged: `npm pack` (or publish dry-run) from `packages/core` produces the same `dist/` + bin as today, with no `workspace:*` refs; consumers see no difference.
- [ ] `apps/web` exists as a resolvable workspace member (placeholder), so a future UI app is an add, not a retool.
- [ ] CI bootstraps with Bun (`setup-bun` + `bun install`) and is green via `moon` against the new layout; `sdlc.yaml` quality checks still pass.

## Out of scope

- The actual web UI / Nuxt app and daemon — [[D-0012-distribution-single-exec-and-web-ui]] / M-0009; this task only scaffolds the `apps/web` slot.
- The `bun build --compile` binary matrix — M-0008 ([[D-0012-distribution-single-exec-and-web-ui]]).
- Any Rust crate — [[D-0010-monorepo-tooling]] explicitly adds none.

## Dependencies

- Depends on [[T-MOON-adopt-moon-monorepo]] (moon + Bun toolchain already in place; closed/done). Governed by [[D-0010-monorepo-tooling]] D1/D3. Supersedes the workspace-split intent of the closed T-AE0J.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

- AC-1 (build/typecheck/test via moon, caching intact; one `bun.lock`; `package-lock.json` removed): auto — `bunx moon run core:build core:typecheck core:test` green; a re-run of `:build :typecheck :coverage` reported `3 completed (3 cached)` in 55ms; `bun install` resolves both members from one root `bun.lock`; `package-lock.json` deleted (and now gitignored at root).
- AC-2 (build/typecheck on bun toolchain; test = vitest under pinned node): auto — `moon task core:build|typecheck` report `Toolchain: bun` (moon installed bun 1.3.14); `core:test|coverage` report `Toolchain: node`; 608 tests pass, coverage above thresholds.
- AC-3 (no Bun-only APIs in `packages/core`): auto — `packages/core/tests/no-bun-only-apis.test.ts` scans shipped `src/**` for `Bun.*` / `bun:*`; passes clean, and a negative control (injected `Bun.env`) made it fail as designed.
- AC-4 (npm artifact unchanged; no `workspace:*`): agent-manual — `npm pack --dry-run` from `packages/core` emits an **identical 135-entry** tarball vs. the pre-split baseline (LICENSE + README + package.json + `dist/**`), `name=markdown-contract version=0.1.0`, and the package.json contains no `workspace:` string.
- AC-5 (`apps/web` is a resolvable workspace member): auto — `bun pm ls` lists `@markdown-contract/web@workspace:apps/web`; `moon project web` resolves (source `apps/web`).
- AC-6 (CI bootstraps with Bun, green via moon; `sdlc.yaml` checks pass): agent-manual + deferred-user — CI reworked to `setup-bun` + `bun install --frozen-lockfile` + `bunx moon run :build :typecheck :coverage`; `--frozen-lockfile` verified locally (lockfile in sync), the exact moon command verified green locally, and `sdlc quality run` reports `OK 3/3`. The actual GitHub Actions run is deferred to the PR's CI (cannot execute Actions locally).

### What worked

- `git mv` preserved history for the whole `src/`/`tests/` tree and the moved configs in one clean rename set; because every internal path was project-relative, only **one** test needed a path fix.
- moon's per-task `toolchain:` split worked exactly as intended once the *right* moon ran: build/typecheck on Bun, test/coverage on Node, with the CAS cache intact across re-runs.
- The `npm pack --dry-run` file-list diff against a pre-captured baseline gave a crisp, unambiguous artifact-parity check (135 entries, identical).

### Friction and automation gaps

- `bunx moon` first ran a shadowing **global proto moon (1.41.8)** instead of the pinned `@moonrepo/cli@2.3.5`, because Bun links a workspace-package's dev-dep bin into that package's `node_modules/.bin`, not the root — and moon's version-inverted `vcs.client`/`vcs.manager` schema masked it as a config error. Fixed by hoisting moon+biome to the root `package.json`. Follow-up captured on-branch: [[B-QF64-assert-pinned-moon-version]] (assert the resolved moon version matches the pin).
- `packages/core/src/core/projection.test.ts` reads a repo-root planning doc as a real-document fixture, so the split forced a `../../../../` climb out of the package — a package-isolation smell. Follow-up captured on-branch: [[B-UHOH-vendor-c0004-projection-fixture]] (vendor the fixture package-locally).
- Step 3a captured the quality baseline under the **main repo's** `.sdlc/quality-baselines`, but Step 7 runs in the worktree and looks under the worktree's `.sdlc`, so `--diff-against-baseline` failed `baseline not found`; the verbs also changed (npm→moon) between capture and gate, making the diff moot. Already tracked upstream: [[B-HVL1-worktree-quality-baseline-dir-resolution]]. Worked around by gating without the baseline flag (`OK 3/3`).
- The Step 3b permissions probe reported false-positive `Bash(bun|npm|node)` and `Write/Edit` gaps although all those tools worked throughout the run. Already tracked upstream: [[B-PFPB-permissions-probe-false-positive]]. Proceeded past it.
