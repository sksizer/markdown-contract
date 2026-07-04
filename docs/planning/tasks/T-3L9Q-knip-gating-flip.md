---
type: task
schema_version: '5'
id: T-3L9Q
status: open/ready
created: '2026-07-03'
related:
- '[[M-0010 Quality Tooling]]'
- '[[T-HIL6-knip-dead-code]]'
- '[[T-W1CX-knip-baseline-dead-code-cleanup]]'
depends_on:
- '[[T-W1CX]]'
tags:
- quality
- knip
- ci
need_human_review: false
impact: medium
complexity: medium
autonomy: autonomous/pr
---
# Flip knip from report-only to a blocking CI gate

## Goal

T-HIL6 wired knip as a **report-only** surface (the `knip.yml` step is
`continue-on-error: true`), deferring the gating flip until the baseline was
clean. Since then the finding set has also *grown*: the `apps/web` and
`sites/docs` workspaces added ~11 findings the original `packages/core`
baseline never covered. This task makes knip a real gate — triage the
non-core findings, drive the run to exit 0, remove `continue-on-error`, and
register the check in `sdlc.yaml` — so new dead code turns a PR red instead
of accumulating silently. It completes the last open clause of the M-0010
success criterion "every gate is enforced in CI".

## Today

A `bun run lint:deps` run today (2026-07-03) exits 1 with: 18 unused exports,
6 unused exported types, 1 unused devDependency, 1 unlisted binary, and 1
configuration hint. The 13 findings inside `packages/core/src` are owned by
[[T-W1CX-knip-baseline-dead-code-cleanup]]; the rest are newer and untriaged.

