---
type: task
schema_version: '5'
id: T-QX1Q
status: in-progress
created: '2026-07-04'
related:
- T-W1CX-knip-baseline-dead-code-cleanup
tags: []
need_human_review: false
impact: medium
complexity: small
autonomy: autonomous/pr
readiness_verified_at: '2026-07-04T15:51:38Z'
last_reviewed: '2026-07-04'
---
# Make the quality gate catch .d.ts declaration-emit regressions that tsc --noEmit misses

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 because the task is
> autonomy: autonomous/pr. Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

The quality gate's typecheck verb runs `tsc --noEmit`, so it validates types
but never exercises `.d.ts` declaration emit. That leaves a blind spot: a change
can keep `tsc --noEmit` green while breaking the declaration build that ships in
the published package. This task closes that gap by adding a declaration-emit /
full-build check to the quality gate so this class of regression fails
mechanically rather than depending on the implementer remembering to run a real
build.

> From [[T-W1CX-knip-baseline-dead-code-cleanup]] (markdown-contract):
> De-exporting a type still referenced in an exported function's signature can
> break `.d.ts` declaration emit while `tsc --noEmit` typecheck stays green, so
> the gate's typecheck verb alone misses it (surfaced by [[T-W1CX]]'s knip
> cleanup; both cases were verified only via a manual `core:build`). Add a
> declaration-emit / full-build check to the quality gate so this class of
> regression fails mechanically instead of relying on the implementer
> remembering to run a real build.

## Today

**Premise update since spawn (verified 2026-07-04):** two of the three gate
tiers already cover this class. `sdlc.yaml` `quality_checks` leads with
`bunx moon run core:build` and CI runs `:build`, so the task-work gate and CI
both exercise declaration emit today. The remaining hole is the **lefthook
pre-push gate** (shipped by T-77ST after this task was spawned): it runs only
`core:typecheck core:test`, so a declaration-emit-only failure — e.g. TS4023
after de-exporting a type still referenced in an exported signature, the exact
T-W1CX case — passes the local push and is first caught one round-trip later
in CI.

| Location | Role today |
|---|---|
| `packages/core/package.json` | `typecheck` is `tsc --noEmit` (reports no declaration-emit diagnostics); `build` is `tsc -p tsconfig.build.json` — the invocation that exercises declaration emit. |
| `packages/core/tsconfig.build.json` | `declaration: true` + `declarationMap: true` — the emit surface that can break while `--noEmit` stays green. |
| `sdlc.yaml` | `quality_checks` already leads with `bunx moon run core:build`, so the task-work gate catches declaration-emit breaks today. |
| `lefthook.yml` | Pre-push runs `bunx moon run core:typecheck core:test` — no build, the one gate tier that misses declaration-emit-only regressions. |
| `.github/workflows/ci.yml` | Runs `bunx moon run :build :typecheck :coverage :lint` — CI is covered; it just catches the break after the push instead of before it. |
| `packages/core/moon.yml` | Defines the cached `build` task — moon's cache makes adding it to pre-push nearly free on an unchanged tree. |
| `README.md` | Documents the pre-push gate list as `core:typecheck` + `core:test` — must be updated alongside the hook. |

## Proposed

The declaration-emit regression class is caught at every gate tier, not just
task-work and CI: `lefthook.yml`'s pre-push runs
`bunx moon run core:build core:typecheck core:test` (all moon-cached, so a
clean tree stays a fast cache hit), and the coverage is demonstrated — a
de-exported type referenced in a public signature fails `lefthook run
pre-push` locally while `core:typecheck` alone stays green. The
already-correct `quality_checks` coverage is asserted and kept, not re-added.

## Approach

1. Reproduce the class once on a scratch edit: de-export a type still
   referenced in an exported function's signature (the T-W1CX case) and
   confirm `bunx moon run core:typecheck` exits 0 while
   `bunx moon run core:build` fails with the TS4023-family declaration error.
   Revert the probe.
2. Add `core:build` to the pre-push `gates` command in `lefthook.yml`
   (`bunx moon run core:build core:typecheck core:test`) and update its
   inline comment (three cached gates, mirrors CI).
3. Update the `README.md` git-hooks bullet naming the pre-push gates.
4. Re-run the step-1 probe with the hook: `bunx lefthook run pre-push` fails
   on the declaration break and passes after the revert.
5. Confirm `sdlc.yaml` `quality_checks` still leads with
   `bunx moon run core:build` (assert-only — no edit expected) and the full
   gate set is green on the clean tree.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `lefthook.yml` | modify | Add `core:build` to the pre-push `gates` run line; update the comment. |
| `README.md` | modify | Git-hooks bullet: pre-push gate list becomes `core:build` + `core:typecheck` + `core:test`. |

## Acceptance criteria

- [ ] AC-1: With a scratch de-export of a type still referenced in an exported function's signature, `bunx moon run core:typecheck` exits 0 while `bunx lefthook run pre-push` exits non-zero on the `core:build` declaration-emit failure; the probe is reverted, not committed.
- [ ] AC-2: The pre-push `gates` command in `lefthook.yml` is `bunx moon run core:build core:typecheck core:test`.
- [ ] AC-3: `sdlc.yaml` `quality_checks` still includes `bunx moon run core:build` (unchanged), and `README.md` names the three pre-push gates.
- [ ] AC-4: On a clean tree, `bunx lefthook run pre-push` exits 0 — the added build rides moon's cache and does not meaningfully slow the push.

## Out of scope

- Changing the `typecheck` script to run declaration diagnostics itself
  (e.g. a `tsconfig.build.json --noEmit` variant) — the cached `core:build`
  already exercises the real emit; one source of truth.
- Adopting `isolatedDeclarations` or restructuring the emitted `.d.ts` shape.
- CI changes — `ci.yml` already runs `:build`.
- Generalizing this into the sdlc plugin's default quality verbs (the spawn
  quote's "gate's typecheck verb" concern) — an upstream plugin change, not a
  repo-local gate fix.

## Dependencies

- [[T-77ST-git-hooks-lefthook]] — satisfied (shipped via #212): `lefthook.yml`
  exists to edit. No open dependencies.

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from
[[T-W1CX-knip-baseline-dead-code-cleanup]] in
git@github.com:sksizer/markdown-contract.git.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
