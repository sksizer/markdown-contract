---
type: task
schema_version: "5"
id: T-HIL6
status: in-progress
created: 2026-06-30
related:
  - "[[M-0010]]"
tags:
  - quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: 2026-07-01T18:18:32Z
last_reviewed: 2026-07-01
prs:
  - https://github.com/sksizer/markdown-contract/pull/143
---
# Add knip to detect unused files, exports, and dependencies

## Goal

The library carries no detector for dead code — unused files, unused exports,
or unused (dev)dependencies all accumulate silently, inflating the published
surface and the dependency tree. Add **knip** (config + `npm run lint:deps` +
a report-only CI job) so the project gets a documented baseline of what is
unreferenced, alongside the coverage gate (T-79GV) and the Biome lint gate
(T-0MVN). This task wires the detector and captures the baseline; it does **not**
delete anything knip finds (that is a separate cleanup) and does **not** yet
gate the build.

## Today

knip is absent, and the repo's strong conventions (re-export-only barrels,
co-located peer tests, a `tests/` fixture corpus) are exactly the patterns a
naive knip run misreads — so the value is entirely in the config, not the
install.

| Location | Role today |
|---|---|
| `package.json` | Declares devDeps + thin pass-through scripts (`build`/`typecheck`/`test`/`coverage`/`lint`/…). No `knip` dep and no `lint:deps` script; no unused-code/dep detector exists. |
| `packages/core/moon.yml` | Wraps the npm scripts as cached moon tasks (`build`, `typecheck`, `test`, `coverage`, `lint-docs`). No `lint-deps` task. |
| `.github/workflows/ci.yml` | Runs `npx moon run :build :typecheck :coverage` (the one shared `moon run` task-list line). No dead-code report. |
| `packages/core/src/index.ts` | Published surface — the `.` export (root API). In `package.json` it maps to `dist/` (build output), so knip's default entry resolution points at `dist/`, not `src/` — without config it finds no entry into the source tree and reports nearly everything as unused. |
| `packages/core/src/declarative/index.ts` | Published surface — the `./declarative` export. Like the root entry it maps to `dist/` in `package.json`, so knip needs an explicit `entry` to reach it in `src/`; otherwise its re-exported API reads as unused. |
| `packages/core/src/cli/index.ts` | Published surface — the `markdown-contract` bin. Also mapped to `dist/` in `package.json`, so it too needs an explicit `src/` entry or knip finds no path into the CLI source. |
| `packages/core/src/core/index.ts` | Re-export-only **barrel** (CLAUDE.md → Modules & barrels). Its exports are consumed only through the barrel and are reachable from the published entries; a naive run with no config flags such re-exports as unused. |
| `packages/core/src/runner/index.ts` | Re-export-only **barrel**. Same shape — consumed through the barrel, reached from the published entries — so it needs the entry config to avoid every re-export reading as a false positive. |
| `packages/core/src/core/dialect/index.ts` | Re-export-only **barrel** (`anchors` + `wikilinks`). Same shape — consumed through the barrel; without the entry config a naive run flags its re-exports as unused. |
| `packages/core/src/**/*.test.ts` | Co-located peer unit tests (CLAUDE.md → Tests). Not reachable from the production entries; a naive run flags them as unused files and flags test-only helpers/exports as dead. |
| `packages/core/tests/` | The fixture-driven integration corpus — `harness.ts`, `components.ts`, the `*.test.ts` runners, and `fixtures/**` (consumption / infer / validation fixture modules, several loaded dynamically). Not reachable from production entries; a naive run flags the whole tree as unused. |

## Proposed

A committed `knip.json` teaches knip this repo's shape so a run reports only
**genuine** dead code, never the conventional barrels or test corpus:

