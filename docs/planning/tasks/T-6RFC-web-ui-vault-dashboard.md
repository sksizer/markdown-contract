---
type: task
schema_version: '5'
id: T-6RFC
status: in-progress
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-ZLND-web-ui-prototype-app]]'
- '[[T-D7X1-web-ui-mock-api-shapes]]'
- '[[T-S5K8-web-ui-status-design-system]]'
tags:
- web-ui
- prototype
- dashboard
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T17:39:35Z'
last_reviewed: '2026-06-30'
---
# Prototype: all-vaults dashboard (home) view

## Goal

Prototype the **all-vaults dashboard** — the "are they all green?" home view:
every registered vault as a status card/row with at-a-glance state, a refresh-all
affordance, and the first-run empty state. Multiple layout variants live in
Storybook so the review gate can pick one.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/components/` | the `VaultCard` / `StatusBadge` kit ([[T-S5K8-web-ui-status-design-system]]) this screen composes |
| `prototype/web-ui/mocks/` | the mock vault list ([[T-D7X1-web-ui-mock-api-shapes]]) this screen renders |

## Proposed

A dashboard screen rendering the mock vault list with at-a-glance status,
sort/filter by status, refresh-all + per-vault refresh affordances (mock no-ops),
and a first-run empty state. **≥2 layout variants** in Storybook (e.g. card grid
vs dense table), plus all-green / mixed / all-error data variants. Each vault
links through to the detail view ([[T-4CUI-web-ui-vault-detail-findings]]).

## Approach

1. Build the dashboard screen composing `VaultCard` / `StatusBadge` over the mock vault list.
2. Add sort/filter by status and refresh-all + per-vault refresh affordances (mock-driven).
3. Add the first-run empty state (no vaults registered).
4. Author ≥2 layout variants as Storybook stories (grid vs table) and data variants (all-green / mixed / all-error).
5. Link each card through to the vault-detail route.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/pages/index.vue` | new | the dashboard screen |
| `prototype/web-ui/pages/index.stories.ts` | new | layout + data variants |

## Acceptance criteria

- [ ] AC-1: The dashboard renders all mock vaults with the correct status treatment for each of the five status states (`green` / `findings` / `drift` / `running` / `error`).
- [ ] AC-2: **≥2 layout variants** and the empty/first-run state exist as Storybook stories.
- [ ] AC-3: Cards link through to vault detail.
- [ ] AC-4: A `refresh-all` affordance is present (mock-driven) that re-fetches the full mock vault list.

## Out of scope

- Real validation runs; live SSE updates ([[T-0P0U-web-ui-live-status-sse]]); registry mutation ([[T-5QJV-web-ui-vault-registry]]).

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); the all-vaults status surface is the primary face described in [[C-0010-single-binary-and-vault-dashboard]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
