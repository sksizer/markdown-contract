---
type: task
schema_version: "5"
id: T-W1CX
status: in-progress
created: 2026-07-01
last_reviewed: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
tags:
  - quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: 2026-07-04T00:46:18Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/209
---
# Delete dead code from the knip baseline (T-HIL6 follow-up)

## Goal

T-HIL6 wired knip and captured a documented baseline of genuine dead code, but
deliberately deleted nothing. This task consumes that baseline: remove (or
justify keeping) each unreferenced export/type knip reports so the published
`packages/core` surface shrinks to what is actually used, and the knip run
trends toward zero findings.

## Today

knip (config in root `knip.json`, run via `bun run lint:deps` / `moon run
core:lint-deps`) reports **13 genuine findings** in `packages/core/src` — 9
unused exports and 4 unused exported types, none of them the published barrels'
public API. None have been removed. Re-verified 2026-07-03: the same 13
`packages/core` findings stand; a fresh run also reports newer findings in the
`apps/web` / `sites/docs` workspaces, which are NOT this task's scope (they
belong to the gating flip, [[T-3L9Q-knip-gating-flip]]).

| Location | Role today |
|---|---|
| `packages/core/src/core/grammar.ts` | Exports `matchStructure` (line 39), reported unused. |
| `packages/core/src/core/leaves.ts` | Exports `matchContent` (line 17), reported unused. |
| `packages/core/src/core/registry.ts` | Exports `CONTENT_LEVELS`, `RULE_LEVELS`, `TEXT_LEVELS`, and type `LevelRegistry`, all reported unused. |
| `packages/core/src/declarative/text.ts` | Exports functions `compileMatchSpec`, `compileMatchSpecs`, `compileScopeTextSpecs` and interface `ScopeTextSpecs`, all reported unused. |
| `packages/core/src/runner/index.ts` | Internal barrel re-exports `compileMatcher`, reported unused (nothing reachable consumes it). |
| `packages/core/src/core/dialect/index.ts` | Internal barrel re-exports type `VaultRef`, reported unused. |
| `packages/core/src/core/dialect/wikilinks.ts` | Defines interface `VaultRef`, reported unused. |

## Proposed

