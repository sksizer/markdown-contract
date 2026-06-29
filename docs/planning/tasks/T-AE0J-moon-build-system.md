---
type: task
schema_version: '5'
id: T-AE0J
status: closed/superseded
created: '2026-06-28'
completion_note: 'Superseded by T-MOON, which adopted moon the Bun way per D-0010 (pinned Bun 1.3.14 / Node 20.20.2; cached build/typecheck/test/lint-docs tasks; CI via moon; shipped #61). T-AE0J was a parallel sub-agent draft assuming a Node 20 + npm + package-lock toolchain — the opposite of D-0010 (D1/D2 pin Bun) — so its toolchain approach is not wanted; the published library stays npm/Node-compatible via packages/core''s tsc publish flow regardless. The remaining packages/core + apps/web workspace split is carried by T-WKSP. No code from this task was used.'
related:
- '[[M-0005-monorepo-tooling]]'
tags:
- build
- tooling
need_human_review: false
impact: medium
complexity: large
---
# Adopt the moon (moonrepo) task runner to wrap and cache the build, typecheck, and test workflows

> ASSUMPTIONS (extrapolated by sub-agent — review carefully):
> - **Single root project**, not a multi-package monorepo. moon manages one project (`markdown-contract`) mapped to the repo root (`.`); no workspace restructure, no `packages/*` split.
> - **Node pinned to 20.x** in `.moon/toolchain.yml` (`20.19.0`) to match `package.json` `engines.node >=20` and the current CI pin of Node 20. moon manages this Node hermetically for task execution.
> - **Package manager stays npm** (`package-lock.json` is the committed lockfile); moon's toolchain declares `packageManager: npm`.
> - **moon tasks run the underlying commands directly** (`tsc -p tsconfig.build.json`, `tsc --noEmit`, `vitest run`) rather than shelling back through `npm run …`, so moon sees real inputs/outputs for caching and avoids a redundant npm→tsc process layer.
> - **The existing `package.json` scripts are KEPT unchanged** as thin convenience wrappers / the human-facing entry points; moon coexists beside them and does not replace them. `sdlc.yaml` `quality_checks` keep calling the npm scripts.
> - **moon install method: `@moonrepo/cli` as a devDependency**, invoked via `npx moon` (so `npm ci` brings it in for both local and CI use). proto is documented as an optional alternative, not required.
> - **Tasks wrapped: `build`, `typecheck`, `test`, and an aggregate `check`** only. The ancillary scripts (`test:watch`, `cli`, `lint:docs`, `prepublishOnly`) are intentionally left out of moon for now.

## Goal

The project's build, typecheck, and test commands are plain `npm` scripts with no caching, no dependency graph, and no affected-detection — every CI run and every local check re-runs `tsc` and `vitest` from scratch even when nothing relevant changed. Adopt moon (moonrepo's Rust task runner) to wrap these workflows as cacheable tasks with declared `inputs`/`outputs` and an aggregate `check` gate, so repeated and unaffected runs are served from cache locally and in CI, while the existing `npm` scripts keep working untouched.

## Today

The repo is a single npm package. Build/typecheck/test are npm scripts invoked directly (locally, in CI, and by the SDLC quality gate); there is no task runner, no caching, and no moon configuration of any kind.

