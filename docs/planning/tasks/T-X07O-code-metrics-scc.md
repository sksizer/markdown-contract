---
type: task
schema_version: '5'
id: T-X07O
status: in-progress
created: '2026-06-30'
related:
- '[[M-0010]]'
tags:
- quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-07-02T03:34:43Z'
last_reviewed: '2026-07-02'
---
# Add scc code metrics — lines of code and cyclomatic complexity reporting

## Goal

The repo has no repo-wide view of its own size or branch complexity: coverage
(T-79GV) reports line/branch execution but no lines-of-code totals, and Biome's
cognitive-complexity rule (T-0MVN) flags individual functions but yields no
aggregate. Add **scc** (boyter/scc — a single Go binary, "Sloc, Cloc and Code")
as a **report-only** code-metrics surface that emits lines-of-code, comment, and
blank counts per language/file plus a cyclomatic-complexity estimate and COCOMO
cost figures, so growth and complexity are visible on every push without being a
merge gate. This is *visibility*, complementing — not replacing — Biome's
per-function gate.

## Today

There is no repo-wide code-metrics or cyclomatic-complexity reporting; the
existing quality surfaces measure adjacent things and none of them count lines
of code.

| Location | Role today |
|---|---|
| `packages/core/src/` | The TypeScript source tree (`core/`, `runner/`, `cli/`, `declarative/`, `index.ts`) — the code whose size and branch complexity would be reported. No automated LOC or complexity metric is produced over it. |
| `.github/workflows/ci.yml` | The only CI workflow — runs build, typecheck, and test+coverage via the single `npx moon run :build :typecheck :coverage` line. Emits no code-metrics report; that `moon run` task list is the milestone's one shared coordination point. |
| `packages/core/moon.yml` | Task source of truth (`build` / `typecheck` / `test` / `coverage` / `lint-docs`). No metrics task. |
| `package.json` | Scripts cover build/typecheck/test/coverage and Biome (`lint` / `format` / `check`). No `metrics` script; scc is **not** an npm package, so it is not (and cannot be) a devDependency. |
| `packages/core/vitest.config.ts` | Its coverage thresholds gate line/branch/function/statement **coverage** (T-79GV) — execution ratios, not LOC totals or cyclomatic complexity. |
| `biome.json` | The `noExcessiveCognitiveComplexity` rule (at `warn`, applied by T-0MVN) measures per-function **cognitive** complexity — a different metric (cognitive ≠ cyclomatic) and per-function, not a repo-wide aggregate. |

## Proposed

A new dedicated **`.github/workflows/metrics.yml`** workflow installs a **pinned**
scc release and runs it over the source tree on every push to `main` and on pull
requests, producing two report artifacts:

1. A human-readable table written into the GitHub Actions **Step Summary**
   (`$GITHUB_STEP_SUMMARY`) via scc's CI-friendly ASCII output (`scc --ci`),
   fenced as a code block so it renders monospaced — showing per-language Files /
   Lines / Blanks / Comments / Code / Complexity plus the COCOMO estimate.
2. A machine-readable **JSON report** (`scc --format json --by-file`) uploaded as
   a build artifact for diffing/automation later.

The workflow is its **own file** — it deliberately does **not** extend the
`npx moon run …` line in `ci.yml`, so it adds no contention on the milestone's
shared coordination point and runs in parallel with the existing CI job. scc has
no native threshold-gating, so the run is **report-only**: it surfaces numbers
and never exits non-zero on them. The scc version is **pinned** in one place — a
`SCC_VERSION` env at the top of `metrics.yml` — so the numbers are reproducible
across runs.

A thin **`metrics`** npm script (`scc packages/core/src`) is added as a local convenience
pass-through for developers who have scc on `PATH` (installable via
`brew install scc` or `go install github.com/boyter/scc/v3@<pin>`); it is **not**
wired into the gated `moon run` line, `moon.yml`, or `sdlc.yaml` `quality_checks`,
because it depends on an external binary not guaranteed to be installed and is not
a gate. `README.md` documents the script and the install prerequisite.

## Approach

1. **Pin the scc version and choose the install path.** Pick a tagged scc release
   (e.g. `v3.5.0`) and record it as a `SCC_VERSION` env at the top of
   `metrics.yml`. Primary install: download that tagged release binary from
   `https://github.com/boyter/scc/releases` (no Go toolchain needed; verify the
   exact asset name, e.g. `scc_<ver>_Linux_x86_64.tar.gz`, at implementation),
   extract it onto `PATH`. Documented fallback (call out as the open decision):
   `go install github.com/boyter/scc/v3@${SCC_VERSION}` behind `actions/setup-go`
   if the release-asset path proves brittle.
2. **Add `.github/workflows/metrics.yml`.** One job on `ubuntu-latest`, triggered
   on `pull_request` and `push` to `main`, with `permissions: contents: read`:
   `actions/checkout@v4`, install pinned scc (step 1), then run scc over `packages/core/src`
   (optionally the whole repo too). Write the human summary with
   `scc --ci packages/core/src >> "$GITHUB_STEP_SUMMARY"` wrapped in a fenced block, and produce
   the JSON with `scc --format json --by-file -o scc-report.json packages/core/src` (or a single
   `scc --format-multi "tabular:stdout,json:scc-report.json" packages/core/src`).
