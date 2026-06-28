---
type: task
schema_version: '5'
id: T-MOON
status: open/ready
created: '2026-06-28'
related:
- '[[D-0010-monorepo-tooling]]'
- '[[D-0006-packaging]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
tags:
- monorepo
- tooling
- moon
- bun
- ci
- build
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# Adopt moon as the repo's task runner + toolchain manager

## Goal

Introduce [moon](https://moonrepo.dev) as the monorepo task runner and toolchain manager (per [[D-0010-monorepo-tooling]]), **over the current single-package layout**, so `build` / `typecheck` / `test` / `lint:docs` run through one cached, reproducible task graph with a **pinned Bun (and Node) toolchain** — and so the later `packages/core` + `apps/web` workspace split (and the `bun build --compile` matrix of [[D-0012-distribution-single-exec-and-web-ui]]) is an incremental add of projects rather than a retool. This task deliberately adopts moon *first* and leaves the physical workspace restructure to a separate follow-on, so moon lands as a small, independently shippable change.

## Today

The repo is a single npm package whose tasks are plain npm scripts (`package.json`):

| Script | Command |
|---|---|
| `build` | `tsc -p tsconfig.build.json` (→ `dist/`, tests excluded) |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `cli` | `node dist/cli/index.js` |
| `lint:docs` | `npm run build && node dist/cli/index.js validate docs/planning` |

There is no task caching, no affected-detection, and **no pinned runtime** — the Bun version used to build the eventual binary is implicit, so a cross-compiled artifact is not reproducible across machines. CI (the quality-checks workflow) runs the npm scripts directly.

## Proposed

Add moon config that models the existing tasks and pins the toolchain, keeping npm scripts working as thin pass-throughs so npm consumers and muscle memory are unaffected:

- `.moon/workspace.yml` — declare the single project (`'.'`) and VCS; ignore `.moon/cache`.
- moon **toolchain** config — enable the `javascript` + `bun` toolchains, set Bun as the package manager, and **pin** the Bun version (and Node, if the npm/`tsc` path needs it). (moon v2 / "Phobos" moved to WASM plugin toolchains — pin a v2.x and follow the Bun handbook.)
- root `moon.yml` — model `build`, `typecheck`, `test`, `lint-docs` as moon tasks with explicit `inputs` / `outputs` / `deps` so caching is correct: e.g. `build` outputs `dist/`; `test` inputs `src/**`, `tests/**`; `lint-docs` `deps: ['build']`.
- Keep `package.json` scripts as pass-throughs (or have CI call `moon run`), and keep `tsconfig.build.json` excludes + the `dist/` publish flow exactly as-is ([[D-0006-packaging]]: npm stays canonical).
- Coordinate CI with the existing quality-checks workflow: it runs the suite via `moon ci` / `moon run :build :typecheck :test :lint-docs` instead of (or wrapping) the raw npm scripts — one source of truth for tasks.
- Document the moon workflow + pinned versions in `README.md` (Develop section).

## Approach

1. Choose the install/pin method (proto-managed moon, or `bun add -D @moonrepo/cli`); pin the moon version.
2. Add `.moon/workspace.yml`, the toolchain config (pin Bun/Node), and the root `moon.yml` modeling the four tasks with inputs/outputs/deps.
3. Verify correctness: every `moon run :<task>` matches its npm-script result; a no-op re-run is a **cache hit** (near-instant); `lint-docs` triggers `build` via its dep.
4. Make npm scripts thin pass-throughs (preserve external behavior) and confirm `npm publish` dry-run still emits the same `dist/`.
5. Wire CI to moon, keeping it green.
6. `.gitignore` `.moon/cache`; document commands + pinned versions in `README.md`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.moon/workspace.yml` | new | declare the project, VCS |
| `.moon/toolchain.yml` (v2 toolchains) | new | enable javascript + bun; pin Bun/Node |
| `moon.yml` | new | root project: build / typecheck / test / lint-docs tasks (inputs/outputs/deps) |
| `package.json` | modify | scripts as pass-throughs; devDep on moon if npm-installed |
| `.github/workflows/*` | modify | run the suite via moon (coordinate with the quality-checks workflow) |
| `.gitignore` | modify | ignore `.moon/cache` |
| `README.md` | modify | Develop section: moon commands + pinned versions |

## Acceptance criteria

- [ ] AC-1: moon is installed and version-pinned; `moon run :build`, `:typecheck`, `:test`, and `:lint-docs` all succeed and match the current npm-script behavior.
- [ ] AC-2: A re-run of any task with no input change is a cache hit (near-instant); `lint-docs` depends on `build`.
- [ ] AC-3: The toolchain config **pins Bun** (and Node where needed) so a clean checkout uses identical versions on every machine and in CI.
- [ ] AC-4: The npm publish flow is unchanged — `tsc -p tsconfig.build.json` still emits `dist/` with co-located tests excluded; `npm run <script>` still works as a pass-through.
- [ ] AC-5: CI runs the full suite via moon and is green (no duplicate task definitions).
- [ ] AC-6: `.moon/cache` is gitignored; `README.md` documents the moon workflow and pinned versions.

## Out of scope

- **The physical workspace split** (`packages/core` + `apps/web`) — a separate follow-on once UI work begins; this task sets moon up so that split only *adds projects*. ([[D-0010-monorepo-tooling]] D3.)
- **`apps/web`** (Nuxt SPA + Nitro daemon) and the **`bun build --compile` binary matrix** — modeled as moon tasks when they land, not here ([[D-0012-distribution-single-exec-and-web-ui]]).
- **Remote caching** (moon's cloud) — local cache only for now.
- **Tauri** and any Rust crate — the polyglot payoff is the *reason* for moon, but no Rust project is added in this task.

## Dependencies

- Realizes [[D-0010-monorepo-tooling]] (Bun workspace + moon) and keeps [[D-0006-packaging]] intact (npm library canonical). The Bun runtime + workspace choice is [[D-0010-monorepo-tooling]]; its use for the cross-compiled binary is [[D-0012-distribution-single-exec-and-web-ui]]. Coordinate with the CI quality-checks workflow so the workflow has a single task source of truth.
