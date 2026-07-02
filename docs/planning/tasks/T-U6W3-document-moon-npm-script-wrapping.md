---
type: task
schema_version: '5'
id: T-U6W3
status: in-progress
created: '2026-06-28'
related:
- '[[T-MOON-adopt-moon-monorepo]]'
- '[[M-0005-monorepo-tooling]]'
- '[[D-0010-monorepo-tooling]]'
- '[[T-WKSP-bun-workspace-split]]'
depends_on:
- '[[T-WKSP-bun-workspace-split]]'
tags:
- docs
- moon
- bun
need_human_review: false
impact: low
complexity: small
readiness_verified_at: '2026-07-02T18:49:40Z'
last_reviewed: '2026-07-02'
---
# Document that moon tasks must wrap npm scripts under moon's runtime-only node toolchain

## Goal

Capture the moon-task authoring convention for this Bun-canonical workspace
([[D-0010-monorepo-tooling]], [[M-0005-monorepo-tooling]]): moon v2's
runtime-only toolchains do not expose `node_modules/.bin` on PATH, so tasks must
invoke their runner explicitly (`bun run <script>` / `bunx …`) rather than call
bin-resolved tools (`tsc`, `vitest`) directly. The one exception is the **`test`
task**, pinned to the **node** toolchain so `vitest` runs under Node as the
Node-compatibility gate (M-0005). Writing this down keeps future moon task
definitions from silently failing with command-not-found and preserves the
bun-for-speed / node-for-the-gate split.

> **Supersedes the original "wrap npm scripts" framing.** When the repo was
> npm-canonical, T-MOON wrapped `npm run …` to get `.bin` on PATH. M-0005 makes
> **Bun** the canonical package manager (carried by
> [[T-WKSP-bun-workspace-split]]), so the convention is now: invoke via
> `bun run` / `bunx`, except the node-pinned `test` task. Document this in the
> project's moon / Develop docs so future task definitions follow it.
>
> — reframed from the originating note in [[T-MOON-adopt-moon-monorepo]]

## Today

The convention is documented only in its superseded, npm-canonical form:

| Location | Role today |
|---|---|
| `README.md` | **Develop** section states "npm stays canonical … `npm run <script>` works exactly as before", shows `npx moon run :build` examples it describes as wrapping "the same npm scripts above", and a **Pinned versions** table whose roles read "Node — runs build / typecheck / test" and "Bun — pinned forward-looking … runs no task today". |
| `packages/core/moon.yml` | The `build` task comment explains the no-`.bin`-on-PATH rule for the npm path only: "The npm script is run rather than `tsc` directly because moon v2's runtime-only node toolchain does not put node_modules/.bin on PATH; npm does". |

Once [[T-WKSP-bun-workspace-split]] makes Bun canonical (`bun install` / `bun.lock`, `build`/`typecheck` on the bun toolchain, `test` pinned to node), every one of those statements is wrong — and the reason a task cannot call `tsc`/`vitest` directly is no longer written down for the bun path.

## Proposed

Rewrite the convention docs to match the bun-canonical workspace and state the authoring rule explicitly:

- The **Develop** section reflects Bun as canonical (`bun install`, `bun run …` / `npx moon run :…`), with the pinned-versions roles corrected: **Bun** = installer + `build`/`typecheck` runner; **Node** = the `test` gate and the published-artifact target.
- A short **"Authoring moon tasks"** note (in README, mirrored as a `packages/core/moon.yml` comment at the edit site) states the rule so future tasks follow it:
  > moon v2's runtime-only toolchains do not put `node_modules/.bin` on PATH, so a task must invoke its runner explicitly — `bun run <script>` / `bunx …`, **not** bare `tsc` / `vitest`. The `test` task is deliberately `toolchain: node` so `vitest` runs under Node as the Node-compatibility gate — don't "simplify" it onto bun.

## Approach

This task documents the convention [[T-WKSP-bun-workspace-split]] establishes; land it with or right after that split so the docs describe the live state.

1. Rewrite the `README.md` **Develop** section: replace the npm-canonical framing with `bun install` / `bun run`, update the moon command examples, and correct the **Pinned versions** table roles (Bun = install + build/typecheck; Node = test gate + artifact target). Remove the stale *"Bun … runs no task today"* line.
2. Add a brief **"Authoring moon tasks"** subsection stating the `bun run`/`bunx` rule and the deliberate node-pinned `test` gate.
3. Mirror the rule as a comment in `packages/core/moon.yml` next to the task definitions, so it's visible where tasks are edited.
4. Spot-check that every command shown actually runs against the post-T-WKSP layout.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `README.md` | modify | Rewrite the **Develop** section to bun-canonical commands (`bun install` / `bun run`), correct the **Pinned versions** roles (Bun = install + build/typecheck; Node = test gate + artifact target), and add the "Authoring moon tasks" note. |
| `packages/core/moon.yml` | modify | Add task comments stating the `bun run`/`bunx` rule and the node-pinned `test` gate, at the edit site. |