- `entry` lists the real entrypoints knip cannot infer because the manifest
  points at `dist/`: the three published source barrels
  (`packages/core/src/index.ts`, `packages/core/src/declarative/index.ts`,
  `packages/core/src/cli/index.ts`), the test config
  (`packages/core/vitest.config.ts`), the co-located unit tests
  (`packages/core/src/**/*.test.ts`), and the integration corpus
  (`packages/core/tests/**/*.test.ts`, `packages/core/tests/harness.ts`,
  `packages/core/tests/components.ts`, `packages/core/tests/fixtures/**/*.ts`).
  Marking the published barrels
  as entries means their public exports are never reported as unused (knip does
  not report exports of entry files by default); marking the test/fixture files
  as entries keeps the corpus and its helpers live rather than "unused files".
- `project` is `packages/core/src/**/*.ts` — the set knip scans for unused source files and
  exports. Internal barrels (`core`/`runner`/`dialect`) are reachable from the
  published entries and re-export consumed symbols, so they resolve as used.
- An `ignoreDependencies` / `ignoreBinaries` tail absorbs the few deps invoked
  by binary rather than imported (notably `@moonrepo/cli`, run as `moon` /
  `npx moon`, never `import`-ed) so they are not standing false positives.

`package.json` gains `knip` as a devDependency and a `lint:deps` script that is
exactly `knip` (true exit codes preserved, so the later gating flip is a no-op
on the script). `moon.yml` gains a cached `lint-deps` task wrapping
`npm run lint:deps`, with `runInCI: false` (it is exercised by its own workflow,
like `lint-docs`). A dedicated `.github/workflows/knip.yml` runs it
**report-only** — the knip step is `continue-on-error: true`, so findings are
surfaced in the job log but never fail CI — and it deliberately does **not**
touch the shared `moon run :build :typecheck :coverage` line in `ci.yml`. The
first triaged run's findings (counts + lists of unused files / exports /
dependencies) are recorded as the documented baseline the cleanup follow-up
consumes.

## Approach

1. Add `knip` (`^5`) to `devDependencies` in `package.json` and a `"lint:deps": "knip"` script (thin pass-through, matching the existing scripts). Leave the script as bare `knip` so it keeps real exit codes — the report-only behavior lives in CI, not the script, so flipping to gating later needs no script change.
2. Author `knip.json` at the repo root with the entry/project config from `## Proposed`:
   ```json
   {
     "$schema": "https://unpkg.com/knip@5/schema.json",
     "entry": [
       "packages/core/src/index.ts",
       "packages/core/src/declarative/index.ts",
       "packages/core/src/cli/index.ts",
       "packages/core/vitest.config.ts",
       "packages/core/src/**/*.test.ts",
       "packages/core/tests/**/*.test.ts",
       "packages/core/tests/harness.ts",
       "packages/core/tests/components.ts",
       "packages/core/tests/fixtures/**/*.ts"
     ],
     "project": ["packages/core/src/**/*.ts"],
     "ignoreDependencies": [],
     "ignoreBinaries": []
   }
   ```
3. Run `npm run lint:deps` locally and triage the first output. Confirm the three published barrels' public exports, the co-located `*.test.ts`, and `tests/fixtures/**` are **not** reported (if any are, fix `entry` before proceeding). Move binary-invoked-only deps (at minimum `@moonrepo/cli`; check `remark-stringify` and the `@types/*` packages) into `ignoreDependencies` / `ignoreBinaries` so a clean re-run's remaining findings are all genuine. Open decision to resolve during triage: whether any internal barrel re-export is a real unused export (leave it in the baseline for the cleanup task) vs. a config gap (add to `entry`).
4. Add a `lint-deps` task to `moon.yml` wrapping `npm run lint:deps` (toolchain `node`, `runInCI: false`, `options.cache: true`, no outputs), with `inputs` covering `src/**/*`, `tests/**/*`, `knip.json`, `package.json`, `tsconfig.json`, and `vitest.config.ts`. Verify `npx moon run :lint-deps` runs it.
5. Add `.github/workflows/knip.yml`: a single `ubuntu-latest` job mirroring `ci.yml`'s setup (`actions/checkout@v4` with `fetch-depth: 0`, `actions/setup-node@v4` Node 20 + npm cache, `npm ci`, the `~/.proto` toolchain cache), then a report-only step `npx moon run :lint-deps` with `continue-on-error: true`. Trigger on `pull_request` and `push` to `main`. Do not edit the `moon run :build :typecheck :coverage` line in `ci.yml`.
6. Record the baseline: run `npx knip` once on the finished config and capture the unused files / exports / dependencies it reports (counts + the lists) into the PR description as the documented baseline, and note it is the input the dead-code cleanup follow-up will work from.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `package.json` | modify | Add `knip` (`^5`) to `devDependencies`; add `"lint:deps": "knip"` to `scripts`. |
| `knip.json` | new | knip config: `entry` (published barrels + `vitest.config.ts` + co-located `*.test.ts` + the `tests/` corpus), `project` (`src/**/*.ts`), and the `ignoreDependencies`/`ignoreBinaries` tail. |
| `packages/core/moon.yml` | modify | Add a cached `lint-deps` task wrapping `npm run lint:deps`, `runInCI: false`. |
| `.github/workflows/knip.yml` | new | Report-only CI job running `npx moon run :lint-deps` with `continue-on-error: true`; does not touch `ci.yml`. |

