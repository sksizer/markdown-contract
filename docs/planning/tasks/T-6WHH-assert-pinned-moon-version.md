---
type: task
schema_version: '5'
id: T-6WHH
status: in-progress
created: '2026-07-04'
related: []
tags: []
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: '2026-07-04T11:13:24Z'
last_reviewed: '2026-07-04'
---
# Guard that bunx moon resolves the pinned @moonrepo/cli, not a shadowing global proto moon

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 from the linked backlog origin story
> ([[B-QF64-assert-pinned-moon-version]]). Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

During T-WKSP, `bunx moon` silently resolved a global proto-managed moon (1.41.8)
instead of the workspace-pinned `@moonrepo/cli@2.3.5`, because moon lived only in
`packages/core`'s devDeps (not the root) and moon's version-inverted config schema
surfaced the mismatch as a config parse error rather than an obvious "wrong moon."
Under the wrong moon the per-task `toolchain:` split degraded to `system`, so the
bun/node gate was not actually enforced. Add a cheap preflight that fails loudly when
`bunx moon --version` does not equal the pinned CLI version, so the regression cannot
silently return on any machine with a global proto moon on `PATH`.

## Today

| Location | Role today |
|---|---|
| `package.json` | Root manifest; pins `@moonrepo/cli` at `2.3.5` (and `@biomejs/biome`) in devDependencies so `bun install` hoists moon into the root `node_modules/.bin`. |
| `.moon/toolchains.yml` | Pins the `bun` (1.3.14) and `node` (22.12.0) runtimes moon launches tasks under — but does not pin or assert moon's own binary version. |
| `.github/workflows/ci.yml` | Runs `bunx moon run :build :typecheck :coverage :lint example-single-binary:test` after `bun install --frozen-lockfile`; no step asserts the resolved moon is the pinned CLI. |
| `sdlc.yaml` | Carries `quality_checks:` and a commented `worktree_init:` block — the hook point for a per-worktree bootstrap check. |

## Proposed

A single preflight asserts that the moon `bunx moon` resolves is the workspace-pinned
`@moonrepo/cli` version, failing with a clear message (naming both versions and the
likely cause) when a global/proto moon shadows it. It runs in CI before the `moon run`
step and is available as a local/worktree bootstrap check, so a shadowing global moon
fails the build instead of silently degrading the toolchain split to `system`.

## Approach

1. Add a small check script (e.g. `scripts/assert-moon-version.sh`) that reads the
   pinned version from root `package.json` (`.devDependencies["@moonrepo/cli"]`,
   stripping any range prefix), compares it to the output of `bunx moon --version`, and
   exits non-zero with a message naming both the expected and resolved versions and the
   likely cause (a global proto moon earlier on `PATH`) when they differ.
2. Wire it into `.github/workflows/ci.yml` as a step immediately before the
   `bunx moon run …` step so CI fails fast on a shadowed moon.
3. Add the same script as a `worktree_init:` verb in `sdlc.yaml` so a fresh worktree
   bootstrap surfaces the shadow locally — the environment where T-WKSP first hit it.
4. Verify by temporarily putting a different-version `moon` earlier on `PATH` and
   confirming the script fails; confirm it passes on a clean checkout.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `scripts/assert-moon-version.sh` | new | Preflight comparing `bunx moon --version` against the pinned `@moonrepo/cli` in root `package.json`; fails loudly on mismatch. |
| `.github/workflows/ci.yml` | modify | Add a guard step running the preflight before the `bunx moon run …` step. |
| `sdlc.yaml` | modify | Add the preflight as a `worktree_init:` verb so fresh worktrees catch a shadowing global moon locally. |

## Acceptance criteria

- [ ] AC-1: On a clean checkout the preflight exits 0 and prints the resolved moon version, which equals `@moonrepo/cli` in root `package.json` (2.3.5).
- [ ] AC-2: With a different-version `moon` earlier on `PATH`, the preflight exits non-zero and its message names both the expected and resolved versions.
- [ ] AC-3: `.github/workflows/ci.yml` runs the preflight as a step ordered before the `bunx moon run …` step, so a shadowed moon fails the CI job.

## Out of scope

- Changing which moon version is pinned, or upgrading `@moonrepo/cli`.
- Pinning moon's own binary version inside `.moon/toolchains.yml` (moon's WASM toolchains manage runtimes, not the moon binary) — the pin stays in root `package.json`.
- Asserting the bun/node runtime versions themselves — that is the toolchain pin's job, separate from catching a shadowed moon binary.

## Dependencies

- none (the root-devDep fix from T-WKSP already landed; this only adds the guard).

## Discovery context

Promoted from [[B-QF64-assert-pinned-moon-version]]. Surfaced during T-WKSP when
`bunx moon` ran a global proto moon 1.41.8 instead of the pinned 2.3.5, silently
degrading the per-task toolchain split to `system` so the bun/node gate went
unenforced.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
