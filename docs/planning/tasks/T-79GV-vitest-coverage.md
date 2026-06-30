---
type: task
schema_version: '5'
id: T-79GV
status: closed/done
created: '2026-06-30'
related:
- '[[M-0010]]'
tags:
- quality
- coverage
- vitest
- testing
need_human_review: false
impact: medium
complexity: medium
completion_note: 'Delivered in the M-0010 opening PR — added @vitest/coverage-v8,
  a v8 coverage block with per-metric thresholds in vitest.config.ts, an npm
  `coverage` script, a moon `:coverage` task, and wired CI to run `:coverage`
  (subsuming `:test`) plus upload the report. Baseline at adoption: statements
  91.2%, branches 82.2%, functions 94.87%, lines 93.5% (547 tests).'
---
# Add vitest v8 test coverage with reporting and a threshold gate

## Goal

The suite is large (547 tests) and well-covering, but nothing measures or enforces
coverage — a PR can quietly delete tested paths. Wire `vitest`'s built-in v8 coverage
provider with reporters and a per-metric **threshold gate** so CI fails on a coverage
regression, and surface an HTML/lcov report for humans. This is the test-coverage half of
the M-0010 foundation; it lands in the milestone-opening PR (no source churn).

## Today

| Location | Role today |
|---|---|
| `vitest.config.ts` | Discovers `src/**/*.test.ts` + `tests/**/*.test.ts`; no `coverage` block, so `vitest run` reports nothing about coverage |
| `package.json` | Has `test` (`vitest run`) but no coverage script and no `@vitest/coverage-v8` dep |
| `moon.yml` | Models `build`/`typecheck`/`test`/`lint-docs`; no coverage task |
| `.github/workflows/ci.yml` | Runs `moon run :build :typecheck :test` — no coverage measured or gated |

## Proposed

`vitest run --coverage` produces a coverage report (text summary + HTML + lcov +
json-summary) from the v8 provider and **exits non-zero** when statements/branches/
functions/lines fall below configured floors. The run is modeled as the moon `:coverage`
task and replaces `:test` in CI (coverage runs the same suite, so the gate rides the
normal run rather than doubling it). The HTML/lcov report is uploaded as a CI artifact.

## Approach

1. Add `@vitest/coverage-v8` (matching `vitest` ^4) to `devDependencies`.
2. Add a `coverage` block to `vitest.config.ts`: `provider: "v8"`, `all: true` with
   `include: ["src/**/*.ts"]` (so untested files surface at 0%, not omitted),
   `exclude: ["src/**/*.test.ts", "**/*.d.ts"]`, `reporter: ["text-summary","html",
   "json-summary","lcov"]`, `reportsDirectory: "coverage"`.
3. Set `thresholds` a few points under the measured baseline so the gate catches real
   regressions without flaking: statements 88, branches 78, functions 90, lines 90.
4. Add npm script `coverage: "vitest run --coverage"`.
5. Add a moon `coverage` task wrapping `npm run coverage` (inputs mirror `:test` +
   `vitest.config.ts`; output `coverage/`; cache on).
6. Wire CI: change the moon run line to `:build :typecheck :coverage`, add an
   upload-artifact step for `coverage/`.
7. Gitignore `coverage/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `package.json` | modify | Add `@vitest/coverage-v8` devDep + `coverage` script |
| `vitest.config.ts` | modify | Add `coverage` block (provider, reporters, all+include, thresholds) |
| `moon.yml` | modify | Add `coverage` task wrapping `npm run coverage`, output `coverage/` |
| `.github/workflows/ci.yml` | modify | Run `:coverage` instead of `:test`; upload coverage artifact |
| `.gitignore` | modify | Ignore `coverage/` |

## Acceptance criteria

- [x] AC-1: `npm run coverage` runs the full suite under the v8 provider and prints a
  coverage summary.
- [x] AC-2: Coverage **thresholds** are configured; a metric dropping below its floor
  exits non-zero (gate), and the current suite passes the gate.
- [x] AC-3: `moon run :coverage` runs the gated coverage task; CI runs `:coverage` in
  place of `:test` and uploads the `coverage/` report as an artifact.
- [x] AC-4: `coverage/` is gitignored; reporters emit HTML + lcov + json-summary for
  downstream tooling.

## Out of scope

- Raising the thresholds toward 100% or enabling `thresholds.autoUpdate` ratcheting —
  the floors are a regression gate, not a coverage-maximization mandate; tighten later.
- Uploading to an external coverage service (Codecov/Coveralls) — the in-repo artifact is
  enough for now and avoids an external token / billing dependency.
- Per-file or per-directory threshold overrides.

## Dependencies

- none — coverage touches only config, no source, so it lands independently of the other
  M-0010 tasks. (Shares `package.json` / `moon.yml` / `ci.yml` additively per the
  milestone's shared-surface note.)

## Discovery context

Surfaced while planning [[M-0010]] code-quality tooling: the project gates `typecheck` +
`test` in CI ([[T-VQ1N-ci-quality-checks]]) but never measured coverage. Chosen as one of
the two foundation tools because it has zero source churn and unblocks an honest baseline.