## Acceptance criteria

- [ ] AC-1: `knip.json` exists declaring `entry` (including `packages/core/src/index.ts`, `packages/core/src/declarative/index.ts`, `packages/core/src/cli/index.ts`, `packages/core/vitest.config.ts`, `packages/core/src/**/*.test.ts`, and the `packages/core/tests/` corpus) and `project` `packages/core/src/**/*.ts`. A knip run reports **none** of the three published barrels' public exports, **no** co-located `*.test.ts` file, and **no** `packages/core/tests/fixtures/**` file as unused — the barrel and test-corpus conventions produce zero false positives.
- [ ] AC-2: `package.json` declares `knip` as a devDependency and a `lint:deps` script equal to `knip`; `npm run lint:deps` runs knip and reports the three categories (unused files, unused exports, unused dependencies/devDependencies), exiting non-zero only when knip finds issues.
- [ ] AC-3: `moon.yml` defines a `lint-deps` task wrapping `npm run lint:deps` with `runInCI: false`, and `npx moon run :lint-deps` runs it.
- [ ] AC-4: `.github/workflows/knip.yml` runs knip on `pull_request` and `push` to `main` as **report-only** — the knip step is `continue-on-error: true` so a finding does not fail the workflow — and the `moon run :build :typecheck :coverage` line in `.github/workflows/ci.yml` is unchanged.
- [ ] AC-5: The first triaged run's findings (counts plus the lists of unused files, unused exports, and unused dependencies) are recorded in the PR description as the documented baseline for the dead-code cleanup follow-up.
- [ ] AC-6: Any dependency knip can only see by binary rather than by import (at minimum `@moonrepo/cli`) is captured in `knip.json`'s `ignoreDependencies`/`ignoreBinaries` so the recorded baseline contains only genuine findings, not tooling false positives.

## Out of scope

- Deleting or refactoring the dead code knip reports — removing unused files/exports/deps is a separate cleanup task that consumes this baseline.
- Making knip a hard gate: adding it to the main `npx moon run` task list in `ci.yml`, flipping `runInCI` to true, removing `continue-on-error`, or adding `npm run lint:deps` to `sdlc.yaml` `quality_checks` are all the deferred gating flip, not this task.
- Bringing `tests/**/*.ts` into knip's `project` set to detect unused test-only helpers — entries keep the corpus live for this pass; analyzing it as project is a later enhancement.
- Deep knip plugin/workspace tuning beyond what this single-project repo needs (no monorepo `workspaces` config).

## Dependencies

- No hard task dependency (no `depends_on`).
- **Shared surfaces (additive, coordinate within M-0010):** this task edits `package.json` (a devDep + one script) and `moon.yml` (one new task block) additively — sibling M-0010 tasks (e.g. T-0MVN Biome, T-79GV coverage) touch the same two files, so the last to merge may need a trivial rebase. The dedicated `knip.yml` workflow is chosen specifically to **avoid** the one genuine coordination point — the `moon run :build :typecheck :coverage` line in `ci.yml`; `sdlc.yaml` `quality_checks` is intentionally left untouched here and is part of the deferred gating flip.