Each of the 13 baseline findings is resolved one of two ways: the symbol is
genuinely dead (delete it and prune any now-empty barrel re-export), or it is
intentional public/near-term API (keep it and record why — e.g. add it to a
published barrel's `entry` surface, or annotate it). A fresh `bun run lint:deps`
afterward reports only the intentionally-kept set, and that residual is small
and explained.

## Approach

1. Re-run `bun run lint:deps` to refresh the finding list (code may have drifted
   since the T-HIL6 baseline).
2. For each finding, decide delete-vs-keep. Note the barrel re-exports
   (`compileMatcher` in `runner/index.ts`, `VaultRef` in `dialect/index.ts`) are
   re-exports of symbols defined elsewhere — deleting the re-export may be the
   right move even when the underlying definition stays.
3. Delete the genuinely-dead symbols and their now-orphaned barrel re-exports;
   for each kept symbol, record the justification (intended API vs. test-only
   helper that should move).
4. Re-run the full quality gate (`build`/`typecheck`/`test`) and `bun run
   lint:deps`; confirm no regression and that the residual findings are only the
   intentionally-kept set.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/core/grammar.ts` | modify | Remove `matchStructure` if dead. |
| `packages/core/src/core/leaves.ts` | modify | Remove `matchContent` if dead. |
| `packages/core/src/core/registry.ts` | modify | Remove `CONTENT_LEVELS`/`RULE_LEVELS`/`TEXT_LEVELS`/`LevelRegistry` if dead. |
| `packages/core/src/declarative/text.ts` | modify | Remove the `compile*` helpers + `ScopeTextSpecs` if dead. |
| `packages/core/src/runner/index.ts` | modify | Prune the `compileMatcher` re-export if dead. |
| `packages/core/src/core/dialect/index.ts` | modify | Prune the `VaultRef` re-export if dead. |
| `packages/core/src/core/dialect/wikilinks.ts` | modify | Remove `VaultRef` interface if dead. |

## Acceptance criteria

- [ ] AC-1: Each of the 13 baseline findings is either deleted or kept with a recorded justification; no finding is left unaddressed.
- [ ] AC-2: `bun run lint:deps` after the cleanup reports only the intentionally-kept residual (documented in the PR), and the count is strictly lower than the 13-finding baseline.
- [ ] AC-3: The full quality gate (`build`/`typecheck`/`test`) stays green after the deletions.

## Out of scope

- Changing the knip config itself (entry/project/ignores) — that is tuned in T-HIL6; this task only removes code.
- Flipping knip to a hard CI gate (dropping `continue-on-error`) — owned by [[T-3L9Q-knip-gating-flip]], which depends on this task.
- The newer knip findings outside `packages/core` (the `apps/web` daemon exports, the `sites/docs` script exports, the unused `zod` devDep) — triaged by [[T-3L9Q-knip-gating-flip]] as part of driving the run to exit 0.

## Dependencies

- Consumes the baseline captured by [[T-HIL6]] (knip config + report). Not blocked on it once T-HIL6 merges.

## Discovery context

- Surfaced by the [[T-HIL6]] post-mortem: T-HIL6 captured the baseline but deliberately deleted nothing (deletion was out of scope). This is the named downstream cleanup.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — each of the 13 baseline findings was resolved: 4 genuinely-dead barrel/type re-exports deleted (`matchStructure`, `matchContent`, `compileMatcher`, the `VaultRef` type re-export), and 9 internal-only symbols de-exported (`CONTENT_LEVELS`/`RULE_LEVELS`/`TEXT_LEVELS`/`LevelRegistry`, `compileMatchSpec`/`compileMatchSpecs`/`compileScopeTextSpecs`/`ScopeTextSpecs`, the `VaultRef` interface). Each decision was grep-verified across the repo; none left unaddressed, none kept.
- AC-2: auto — `bun run lint:deps` after the cleanup reports **0** `packages/core/src` dead-code findings, down from the 13-finding baseline (0 < 13). The residual knip output is only the explicitly out-of-scope `apps/web`/`sites/docs` findings plus a pre-existing `vitest.config.ts` config hint, none of which this task owns.
- AC-3: auto — the full quality gate (`build`/`typecheck`/`lint`/`test`/`package-check`) is green: `sdlc quality run` reports `OK 5/5` (baseline-gated, zero new drift).

### What worked

- The T-HIL6 baseline was accurate: the 13 documented findings matched the live `knip` run exactly at pickup, so no re-triage was needed before deleting.
- knip's per-symbol locations plus a repo-wide grep made the delete-vs-de-export call unambiguous for every finding — dead re-exports were removed outright, symbols still used inside their own module were simply de-exported without touching live code.
- The baseline-gated quality run (`--diff-against-baseline`) confirmed zero new drift cleanly, so AC-3 was verifiable mechanically rather than by eye.

### Friction and automation gaps

- De-exporting a type that is still referenced in an exported function's signature (`LevelRegistry`, the `VaultRef` interface) can regress `.d.ts` declaration emit while `tsc --noEmit` typecheck stays green — the gate's typecheck verb runs `--noEmit`, so it alone would not catch a declaration-only break. Both cases were verified against a real `core:build`, but a knip-cleanup affordance could flag "de-exporting a type used by an exported signature → needs a full build check" so the safety step isn't left to the implementer's memory. → [[T-QX1Q-gate-covers-declaration-emit]]
- knip's exit code is repo-coarse: it cannot scope-fail to a single workspace, so confirming "`packages/core` is clean" is a manual read of the finding list rather than a green exit. A `--workspace packages/core` gate (or a `knip --reporter` filter) would let a task like this assert its scope mechanically instead of eyeballing. → [[T-32OG-knip-per-workspace-scope-gate]]

### Spawned follow-up tasks

- [[T-QX1Q-gate-covers-declaration-emit]] (https://github.com/sksizer/markdown-contract/pull/206) — declaration-emit / full-build check for the quality gate, spawned.
- [[T-32OG-knip-per-workspace-scope-gate]] (https://github.com/sksizer/markdown-contract/pull/207) — per-workspace knip scope gate, spawned.
