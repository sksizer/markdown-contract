---
type: task
schema_version: "5"
id: T-D8TE
status: in-progress
created: 2026-07-02
last_reviewed: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
  - "[[T-0MVN-biome-lint-format]]"
tags:
  - quality
  - lint
  - complexity
  - biome
  - tech-debt
need_human_review: false
impact: low
complexity: medium
autonomy: autonomous/pr
readiness_verified_at: 2026-07-04T07:46:04Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/220
---
# Ratchet down the Biome cognitive-complexity ceiling from 46 toward 15

## Goal

When [[T-0MVN-biome-lint-format]] promoted `noExcessiveCognitiveComplexity` from
`warn` to `error`, 16 functions already exceeded Biome's recommended ceiling of 15
(the maximum was 46, in `packages/core/src/declarative/text.ts`). Refactoring them was out of scope for
a behavior-preserving reformat, so the ceiling was parked at 46 (`maxAllowedComplexity: 46`)
to gate *new* regressions only. This task pays down that debt: refactor the worst
offenders and lower the ceiling step by step so the gate becomes meaningful rather than
a rubber stamp.

## Today

| Location | Role today |
|---|---|
| `biome.jsonc` | `noExcessiveCognitiveComplexity` at `error` with `maxAllowedComplexity: 46` — set to today's max so the promotion did not break the build. |
| `packages/core/src/declarative/text.ts` | Contains the single most-complex function (cognitive complexity 46). |
| `packages/core/src/core/structure.ts` | Two functions at 45 and 43. |
| `packages/core/src/cli/run.ts` | Functions at 36 and 30. |
| `packages/core/src/core/projection.ts` | Function at 36. |
| `packages/core/src/declarative/infer.ts` | Functions at 35, 23, 22. |
| `packages/core/src/declarative/schema.ts` | Function at 24. |
| `packages/core/src/core/content.ts` | Functions at 22, 19, 17. |
| `packages/core/src/core/text-match.ts` | Function at 20. |
| `packages/core/src/declarative/body.ts` | Function at 19. |
| `packages/core/src/runner/corpus.ts` | Function at 16. |

## Proposed

`maxAllowedComplexity` is lowered materially below 46 (target: the recommended 15, or an
agreed intermediate such as 20 if 15 proves impractical for the parser/inference core),
with the functions above 15 either refactored under it or explicitly annotated with a
`biome-ignore` carrying a rationale. `bunx moon run core:lint` stays green at the new
ceiling; behavior is unchanged (the full test suite stays green).

## Approach

1. Enumerate the current offenders: `biome lint packages/core --reporter=json` filtered to
   `noExcessiveCognitiveComplexity`, sorted by reported complexity.
2. Pick a target ceiling (15 ideal; agree an intermediate if the parser/inference functions
   resist decomposition without hurting readability).
3. Refactor top-down (46 → …), extracting helpers and flattening control flow; run
   `bunx moon run core:test` after each function so every step is behavior-preserving.
4. For any function that genuinely reads best above the ceiling, add a scoped
   `// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>` rather than
   contorting it.
5. Lower `maxAllowedComplexity` in `biome.jsonc` to the target and confirm the gate is green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `biome.jsonc` | modify | Lower `maxAllowedComplexity` from 46 to the agreed target. |
| `packages/core/src/**/*.ts` | modify | Refactor the functions above the new ceiling (or annotate with rationale). |

## Acceptance criteria

- [ ] AC-1: `maxAllowedComplexity` in `biome.jsonc` is materially lower than 46 (target 15, or a documented intermediate).
- [ ] AC-2: `bunx moon run core:lint` exits 0 at the new ceiling.
- [ ] AC-3: `bunx moon run core:test` stays green — the refactors are behavior-preserving.

## Out of scope

- Changing which rules are enabled or their severities beyond the complexity ceiling.

## Dependencies