## Discovery context

Surfaced while planning M-0010 quality tooling: package hygiene needs a
dead-code / unused-dependency detector alongside the coverage gate (T-79GV) and
the Biome lint gate (T-0MVN). knip was singled out because the repo's barrel and
co-located-test conventions make an unconfigured run useless — the spec's value
is the entry/project config that suppresses those false positives.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `bun run lint:deps` reports **0 unused files** and none of the three published barrels' public exports, no co-located `*.test.ts`, and no `tests/fixtures/**` file; zero conventional false positives confirmed.
- AC-2: auto — `bun run lint:deps` runs `knip`, reports unused files / exports / dependencies, and exits `1` only when findings exist.
- AC-3: auto — `bunx moon task core:lint-deps` shows the registered task (command `npm run lint:deps`, node toolchain, `runInCI: false`); `bunx moon run core:lint-deps` executes knip.
- AC-4: auto — `git diff main -- .github/workflows/ci.yml` is empty (the shared `moon run :build :typecheck :coverage` line is untouched); `knip.yml` runs on `pull_request` + `push: main` with the knip step `continue-on-error: true`.
- AC-5: agent-manual — final knip baseline captured (0 files, 9 exports, 4 exported types, 0 deps, 0 devDeps = 13 genuine findings) and recorded in the PR description.
- AC-6: agent-manual — verified no tooling false positives: `@moonrepo/cli`/`moon` resolves via knip's GitHub-Actions plugin, `remark-stringify` is imported by `projection.test.ts`, `@types/*` are detected; `ignoreDependencies`/`ignoreBinaries` left empty (adding `@moonrepo/cli` produced spurious "remove from ignore" hints).

### What worked

- The deterministic readiness gate and quality baseline (0 pre-existing findings) ran clean; the additive config kept the `build`/`typecheck`/`test` gate green with zero new drift.
- knip's own output made triage fast — the clean split into unused files / exports / exported types / dependencies let the config converge on a genuine-only baseline quickly.
- The barrel + co-located-test conventions the spec worried about produced zero false positives once the `entry` list was correct, exactly as designed.

### Friction and automation gaps

- Spec premised on a **single-project repo** (Out of scope: "no monorepo workspaces config"), but the repo is a **Bun monorepo** — knip auto-detects `.` / `packages/core` / `apps/web` as separate workspaces, so the spec's literal top-level `entry`/`project` never reached `packages/core` and left the `declarative`/`cli` barrels reported (AC-1 violation). A minimal `packages/core`-scoped `workspaces` block was required, diverging from the (wrongly-premised) out-of-scope note. → Specs for workspace-topology-sensitive tooling should assert the actual workspace shape before prescribing config; a spec-authoring lint could flag a "single-project" claim against a `workspaces` field in `package.json`. Captured as backlog task.
- Spec's Approach step 5 CI recipe was stale (`actions/setup-node` + `npm ci`) while the real `ci.yml` is Bun-based (`setup-bun` + `bun install --frozen-lockfile`); the relevance check caught it, but the spec prose still said npm. → When a spec is re-pointed to a new layout (e.g. #136), re-point the CI-recipe prose too, not just the file paths.
- moon's `runInCI: false` skips a task even for an explicit `moon run` once it detects CI (non-empty `CI` env var), so the dedicated `knip.yml` workflow needed an `env: CI: ''` override to actually exercise the report-only task via moon. Non-obvious moon behavior the spec did not anticipate. → Document the `runInCI: false` + dedicated-side-gate-workflow pattern (and the `CI:''` override) in the moon conventions so the next report-only workflow doesn't rediscover it. Captured as backlog task.
- The spec explicitly defers deleting the dead code knip found; the 13-finding baseline now has a home. → Dead-code cleanup captured as a backlog task consuming this baseline.