| Location | Role today |
|---|---|
| `package.json` | Defines the `build` (`tsc -p tsconfig.build.json`), `typecheck` (`tsc --noEmit`), and `test` (`vitest run`) scripts, plus `test:watch`/`cli`/`lint:docs`/`prepublishOnly`. `engines.node` is `>=20`. |
| `package-lock.json` | Committed npm lockfile; `npm ci` installs from it. |
| `tsconfig.build.json` | Build config consumed by `npm run build` (`tsc -p`); emits to `dist/`. |
| `tsconfig.json` | Base TS config used by `npm run typecheck` (`tsc --noEmit`), `include: ["src","tests"]`. |
| `vitest.config.ts` | Vitest config discovering `src/**/*.test.ts` and `tests/**/*.test.ts`; `npm run test` runs `vitest run`. |
| `.github/workflows/ci.yml` | CI workflow: on PR + push-to-main, runs `npm ci` then `npm run typecheck` and `npm run test` as separate raw-npm steps (no caching beyond `setup-node`'s npm cache). |
| `sdlc.yaml` | Declares `quality_checks: [npm run test, npm run typecheck]` — the local task-work gate. |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.sdlc/`, etc.; has no moon entries. |

## Proposed

A committed moon workspace lives at the repo root: `.moon/workspace.yml` (declares the single root project + git VCS settings), `.moon/toolchain.yml` (pins Node 20.x and `packageManager: npm`), and a root `moon.yml` defining four tasks — `build`, `typecheck`, `test`, and an aggregate `check` (depends on `typecheck` + `test`) — each with `inputs`/`outputs` so moon caches and replays unaffected runs. `@moonrepo/cli` is a devDependency, so `npm ci && npx moon run markdown-contract:check` works locally and in CI. CI is rewritten to install moon and run `moon ci`, replacing the two raw-npm steps. The existing `npm` scripts and `sdlc.yaml` quality checks are unchanged: moon is additive. `.gitignore` ignores moon's local cache (`.moon/cache`) while keeping the `.moon/*.yml` config tracked.

## Approach

1. **Add moon as a devDependency.** Add `@moonrepo/cli` to `package.json` `devDependencies` and run `npm install` to update `package-lock.json`. This makes `npx moon …` resolvable after `npm ci` both locally and in CI (no global/proto install required).
2. **Create `.moon/workspace.yml`.** Declare the single root project via a `projects` map (`markdown-contract: '.'`) and set `vcs` to `manager: git` with `defaultBranch: 'main'` so `moon ci` can diff affected tasks against `main`.
3. **Create `.moon/toolchain.yml`.** Configure the Node toolchain: `node.version: '20.19.0'` (a concrete 20.x LTS matching `engines.node`) and `node.packageManager: 'npm'`, so moon executes tasks under a hermetic, pinned Node.
4. **Create the root `moon.yml`.** Mark it `type: library`, `language: typescript`, and define tasks that run the underlying commands directly:
   - `build` → `tsc -p tsconfig.build.json`; `inputs: [src/**/*, tsconfig.json, tsconfig.build.json, package.json]`; `outputs: [dist]`.
   - `typecheck` → `tsc --noEmit`; `inputs: [src/**/*, tests/**/*, tsconfig.json, package.json]`; no outputs (a pure check).
   - `test` → `vitest run`; `inputs: [src/**/*, tests/**/*, vitest.config.ts, tsconfig.json, package.json]`; no outputs.
   - `check` → an aggregate (no own command, e.g. `command: 'noop'`) with `deps: [typecheck, test]`; this is the single CI/local gate.
5. **Keep `package.json` scripts as-is.** The `build`/`typecheck`/`test` scripts remain the canonical command strings (and stay the entry points used by `sdlc.yaml` quality checks, `lint:docs`, and `prepublishOnly`); moon tasks intentionally duplicate the command strings so moon owns the input/output graph. Do not delete or repoint any existing script.
6. **Rewrite `.github/workflows/ci.yml`.** Keep the `checkout` + `setup-node@v4` (Node 20, `cache: npm`) + `npm ci` bootstrap, but set `fetch-depth: 0` on checkout so moon's affected detection has history, and replace the two raw `npm run typecheck` / `npm run test` steps with a single step running `npx moon ci` (equivalently `npx moon run :check`). `setup-node` + `npm ci` bootstrap the moon binary; moon then manages the pinned task Node.
7. **Update `.gitignore`.** Add `.moon/cache/` (and `.moon/docker/`) so moon's local cache is never committed, while the tracked `.moon/workspace.yml`, `.moon/toolchain.yml`, and root `moon.yml` stay versioned.
8. **Verify locally.** Run `npx moon run markdown-contract:check` on a clean tree: confirm it runs typecheck + test and exits 0. Re-run with no changes and confirm moon reports the tasks as cached/replayed (caching works). Confirm `npm run build|typecheck|test` still work unchanged.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.moon/workspace.yml` | new | Declare the root project (`markdown-contract: '.'`) and `vcs.defaultBranch: main`. |
| `.moon/toolchain.yml` | new | Pin Node `20.19.0` and `packageManager: npm` for hermetic task execution. |
| `moon.yml` | new | Root project config: `build`, `typecheck`, `test`, and aggregate `check` tasks with `inputs`/`outputs`/`deps`. |
| `package.json` | modify | Add `@moonrepo/cli` to `devDependencies`; existing scripts unchanged. |
| `package-lock.json` | modify | Regenerated by `npm install` to record `@moonrepo/cli` (and transitive deps). |
| `.github/workflows/ci.yml` | modify | Add `fetch-depth: 0` to checkout; replace the raw `npm run typecheck`/`npm run test` steps with a single `npx moon ci` step. |
| `.gitignore` | modify | Ignore `.moon/cache/` and `.moon/docker/`; keep the `.moon/*.yml` config tracked. |