| Location | Role today |
|---|---|
| `knip.json` | Workspace-aware knip config from T-HIL6. Tuned for `packages/core` only; carries a redundant `vitest.config.ts` entry (knip's own configuration hint says to remove it) and no `ignoreBinaries` for `scc`. |
| `package.json` | Root `lint:deps` script (`knip`) and the `metrics` script that shells to `scc` — the source of knip's "unlisted binary: scc" hint (scc is deliberately not an npm dep, per T-X07O). |
| `.github/workflows/knip.yml` | Report-only workflow: runs the knip task with `continue-on-error: true` and `env: CI: ''` (the moon `runInCI: false` side-gate pattern), so findings never fail CI. |
| `packages/core/moon.yml` | Declares the `lint-deps` task (`runInCI: false`, exercised only by `knip.yml`). |
| `sdlc.yaml` | `quality_checks` gates build/typecheck/lint/test/package-check locally — no knip entry (deliberately deferred by T-HIL6). |
| `apps/web/src/daemon/routes.ts` | Reports unused exports `handleHealth`, `resolveVaultPath`, `resolveConfig` — likely reachable only from an entrypoint knip doesn't know about. |
| `apps/web/src/daemon/server.ts` | Reports unused exports `isLoopbackHost`, `runDaemon` and unused type `ServeOptions` — same entrypoint question. |
| `sites/docs/scripts/catalog.ts` | Reports unused exports `CATALOG_DIR`, `CATEGORY_LABELS`. |
| `sites/docs/scripts/checks/cli.ts` | Reports unused exports `extractCommands`, `checkCommand`. |
| `sites/docs/scripts/checks/known-failures.ts` | Reports unused type `KnownFailure`. |
| `sites/docs/package.json` | Declares `zod` as a devDependency that knip reports unused. |

## Proposed

`bun run lint:deps` exits 0 on a clean tree: every current finding is either
deleted (genuinely dead), reachable via a corrected `entry` in `knip.json`
(config gap, e.g. the daemon's serve entrypoint), or explicitly ignored with a
one-line rationale (e.g. `scc` in `ignoreBinaries`). With the run clean, the
`knip.yml` step drops `continue-on-error: true` — a new finding fails the
workflow — and `bun run lint:deps` joins `sdlc.yaml` `quality_checks` so
task-work catches dead code before the push. The gate stays a dedicated
workflow; the shared `moon run` line in `ci.yml` is untouched.

## Approach

1. Land after [[T-W1CX]] (which clears the 13 `packages/core` findings), then
   re-run `bun run lint:deps` to refresh the remaining inventory.
2. Triage the `apps/web` daemon findings: if `routes.ts` / `server.ts` exports
   are reached from a real entrypoint (`runDaemon` callers, a bin, a dev
   script), add that entrypoint to the `apps/web` workspace `entry` in
   `knip.json`; delete only what nothing will call. Prefer config over
   deletion for the live daemon prototype.
3. Triage the `sites/docs` findings the same way: script entrypoints for
   `catalog.ts` / `checks/*.ts` if they are invoked by the site build, delete
   dead helpers otherwise; remove the unused `zod` devDependency from
   `sites/docs/package.json` (or import it where it was intended).
4. Apply the config hygiene: add `scc` to `ignoreBinaries` with a comment
   (external Go binary by design, T-X07O), and drop the redundant
   `vitest.config.ts` entry knip's configuration hint flags.
5. Flip the gate: remove `continue-on-error: true` from the knip step in
   `.github/workflows/knip.yml` (keep `env: CI: ''` and `runInCI: false` — the
   documented side-gate pattern), and add `bun run lint:deps` to `sdlc.yaml`
   `quality_checks`.
6. Verify: clean tree exits 0; add a scratch unused export, confirm
   `bun run lint:deps` exits 1 (this is what now fails the workflow), revert
   the probe.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `knip.json` | modify | Add entrypoints for `apps/web` daemon / `sites/docs` scripts as triage dictates; `ignoreBinaries: ["scc"]`; drop the redundant `vitest.config.ts` entry. |
| `apps/web/src/daemon/routes.ts` | modify | Delete genuinely-dead exports (only those not resolved by an entry fix). |
| `apps/web/src/daemon/server.ts` | modify | Same triage: entry fix or deletion for `isLoopbackHost` / `runDaemon` / `ServeOptions`. |
| `sites/docs/scripts/catalog.ts` | modify | Delete or entry-resolve `CATALOG_DIR` / `CATEGORY_LABELS`. |
| `sites/docs/scripts/checks/cli.ts` | modify | Delete or entry-resolve `extractCommands` / `checkCommand`. |
| `sites/docs/scripts/checks/known-failures.ts` | modify | Delete or entry-resolve `KnownFailure`. |
| `sites/docs/package.json` | modify | Remove the unused `zod` devDependency (or wire the intended usage). |
| `.github/workflows/knip.yml` | modify | Remove `continue-on-error: true` from the knip step — findings now fail the workflow. |
| `sdlc.yaml` | modify | Add `bun run lint:deps` to `quality_checks`. |

## Acceptance criteria

- [ ] AC-1: `bun run lint:deps` exits 0 on a clean checkout — every finding from the 2026-07-03 inventory above is deleted, entry-resolved, or ignored with a written rationale in `knip.json`.
- [ ] AC-2: The knip step in `.github/workflows/knip.yml` has no `continue-on-error`, so a finding fails the workflow; demonstrated with a scratch unused export that makes `bun run lint:deps` exit 1, then reverted.
- [ ] AC-3: `sdlc.yaml` `quality_checks` includes `bun run lint:deps`.
- [ ] AC-4: The `moon run` task list in `.github/workflows/ci.yml` is unchanged — the gate remains a dedicated workflow.
- [ ] AC-5: Full quality gate (`bunx moon run core:build core:typecheck core:lint core:test`) stays green after any deletions.

## Out of scope

- The 13 `packages/core/src` baseline findings — owned by [[T-W1CX-knip-baseline-dead-code-cleanup]] (hard dependency).
- Bringing `packages/core/tests/**` into knip's `project` set to detect unused test helpers — the deferred enhancement noted in T-HIL6.
- Moving the knip gate onto the shared `ci.yml` `moon run` line or flipping `runInCI` to true — the dedicated-workflow shape is deliberate (see the side-gate convention from [[T-SQFB-document-moon-runinci-dedicated-workflow]]).

## Dependencies

- Hard: [[T-W1CX]] — the `packages/core` cleanup must land first or this task inherits its 13 findings. Recorded in frontmatter `depends_on`.
- Soft: [[T-SQFB-document-moon-runinci-dedicated-workflow]] documents the `CI: ''` pattern this workflow keeps; no ordering constraint.

## Discovery context

T-HIL6 deliberately shipped knip report-only ("report-only first, then gate"
per the M-0010 deliverable) and parked the flip. The M-0010 close-out
assessment (2026-07-03) found the flip had no owning task, and a fresh run
showed the finding set had grown beyond the documented baseline as the
`apps/web` and `sites/docs` workspaces landed.