3. **Upload the JSON report artifact.** `actions/upload-artifact@v4` with
   `name: code-metrics`, `path: scc-report.json`, `if-no-files-found: warn`.
4. **Add the local `metrics` npm script.** `"metrics": "scc packages/core/src"` in
   `package.json` — a thin pass-through that assumes scc on `PATH`.
5. **Document it in `README.md`.** A short note: what `npm run metrics` reports,
   that it requires scc on `PATH` (`brew install scc` / `go install …`), and that
   the workflow's pinned scc is the reproducible source of truth (local numbers may
   differ if a developer's scc version drifts from the pin).
6. **Verify.** Locally (with scc installed) confirm `npm run metrics` prints the
   per-language table with a Complexity column and COCOMO block, and confirm
   `scc --format json --by-file -o scc-report.json packages/core/src` writes valid JSON; confirm
   `metrics.yml` parses (e.g. `npx moon ci` is unaffected, and the workflow is
   syntactically valid). The live workflow run waits on GitHub Actions billing
   (see Dependencies).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/workflows/metrics.yml` | new | Report-only metrics workflow: install pinned scc (`SCC_VERSION` env), run it over `packages/core/src/`, write the `scc --ci` table into `$GITHUB_STEP_SUMMARY`, and upload a `scc --format json --by-file` report as the `code-metrics` artifact. Triggered on `pull_request` + push to `main`; never fails the build. |
| `package.json` | modify | Add a thin `"metrics": "scc packages/core/src"` script (local convenience; requires scc on `PATH`). Additive — no devDependency added (scc is not an npm package). |
| `README.md` | modify | Document `npm run metrics`: what it reports, the scc install prerequisite (`brew install scc` / `go install github.com/boyter/scc/v3@<pin>`), and that CI's pinned scc is the reproducible source of truth. |

## Acceptance criteria

- [ ] AC-1: `.github/workflows/metrics.yml` exists as its own workflow and pins the scc version in a single place (a `SCC_VERSION` env), installing exactly that tagged release — it does **not** add to or modify the `npx moon run …` task list in `ci.yml`.
- [ ] AC-2: The workflow writes a human-readable scc metrics table into the GitHub Actions Step Summary (`$GITHUB_STEP_SUMMARY`) showing per-language Lines / Comments / Blanks / Code and a Complexity (cyclomatic) column for `packages/core/src/`.
- [ ] AC-3: The workflow produces a machine-readable scc JSON report (`scc --format json --by-file`) and uploads it as a build artifact (`actions/upload-artifact`).
- [ ] AC-4: The workflow is **report-only** — it has no threshold/gating step and cannot fail the build on any LOC or complexity value (no step asserts on scc output).
- [ ] AC-5: `package.json` exposes a `metrics` script that shells out to `scc` over `packages/core/src/`, and no scc devDependency is added to `package.json` / `bun.lock` (scc is not an npm package).
- [ ] AC-6: `README.md` documents `npm run metrics`, including that scc must be installed on `PATH` (`brew install scc` or `go install`) and the workflow's pinned version is the reproducible reference.

## Out of scope

- **Any hard LOC/complexity gate or threshold-fail** — scc has no native threshold-gating and this task is report-only by design; turning a metric into a merge gate is a separate, deliberate decision.
- **Per-function cognitive-complexity gating** — that is Biome's `noExcessiveCognitiveComplexity` rule, applied and gated by **T-0MVN**; this task reports the orthogonal repo-wide *cyclomatic* aggregate.
- Touching the shared gate surfaces — `moon.yml`, the `npx moon run` line in `ci.yml`, and `sdlc.yaml` `quality_checks` are intentionally left alone (the dedicated `metrics.yml` is what keeps them untouched).
- Language-specific scc tuning beyond TypeScript (custom `--cocomo`/SLOC weights, per-language overrides), and the non-default scc output formats (HTML/CSV dashboards, `--format-multi` fan-out beyond the JSON report).
- Trend storage / historical diffing of metrics across commits (the JSON artifact merely makes that possible later).

## Dependencies

- **No hard dependency** — nothing blocks authoring or wiring this; frontmatter `depends_on` is intentionally empty.
- **Shared-surface coordination (soft):** the only milestone-shared file this touches is `package.json` (an additive `metrics` script). It deliberately uses its own `.github/workflows/metrics.yml` rather than extending the `npx moon run :build :typecheck :coverage` line in `ci.yml`, so it adds **no** contention on the milestone's one genuine coordination point; a concurrent task touching `package.json` scripts may force at most a trivial rebase.
- **Relationship (not blocking):** complements **T-0MVN** (Biome cognitive-complexity gate) and **T-79GV** (coverage gate) — different metrics, different enforcement posture (report vs gate).
- **Risk:** the repo's GitHub Actions are currently billing-blocked, so the live `metrics.yml` run (and its Step Summary / artifact) will not appear until Actions billing is unblocked. This blocks only the live run, not authoring the workflow or using the local `npm run metrics` script.

## Discovery context

Surfaced while planning the M-0010 quality-tooling milestone: the user explicitly
asked for repo-wide lines-of-code and cyclomatic-complexity reporting. Coverage
(T-79GV) and Biome's per-function cognitive-complexity rule (T-0MVN) cover
adjacent ground but neither produces an aggregate LOC/cyclomatic view, so scc was
chosen as the dedicated, report-only metrics surface.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
