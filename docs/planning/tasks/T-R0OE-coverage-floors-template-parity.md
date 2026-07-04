---
type: task
schema_version: '5'
id: T-R0OE
status: closed/done
created: '2026-07-04'
related:
- '[[M-0010 Quality Tooling]]'
- '[[T-79GV-vitest-coverage]]'
tags:
- quality
- coverage
- testing
need_human_review: false
impact: medium
complexity: medium
autonomy: autonomous/pr
last_reviewed: '2026-07-04'
prs:
- https://github.com/sksizer/markdown-contract/pull/237
completion_note: 'Shipped via #237.'
---
# Raise coverage floors toward node-template parity (best effort on branches)

## Goal

The [sksizer/node-template](https://github.com/sksizer/node-template)
library-health baseline sets coverage floors at **90/85/90/90**
(statements/branches/functions/lines) and excludes re-export-only barrels from
the denominator; this repo's floors sit at 88/78/90/90 from the T-79GV
adoption baseline, and its config comment cites stale numbers from the
547-test era. Statements, functions, and lines have real headroom today —
raise those floors to parity outright. Branches measure **82.55%** against the
template's 85 floor, so that axis is **best effort**: add targeted branch
tests where they're cheapest, then set the floor to what was actually reached
(never below 82) and record the residual honestly.

## Today

Measured 2026-07-04 (`bunx moon run core:coverage`, 698 tests):
statements 91.89% (2019/2197) · branches 82.55% (1320/1599) ·
functions 96.34% (475/493) · lines 93.99% (1768/1881). Reaching an 85 branch
floor needs roughly 40 more covered branches (1360/1599).

| Location | Role today |
|---|---|
| `packages/core/vitest.config.ts` | Coverage thresholds 88/78/90/90; excludes only `src/**/*.test.ts` + `**/*.d.ts` (barrels counted); comment cites the stale 547-test baseline (91.2/82.2/94.9/93.5). |
| `packages/core/src/core/index.ts` | Re-export-only barrel (per `CLAUDE.md` "index.ts is a barrel only") — the template excludes exactly this shape from coverage; ours are in the denominator. |
| `packages/core/src/runner/index.ts` | Same — barrel in the coverage denominator. |
| `packages/core/src/core/dialect/index.ts` | Same — barrel in the coverage denominator. |
| `packages/core/src/declarative/index.ts` | Same — barrel in the coverage denominator. |

The per-file branch data that identifies where the cheapest uncovered branches
live comes from the gitignored report a coverage run writes (`html` +
`json-summary` reporters, output directory `coverage/`) — regenerate it with
`bunx moon run core:coverage`; it does not exist on a fresh checkout.

## Proposed

`vitest.config.ts` excludes `src/**/index.ts` barrels (mirroring the
template's honest-totals rationale and this repo's own no-logic-in-barrels
convention), thresholds read `statements: 90, functions: 90, lines: 90`, and
the branches floor is the **measured best-effort result**: 85 if reached,
otherwise the achieved value minus one point of flake margin (floor ≥ 82
either way — strictly above today's 78). The config comment cites the fresh
measured baseline and, if branches land under 85, names the residual gap and
the least-covered modules so the next ratchet has a starting point.

## Approach

1. Add `"src/**/index.ts"` to the coverage `exclude` list and re-measure
   (`bunx moon run core:coverage`) — barrels are import-time-executed
   re-exports, so removing them can move percentages in either direction;
   every later number comes from this post-exclusion measurement.
2. Raise `statements` → 90, `functions` → 90, `lines` → 90 (measured headroom:
   91.89 / 96.34 / 93.99 pre-exclusion). If the exclusion unexpectedly drops a
   metric below its new floor, set that floor one point under measurement and
   note it alongside the branches residual.
3. Best-effort branch push: from the coverage report's per-file branch data,
   list the files with the most uncovered branches and add targeted peer-test
   cases for the cheapest wins (error paths, boolean forks in well-isolated
   modules — per the repo's tests-express-the-contract convention). Bound the
   effort: stop when branches ≥ 85% or when the remaining uncovered branches
   are concentrated in genuinely hard-to-drive paths (defensive throws, CLI
   process handling).
4. Set the `branches` floor: 85 if reached; otherwise measured minus one,
   minimum 82. Refresh the whole threshold comment with the new measured
   baseline (date + test count) and the residual note if any.
5. Full verification: `bunx moon run core:coverage` passes at the new floors;
   `bunx moon run core:build core:typecheck core:lint core:test` green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/vitest.config.ts` | modify | Exclude `src/**/index.ts`; raise thresholds (90/90/90 + best-effort branches); refresh the baseline comment. |
| `packages/core/src/**/*.test.ts` | modify | Add targeted branch-coverage cases to existing peer tests (step 3). |

## Acceptance criteria

- [ ] AC-1: `vitest.config.ts` coverage `exclude` contains `src/**/index.ts`, and the four barrel files above no longer appear in the coverage report.
- [ ] AC-2: `statements`, `functions`, and `lines` thresholds are 90 (or, only if the barrel exclusion measurably drops one below 90, one point under the post-exclusion measurement with a comment saying so).
- [ ] AC-3: The `branches` threshold is ≥ 82 and strictly greater than the old 78; if it is below 85, the config comment records the measured value, the residual gap to the template's 85, and the least-covered modules.
- [ ] AC-4: `bunx moon run core:coverage` exits 0 at the new floors on a clean tree.
- [ ] AC-5: The threshold comment cites the post-exclusion measured baseline with date and test count (no stale 547-test numbers remain).

## Out of scope

- Reaching 100% or exhaustively covering defensive/unreachable branches —
  the repo's convention explicitly prefers contract-expressing tests over
  corner-case exhaustion.
- Per-file or per-directory threshold overrides.
- `thresholds.autoUpdate` ratcheting — floors move deliberately, with a
  human-readable comment, as T-79GV decided.
- Excluding anything beyond tests, `.d.ts`, and re-export barrels from the
  denominator.

## Dependencies

- none hard. **Soft coordination:** [[T-JGCX-biome-noexplicitany-source-fix]]
  and [[T-FOCX-biome-nononnull-source-fix]] (in flight) rewrite test files
  this task may also touch — land after them if possible, or expect a small
  test-file rebase.

## Discovery context

Surfaced by the node-template baseline comparison (2026-07-04, README
"Library health baseline" section): the template's `pr3-vitest` layer sets
90/85/90/90 with barrel exclusion; this repo's floors predate 151 of its
698 tests and sit visibly below its own measured coverage.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `grep -c index.ts packages/core/coverage/coverage-summary.json` returns 0 after adding `src/**/index.ts` to the exclude list; all four barrels dropped from the denominator.
- AC-2: auto — thresholds read `statements: 90, functions: 90, lines: 90`; `bunx moon run core:coverage` enforces them and exits 0 (measured 93.50 / 97.15 / 95.40, no one-point-under exception needed).
- AC-3: auto — `branches: 85` (≥ 82, strictly > 78); branches measured 85.22% so the template's 85 floor was reached exactly — no residual note required.
- AC-4: auto — `bunx moon run core:coverage` exits 0 at the new floors on the clean tree (721 tests, all green).
- AC-5: agent-manual — inspected the refreshed threshold comment in `vitest.config.ts`: cites the post-exclusion baseline with date 2026-07-04 and 721 tests; the stale 547-test-era numbers (91.2/82.2/94.9/93.5) are gone.

### What worked

- The readiness gate passed clean on the first pass — `task gap-report` found no gaps (both touchpoint tables valid, all sections present), so no auto-define round-trip was needed.
- `bunx moon run core:coverage` writes a `json-summary` report with per-file branch data, which made targeting the cheapest uncovered branches (untested factory `finding()`, closed-vocab schema error paths, malformed-config rejections) straightforward — +38 branches recovered across 7 peer test files, landing branches at 85.22% (over the 85 floor) without chasing defensive/CLI paths.
- Branches reached 85 exactly, so the floor is a clean 85 with no residual-gap bookkeeping.

### Friction and automation gaps

- The `quality run --line` gate reported a spurious `FAIL bunx moon run core:lint` while the verb itself exits 0 — the quality runner captures each verb's output via `spawnSync` with the default 1MB `maxBuffer`, and `biome ci` emits ~1.068MB to stderr, tripping `ENOBUFS` → SIGTERM → exit 1. It reproduces on `main` (pre-existing, not from this change) and the baseline-gated run reports `OK 6/6`. Fix: raise `maxBuffer` (or stream) in the quality runner's `spawnSync` so large verb output can't manufacture a false FAIL. → [[quality-runner-raise-maxbuffer]]
- Step 7's documented `quality run --diff-against-baseline` invocation omits `--baseline-dir`, so run from the worktree it looked for the baseline under the worktree's `.sdlc/` and errored `baseline not found`; the baseline was captured in the main repo's `.sdlc/quality-baselines/`. Fix: task-work Step 7 (and the dogfood sub-step) should pass `--baseline-dir <main-repo>/.sdlc/quality-baselines` explicitly when the gate runs inside a worktree, mirroring the Step 3a capture path. → [[task-work-passes-baseline-dir]]

### Spawned follow-up tasks

- [[quality-runner-raise-maxbuffer]] (https://github.com/sksizer/dev/pull/661) [planning/draft] — raise the quality runner's `spawnSync` `maxBuffer` (or stream) so large benign verb output can't manufacture a false FAIL. Upstream-plugin (`sdlc-meta`) → `sksizer/dev`; the dedup search found no local match, but this exact gap was already an open upstream PR, so the spawn resolved idempotently to the existing PR (`SPAWN-TASK-PR-EXISTING`, task `T-HGPH`) rather than opening a duplicate.
- [[task-work-passes-baseline-dir]] (https://github.com/sksizer/dev/pull/673) [planning/draft] — task-work Step 7 passes `--baseline-dir` explicitly so the baseline resolves when the gate runs inside a worktree. Upstream-plugin (`sdlc-meta`) → `sksizer/dev`; likewise resolved idempotently to the existing upstream PR (`SPAWN-TASK-PR-EXISTING`, task `T-42LO`) rather than opening a duplicate.
