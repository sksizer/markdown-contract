---
type: task
schema_version: '5'
id: T-HPWU
status: in-progress
created: '2026-07-04'
related:
- T-QX1Q-gate-covers-declaration-emit
tags: []
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-07-04T17:53:47Z'
last_reviewed: '2026-07-04'
---
# Document the cross-module condition for reproducing .d.ts declaration-emit regressions

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 because the task is
> autonomy: autonomous/pr. Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

The quality gate's `core:build` step guards a real `.d.ts` declaration-emit
regression class (TS4023 / TS4058), but the condition that actually reproduces
that class is subtle and currently undocumented: it triggers only through a
*cross-module* inferred reference (the knip unused-export shape), not the naive
same-module "de-export a type used in an exported signature" recipe — a
same-module non-exported type still emits into the `.d.ts`, so the naive recipe
never fails the build. Because that reproduction condition is unwritten, future
task-spec authors and anyone debugging a declaration-emit error will reach for
the same-module recipe, watch it pass, and burn cycles concluding the guard is
inert. This task records the correct cross-module condition next to the
build/typecheck gate docs so the guard's rationale and reproduction are found
where they're needed.

> From [[T-QX1Q-gate-covers-declaration-emit]] (git@github.com:sksizer/markdown-contract.git):
> The declaration-emit regression class (TS4023/TS4058) that the quality gate's `core:build` guards only reproduces via a cross-module inferred reference (the knip unused-export shape) — a same-module non-exported type still emits into the .d.ts, so the naive 'de-export a type used in an exported signature' recipe does NOT reproduce it. Document this cross-module reproduction condition near the build/typecheck gate docs (e.g. a README build note, or a comment by packages/core/tsconfig.build.json) so future task-spec authors and anyone debugging declaration-emit errors cite the correct condition and don't burn cycles on the naive same-module version.

## Today

The declaration-emit gate works, but the condition that reproduces the class it
guards is undocumented — and the two specs that reference it
([[T-QX1Q-gate-covers-declaration-emit]] and its source
[[T-W1CX-knip-baseline-dead-code-cleanup]]) both describe it with the naive
*same-module* recipe ("de-export a type used in an exported signature"), which
does not actually reproduce the failure. Nothing next to the build gate records
the correct *cross-module* condition.

| Location | Role today |
|---|---|
| `packages/core/tsconfig.build.json` | Sets `declaration: true` + `declarationMap: true` — the `.d.ts` emit surface exercised by `core:build` but not by `core:typecheck`. Carries no note about the TS4023/TS4058 class it can hit. |
| `packages/core/package.json` | `build` = `tsc -p tsconfig.build.json` (emits declarations); `typecheck` = `tsc --noEmit` (no declaration emit). This split is the blind spot the gate closes. |
| `packages/core/moon.yml` | Defines the cached `build` gate task; the task comment documents caching + toolchain but not the declaration-emit regression class the task guards. |
| `packages/core/README.md` | Packaging section documents `tsc` building `src/` → `dist/` (JS + `.d.ts`) but says nothing about the TS4023/TS4058 class or how to reproduce it. |
| `sdlc.yaml` | `quality_checks` leads with `bunx moon run core:build` — the gate tier that catches this class — with no inline rationale. |
| `docs/planning/tasks/T-QX1Q-gate-covers-declaration-emit.md` | The gate task whose Approach still uses the non-reproducing same-module recipe — the exact confusion this task removes. |

## Proposed

The correct cross-module reproduction condition lives next to the build gate in a
durable, lint-safe home. A short "Declaration emit" note in
`packages/core/README.md`'s Packaging section records what `core:build` guards
(TS4023 / TS4058), the cross-module recipe that actually reproduces it, and why
the naive same-module de-export does not. The `build:` task comment in
`packages/core/moon.yml` — the gate definition itself — points at that note. A
task-spec author, or anyone debugging a declaration-emit error, lands on the
correct condition instead of reaching for the same-module recipe that always
passes the build.

## Approach

