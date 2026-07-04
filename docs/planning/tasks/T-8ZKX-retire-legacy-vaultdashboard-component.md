---
type: task
schema_version: '5'
id: T-8ZKX
status: in-progress
created: '2026-07-04'
related: []
tags: []
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: '2026-07-04T11:22:14Z'
last_reviewed: '2026-07-04'
---
# Retire or reconcile the legacy VaultDashboard component now that pages/index.vue is the dashboard

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 from the linked backlog origin story
> ([[B-8ZKX-retire-legacy-vaultdashboard-component]]). Review the Goal, Approach,
> Today, Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

T-6RFC rebuilt the all-vaults dashboard directly into `pages/index.vue` on the
five-state `VaultStatus` model, orphaning the earlier `VaultDashboard.vue` (built on
the two-state `VaultSummary` / `result.exitCode` model) and its leaf components — now
referenced only by their own Storybook stories. This leaves a duplicate `Screens/*`
dashboard entry and dead code on an obsolete data model. Retire the orphaned legacy
component and every leaf its removal orphans so the prototype carries one dashboard
surface on one model.

## Today

| Location | Role today |
|---|---|
| `apps/daemon-web-prototype/pages/index.vue` | The live all-vaults dashboard (Storybook `Screens/Dashboard`), built on the five-state `VaultStatus` model via `mockApi.listVaults()`; imports only kit components, not `VaultDashboard`/`VaultStatusCard`. |
| `apps/daemon-web-prototype/components/VaultDashboard.vue` | Orphaned earlier dashboard on the two-state `VaultSummary` model; imported only by its own story. Renders a grid of `VaultStatusCard` plus `RunSummary` and `FindingsList`. |
| `apps/daemon-web-prototype/components/VaultStatusCard.vue` | Per-vault card imported only by the legacy `VaultDashboard.vue` (and its own story); unused by `pages/index.vue`. |
| `apps/daemon-web-prototype/components/FindingsList.vue` | Findings list imported only by the legacy `VaultDashboard.vue`; `DriftView.vue` mentions it in a prose comment, not an import. |
| `apps/daemon-web-prototype/components/RunSummary.vue` | Per-vault run summary imported only by the legacy `VaultDashboard.vue`. |

## Proposed

The prototype has a single dashboard surface (`pages/index.vue`, Storybook
`Screens/Dashboard`) on the five-state `VaultStatus` model. The legacy
`VaultDashboard.vue`, its story, and every leaf its removal orphans (`VaultStatusCard`,
`FindingsList`, `RunSummary`) plus their stories are deleted. No `Screens/VaultDashboard`
entry remains in Storybook, and the repo knip check reports no new unused files.

## Approach

1. Confirm the orphan set: grep the app (excluding each component's own `.stories.ts`)
   for importers of `VaultDashboard.vue`, `VaultStatusCard.vue`, `FindingsList.vue`, and
   `RunSummary.vue`. Expected result — each is imported only by the legacy dashboard
   and/or its own story (`DriftView.vue` references `FindingsList` only in a comment).
2. Delete `VaultDashboard.vue` and its story `VaultDashboard.stories.ts`.
3. Delete the leaves the removal orphans and their stories — `VaultStatusCard`,
   `FindingsList`, `RunSummary` — each only after step 1 confirms no remaining importer.
4. Update the stale `FindingsList` reference in `DriftView.vue`'s comment so it no longer
   cites a deleted component; check `apps/daemon-web-prototype/mocks/types` and drop the
   now-dead `VaultSummary` type only if nothing else references it (do not touch the live
   `VaultStatus` model).
5. Run the prototype typecheck/build and the Storybook build; confirm only
   `Screens/Dashboard` remains and no import resolves to a deleted file.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/daemon-web-prototype/components/VaultDashboard.vue` | delete | Remove the orphaned legacy dashboard (two-state model). |
| `apps/daemon-web-prototype/components/VaultDashboard.stories.ts` | delete | Remove its story (the duplicate `Screens/VaultDashboard` sidebar entry). |
| `apps/daemon-web-prototype/components/VaultStatusCard.vue` | delete | Leaf used only by the legacy dashboard. |
| `apps/daemon-web-prototype/components/VaultStatusCard.stories.ts` | delete | Its story. |
| `apps/daemon-web-prototype/components/FindingsList.vue` | delete | Leaf imported only by the legacy dashboard; delete after confirming no other importer. |
| `apps/daemon-web-prototype/components/FindingsList.stories.ts` | delete | Its story. |
| `apps/daemon-web-prototype/components/RunSummary.vue` | delete | Leaf imported only by the legacy dashboard; delete after confirming no other importer. |
| `apps/daemon-web-prototype/components/RunSummary.stories.ts` | delete | Its story. |
| `apps/daemon-web-prototype/components/DriftView.vue` | modify | Update the code comment that references the now-deleted `FindingsList`. |

## Acceptance criteria

- [ ] AC-1: `VaultDashboard.vue` and `VaultDashboard.stories.ts` no longer exist under `apps/daemon-web-prototype/components/`.
- [ ] AC-2: `grep -rn` under `apps/daemon-web-prototype` finds no import of `VaultStatusCard.vue`, `FindingsList.vue`, or `RunSummary.vue`, and those files and their stories are deleted.
- [ ] AC-3: The Storybook build lists exactly one dashboard entry (`Screens/Dashboard`); `Screens/VaultDashboard` is gone.
- [ ] AC-4: The prototype typecheck/build passes and the repo knip check reports no new unused-file findings.

## Out of scope

- Rebuilding or restyling the live `pages/index.vue` dashboard — this task only removes dead code.
- The "reconcile" alternative (migrating legacy two-state `VaultSummary` logic into the new dashboard) — retire is chosen because nothing outside stories exercises the legacy surface.
- The separate `apps/web` Nuxt UI, a different surface from `apps/daemon-web-prototype`.

## Dependencies

- none (T-6RFC already shipped the replacement dashboard).

## Discovery context

Promoted from [[B-8ZKX-retire-legacy-vaultdashboard-component]]. The cleanup was
explicitly left out of scope by T-6RFC, which scoped itself to `pages/index.vue` +
`pages/index.stories.ts` and used the distinct title `Screens/Dashboard` to avoid a
sidebar collision.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
