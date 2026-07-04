---
type: task
schema_version: '5'
id: T-QX1Q
status: closed/done
created: '2026-07-04'
related:
- T-W1CX-knip-baseline-dead-code-cleanup
tags: []
need_human_review: false
impact: medium
complexity: small
autonomy: autonomous/pr
last_reviewed: '2026-07-04'
prs:
- https://github.com/sksizer/markdown-contract/pull/233
completion_note: 'Shipped via #233.'
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

- AC-1: agent-manual — scratch-de-exported `FrontmatterSplit` (cross-module reference from `packages/core/src/core/projection.ts` into `frontmatter.ts`, plus a barrel-line drop). `bunx moon run core:typecheck` exited 0 while `bunx moon run core:build` exited 1 with `TS4058` (TS4023-family declaration-emit error); `bunx lefthook run pre-push --all-files` against the edited hook exited non-zero. Probe fully reverted, not committed.
- AC-2: auto — `lefthook.yml` pre-push `gates` run line is now exactly `bunx moon run core:build core:typecheck core:test` (confirmed in the committed diff).
- AC-3: auto — `sdlc.yaml` `quality_checks` still lists `bunx moon run core:build` and is unchanged (`git diff` empty for `sdlc.yaml`); `README.md` git-hooks bullet now names `core:build` + `core:typecheck` + `core:test`.
- AC-4: agent-manual — on the clean tree (probe reverted), `bunx lefthook run pre-push --all-files` exited 0 (core:build ~762ms, typecheck + test served from moon cache).

### What worked

- The moon cache made adding `core:build` to pre-push nearly free on a clean tree — the extra gate is a fast cache hit, exactly as the task predicted.
- The change was a two-file, six-line edit; the baseline-gated quality gate confirmed zero new drift (`OK 6/6`) since the diff carries no TypeScript.

### Friction and automation gaps

- The task's AC-1 recipe ("de-export a type used in an exported function's signature") does not reproduce TS4023 as written — a same-module non-exported type still emits into the `.d.ts`. The class only manifests on a cross-module inferred reference (the knip "unused export" shape) — future spec authors should cite the cross-module condition so a run doesn't burn cycles on the naive version. → [[T-HPWU-document-cross-module-dts-emit-condition]]
- `bunx lefthook run pre-push` skips its gates ("no matching push files") on a branch with no upstream/unpushed commits, so demonstrating a pre-push failure manually needs `--all-files` (or a real `git push`). The gate fires correctly on an actual push; the manual-run caveat is a lefthook affordance worth noting in the hook's comment or docs. → [[T-TH8U-document-lefthook-prepush-run-caveat]]
- `sdlc quality run --line` produced a false `FAIL bunx moon run core:lint` from moon workspace-lock contention between the parallel `bunx moon run` invocations (`--log`/sequential is clean, and the baseline-gated `--line` run also came back clean on retry) — serializing moon invocations in `--line` mode, or documenting `--log` as the trustworthy mode for moon projects, would close this flake. → [[T-DOQI-serialize-moon-in-quality-line-mode]]

### Spawned follow-up tasks

- [[T-HPWU-document-cross-module-dts-emit-condition]] (https://github.com/sksizer/markdown-contract/pull/231) [open/ready] — spawned (Local); document the cross-module condition under which `.d.ts` declaration-emit regressions (TS4023/TS4058) reproduce, so future spec authors cite the correct recipe instead of the naive same-module one.
- [[T-TH8U-document-lefthook-prepush-run-caveat]] (https://github.com/sksizer/markdown-contract/pull/232) [open/ready] — spawned (Local); note the lefthook pre-push manual-run caveat (needs `--all-files`, or a real push, on a branch with no unpushed commits) so a skipped manual run isn't misread as a passing gate.
- [[T-DOQI-serialize-moon-in-quality-line-mode]] (https://github.com/sksizer/dev/pull/668) [open/ready] — spawned (Upstream-plugin, sdlc-meta); harden `sdlc quality run --line` against moon workspace-lock contention / document `--log` as the trustworthy mode for moon projects.
