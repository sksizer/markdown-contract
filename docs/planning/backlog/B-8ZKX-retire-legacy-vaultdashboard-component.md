---
type: backlog
schema_version: '1'
id: B-8ZKX
last_reviewed: '2026-07-04'
tags:
- web-ui
- prototype
- cleanup
status: promoted/task
result: '[[T-8ZKX-retire-legacy-vaultdashboard-component]]'
---
# Retire or reconcile the legacy `VaultDashboard` component now that `pages/index.vue` is the dashboard

T-6RFC rebuilt the all-vaults dashboard directly into `apps/daemon-web-prototype/pages/index.vue`
on the five-state `VaultStatus` model (green / findings / drift / running / error,
via `mockApi.listVaults()`). Before that, `pages/index.vue` was a thin scaffold that
rendered `apps/daemon-web-prototype/components/VaultDashboard.vue` — an earlier dashboard built
on the older two-state `VaultSummary` / `result.exitCode` model.

After T-6RFC the page no longer imports `VaultDashboard.vue`, so that component is now
referenced only by its own peer story (`components/VaultDashboard.stories.ts`, title
`Screens/VaultDashboard`). The result is two "dashboard" entries in the Storybook
sidebar — the live `Screens/Dashboard` (the new page) and the orphaned
`Screens/VaultDashboard` (the legacy component) — and a component on the older data
model that nothing in the app shell exercises.

The new page deliberately used the distinct title `Screens/Dashboard` to avoid a
sidebar collision; that was the minimal, disjoint-path move for T-6RFC (which scoped
itself to `pages/index.vue` + `pages/index.stories.ts`). This item is the cleanup that
was intentionally left out of scope.

**Idea:** decide the fate of the legacy `VaultDashboard.vue` + `VaultDashboard.stories.ts`
(and its leaf `VaultStatusCard.vue`, if it too is now unused):

- **Retire** — delete the legacy component, its story, and any now-orphaned leaves, so the
  prototype carries a single dashboard surface on the canonical five-state model; or
- **Reconcile** — if any of those leaves are still wanted, migrate them onto the
  `VaultStatus` model and fold them into the new page rather than leaving a parallel
  two-state dashboard.

First confirm what (if anything) still imports `VaultDashboard.vue` / `VaultStatusCard.vue`
outside their own stories before deleting. Payoff: one dashboard surface, one data model,
no duplicate `Screens/*` entry confusing the review gate.