## Acceptance criteria

- [ ] AC-1: The README **Develop** section documents Bun as canonical (`bun install` / `bun run`), the moon command examples are accurate, and the **Pinned versions** roles read Bun = install + build/typecheck, Node = test gate + artifact target.
- [ ] AC-2: A stated authoring rule appears in **both** the README and a `packages/core/moon.yml` comment: tasks invoke runners via `bun run`/`bunx` (not bare `tsc`/`vitest`) because runtime-only toolchains don't expose `node_modules/.bin`; the `test` task stays `toolchain: node` so `vitest` runs under Node — documented as the reason, not left implicit.
- [ ] AC-3: No stale npm-canonical claims remain — no *"npm stays canonical,"* *"wrap the same npm scripts,"* or *"Bun … runs no task today"* in `README.md` or `packages/core/moon.yml`.
- [ ] AC-4: Every command shown in the rewritten docs runs successfully against the post-[[T-WKSP-bun-workspace-split]] layout.

## Out of scope

- The actual bun-canonical flip (lockfile swap, per-task toolchain, CI bootstrap) — that is [[T-WKSP-bun-workspace-split]]; this task only documents the resulting convention.

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (which makes Bun canonical and pins the `test` task to node); documents the convention that split establishes. Governed by [[D-0010-monorepo-tooling]] / [[M-0005-monorepo-tooling]].

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-MOON-adopt-moon-monorepo]] in https://github.com/sksizer/markdown-contract.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — README Toolchain section rewritten to state the roles in prose (Bun = installer + `build`/`typecheck` runner; Node = the `test`/`coverage` compatibility gate + the runtime the published library targets; pins pointed at `.moon/toolchains.yml`, no invented table); the shown moon commands were run against the worktree (`bunx moon run core:build`, `core:test`, `:build :typecheck :coverage` all OK).
- AC-2: auto + agent-manual — the authoring rule now appears in **both** `README.md` (`### Authoring moon tasks`) and a `packages/core/moon.yml` comment (the `Authoring rule (T-U6W3)` block above `tasks:`); both state the per-toolchain runner split (`bun run` on the `bun` toolchain, `npm run` on the `node` toolchain) and give the node-pinned `test` gate as the documented reason. Presence confirmed by grep.
- AC-3: auto — grep over `README.md` + `packages/core/moon.yml` finds none of "npm stays canonical", "wrap the same npm scripts", or "Bun … runs no task today"; the old npm line was reworded to "The published artifact still ships via `npm publish` from `packages/core`, unchanged from before the split."
- AC-4: agent-manual — each README command was run from the worktree; all succeeded except `bun run metrics`, which exits 127 only because `scc` is not on PATH (an external prerequisite the README already documents). The command wiring is correct.

### What worked

- The baseline-gated quality gate (`quality run --diff-against-baseline`) returned `OK 5/5` with zero new drift, cleanly proving the docs-only edits introduced no regressions against `origin/main`.
- `task gap-report` deterministically pinpointed the single real spec-drift (the moved `moon.yml` touchpoint) rather than leaving it to be discovered mid-implementation.

### Friction and automation gaps

- Task spec referenced `moon.yml` at the repo root, but the now-closed dependency [[T-WKSP-bun-workspace-split]] had relocated it to `packages/core/moon.yml`; the ensure-ready gate flagged the touchpoint as unresolved — a task authored ahead of a dependency that relocates files goes stale silently once that dependency merges. When a task `depends_on:` a now-closed task, `/sdlc:task-work` (or `/sdlc:task-review`) could re-resolve moved touchpoints against the dependency's final layout at pickup and offer the path correction automatically. → [[T-R8JD-task-work-reresolve-moved-touchpoints]]
- The relevance-driven task-doc body fix (the moved-path correction) had no sanctioned path to `origin/main`: an ad-hoc `git push origin HEAD:main` was blocked by the sandbox default-branch-push guard, even though the flow's own `ensure_ready_mutate.ts` / `start_task.ts` push to main fine. Task-work Step 5's "land task-body edits on origin/main before the gate" instruction lacks a sanctioned CLI verb — a small `sdlc task doc-edit --commit-on main` helper (mirroring the ephemeral-worktree push those scripts already use) would give body edits a first-class path. Worked around by folding the correction into the implementation PR instead, which fixes `origin/main` on merge. → [[T-NXAM-task-doc-edit-commit-on-main]]

### Spawned follow-up tasks

- [[T-R8JD-task-work-reresolve-moved-touchpoints]] (https://github.com/sksizer/dev/pull/602) — spawned (Upstream-plugin, sdlc-meta): task-work/task-review re-resolves moved touchpoints from a now-closed dependency's final layout at pickup.
- [[T-NXAM-task-doc-edit-commit-on-main]] (https://github.com/sksizer/dev/pull/604) — spawned (Upstream-plugin, sdlc-meta): a `sdlc task doc-edit --commit-on main` verb to land task-body edits on origin/main via the ephemeral-worktree push.