- [[T-0MVN-biome-lint-format]] — satisfied (closed/done via #169); the rule is live at `error` with the parked ceiling.
- **Soft coordination:** [[T-JGCX-biome-noexplicitany-source-fix]] and
  [[T-FOCX-biome-nononnull-source-fix]] refactor some of the same complex modules
  (`declarative/infer.ts`, `core/structure.ts`, `cli/run.ts`). No ordering
  requirement, but avoid running them concurrently in separate worktrees against
  the same files — sequence or rebase deliberately.

## Discovery context

Captured from the [[T-0MVN-biome-lint-format]] post-mortem: the ceiling was set to today's
maximum (46) as a deliberate regression-gate rather than refactoring 16 functions inside a
behavior-preserving reformat PR.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `maxAllowedComplexity` lowered 46 → 15 in `biome.jsonc`; verified by grep and by `bunx biome lint packages/core --reporter=json` reporting zero `noExcessiveCognitiveComplexity` diagnostics at the new ceiling.
- AC-2: auto — `bunx moon run core:lint` exits 0 at ceiling 15 (green in the baseline-gated quality run, `OK 6/6`).
- AC-3: auto — `bunx moon run core:test` stays green (697 tests / 36 files) after every refactor; the decompositions are behavior-preserving.

### What worked

- Biome's `--reporter=json` gave a precise offender map (complexity → `file:line`), so the 16 functions were scopeable up front and re-checkable at any point.
- 15 of 16 functions decomposed cleanly by extracting cohesive helpers and flattening control flow, with the test suite green after each step; moon's test cache kept the iterate-and-verify loop fast.
- The one genuinely-irreducible function (`core/structure.ts` `checkStrict`, a two-cursor positional merge) took a single scoped `biome-ignore` with a specific rationale, so the recommended ceiling of 15 was reached without contorting the parser core — it is the only such ignore in the codebase.

### Friction and automation gaps

- Step 3a captured the quality baseline against a 5-verb `sdlc.yaml`, but a parallel session added a 6th verb (`bun run lint:deps`) to `sdlc.yaml` on `origin/main` mid-run; the stale baseline had no `lint:deps` findings to subtract, so Step 7 reported 7 false `new-drift:` lines until I re-captured a baseline at the branch base with the current config — task-work Step 7 should refresh (or invalidate) the Step 3a baseline when the config's verb list changed since capture, rather than diffing against a baseline built from a different verb set. → [[T-PXZ0-baseline-refresh-on-config-verb-change]]
- knip (`lint:deps`) emits cwd-relative paths (`../../../.git/hooks/...` from a worktree vs `.git/hooks/...` from the main repo), so a baseline captured from the main-repo cwd cannot string-match findings from a worktree gate run — the baseline diff should normalize cwd-relative finding paths (or always capture/run from a canonical cwd) so main-repo baselines subtract cleanly under a worktree run. → [[T-2HDX-normalize-cwd-relative-baseline-paths]]
- The readiness gate flagged the Goal prose's bare `` `declarative/text.ts` `` citation as a path disqualifier (only the full `packages/core/src/...` path exists); an otherwise implementation-ready task would have parked on a one-token relative-path citation had it not been hand-corrected — the path claim-resolver could accept a unique-basename match (or the task template could require repo-root-relative paths) so trivial relative citations do not gate readiness. → [[T-XYKD-readiness-gate-accept-basename-path-match]]

### Spawned follow-up tasks

- [[T-PXZ0-baseline-refresh-on-config-verb-change]] (https://github.com/sksizer/dev/pull/655) — task-work Step 7 should refresh/invalidate the quality baseline when sdlc.yaml's verb list changed since Step 3a capture; spawned, Upstream-plugin (sdlc-meta).
- [[T-2HDX-normalize-cwd-relative-baseline-paths]] (https://github.com/sksizer/dev/pull/656) — normalize cwd-relative finding paths in the task-work quality baseline diff so main-repo baselines subtract under worktree runs; spawned, Upstream-plugin (sdlc-meta).
- [[T-XYKD-readiness-gate-accept-basename-path-match]] (https://github.com/sksizer/dev/pull/657) — readiness-gate path claim-resolver should accept a unique-basename match so bare relative citations don't gate readiness; spawned, Upstream-plugin (sdlc-meta).