## Acceptance criteria

- [ ] AC-1: `.moon/workspace.yml` exists, is valid YAML, and maps the project `markdown-contract` to `.` with `vcs.defaultBranch: main`.
- [ ] AC-2: `.moon/toolchain.yml` exists, is valid YAML, pins `node.version` to a `20.x` value, and sets `node.packageManager: npm`.
- [ ] AC-3: Root `moon.yml` defines tasks `build`, `typecheck`, `test`, and `check`; `check` declares `deps` containing both `typecheck` and `test`, and `build` declares `outputs` including `dist`.
- [ ] AC-4: `npx moon run markdown-contract:check` (equivalently `npx moon run :check`) runs the typecheck and test commands and exits 0 on a clean working tree — the same pass condition as `npm run typecheck && npm run test`.
- [ ] AC-5: Immediately re-running the same moon task with no input changes is served from moon's cache (moon labels the run as cached/replayed rather than re-executing `tsc`/`vitest`).
- [ ] AC-6: `.github/workflows/ci.yml` no longer contains raw `npm run typecheck` / `npm run test` steps; instead it installs moon (via `npm ci` of `@moonrepo/cli`) and runs `npx moon ci` (or `npx moon run :check`), with `fetch-depth: 0` on checkout.
- [ ] AC-7: `.gitignore` ignores `.moon/cache/`, and `git check-ignore` does NOT match `.moon/workspace.yml`, `.moon/toolchain.yml`, or `moon.yml` (config stays tracked).
- [ ] AC-8: `@moonrepo/cli` appears in `package.json` `devDependencies` and is present in `package-lock.json`, so `npm ci` makes `npx moon` resolvable.
- [ ] AC-9: The pre-existing `npm run build`, `npm run typecheck`, and `npm run test` scripts still exist verbatim and run successfully — moon is additive, not a replacement.

## Out of scope

- Converting the repo into a true multi-package monorepo (multiple moon projects / a `packages/*` split) — moon manages one root project only.
- Mandating proto as the sole install path or removing `actions/setup-node` from CI — npm-installed `@moonrepo/cli` is the baseline; proto stays an optional, documented alternative.
- Repointing `sdlc.yaml` `quality_checks` or the local task-work gate at moon — they keep invoking the `npm` scripts.
- Remote / distributed caching (moonbase or a remote cache backend) and any caching beyond moon's default local cache.
- Wrapping the ancillary scripts (`test:watch`, `cli`, `lint:docs`, `prepublishOnly`) as moon tasks — only `build`/`typecheck`/`test`/`check` are in scope.
- Deleting or rewriting any existing `package.json` script.

## Dependencies

- none

## Discovery context

Extrapolated by a sub-agent at the user's request: stand up the moon build system for this repo as a spec-only task for human review. No prior incident or design doc — the requirements below are inferred from the repo's current npm-script + CI shape.