1. Ground the note empirically (probe, nothing committed): find an existing
   cross-module exported-signature reference in `packages/core/src` — a type
   exported by one module and used in another module's exported/inferred
   signature — de-export the source type, and confirm
   `bunx moon run core:typecheck` exits 0 while `bunx moon run core:build` fails
   with a TS4023/TS4058 declaration-emit error. Then confirm the naive
   *same-module* version (de-export a type used in an exported signature within
   the same file) keeps `core:build` green. Revert both probes.
2. In `packages/core/README.md`, add a "Declaration emit" note under the
   Packaging section recording: (a) `core:build` (`tsc -p tsconfig.build.json`,
   `declaration: true`) is the only gate tier that exercises `.d.ts` emit —
   `core:typecheck` (`tsc --noEmit`) does not; (b) the regression class is
   TS4023 / TS4058; (c) the reproduction is *cross-module* — a type exported by
   module A and referenced by an inferred/exported signature in module B breaks
   emit when de-exported from A (the knip unused-export shape), because B's
   emitted `.d.ts` can no longer name it; (d) the naive *same-module* de-export
   does NOT reproduce it, because a non-exported same-module type still emits
   inline into the `.d.ts`.
3. In `packages/core/moon.yml`, extend the `build:` task's comment with one line
   noting it is the sole declaration-emit gate tier and pointing at the README
   note, so anyone editing the gate finds the rationale.
4. Run `bunx moon run core:lint` and `bunx moon run core:build` on the clean tree
   to confirm the doc/comment edits introduce no lint or build regression.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/README.md` | modify | Add a "Declaration emit" build note to the Packaging section: what `core:build` guards (TS4023 / TS4058), the cross-module reproduction condition, and why the same-module recipe does not reproduce it. |
| `packages/core/moon.yml` | modify | Extend the `build:` task comment with a one-line note that it is the sole declaration-emit gate tier, pointing at the README note. |

## Acceptance criteria

- [ ] AC-1: `packages/core/README.md` contains a note (in or adjacent to the Packaging section) that names both `TS4023` and `TS4058` and states that `core:build` / `tsc -p tsconfig.build.json` exercises declaration emit while `core:typecheck` / `tsc --noEmit` does not.
- [ ] AC-2: That note states the reproduction condition is cross-module (a type exported by one module and used in another module's exported/inferred signature, then de-exported from its source) AND explicitly states the naive same-module de-export does NOT reproduce the failure because a non-exported same-module type still emits into the `.d.ts`.
- [ ] AC-3: The `build:` task comment in `packages/core/moon.yml` points a reader to the README declaration-emit note.
- [ ] AC-4: `bunx moon run core:build` and `bunx moon run core:lint` both exit 0 on the tree after the doc edits (the changes are docs/comments only).

## Out of scope

- Adding the note as a comment inside `packages/core/tsconfig.build.json` — biome
  treats `tsconfig.build.json` (not the well-known `tsconfig.json`) as strict
  JSON, so an inline comment risks a `core:lint` failure; the README + `moon.yml`
  homes are lint-safe.
- Changing the gate itself, the `typecheck` / `build` scripts, or
  `tsconfig.build.json` emit options (`isolatedDeclarations`, etc.) — this task is
  documentation only; the gate coverage is [[T-QX1Q-gate-covers-declaration-emit]]'s job.
- Editing [[T-QX1Q-gate-covers-declaration-emit]] or
  [[T-W1CX-knip-baseline-dead-code-cleanup]] to correct their same-module
  phrasing — those are historical records; the durable fix is the build-adjacent doc.
- Adding an automated test that asserts the reproduction — the note is prose
  documentation, not a regression test.

## Dependencies

- none. Related to [[T-QX1Q-gate-covers-declaration-emit]] but not blocked by it —
  the `core:build` gate already runs in `sdlc.yaml` and in CI, so the reproduction
  condition can be documented now.

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from [[T-QX1Q-gate-covers-declaration-emit]] in git@github.com:sksizer/markdown-contract.git.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
