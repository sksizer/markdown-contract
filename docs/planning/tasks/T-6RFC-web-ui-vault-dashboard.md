---
type: task
schema_version: "5"
id: T-6RFC
status: in-progress
created: '2026-06-30'
related:
  - "[[M-0009-local-web-ui-vault-dashboard]]"
  - "[[C-0010-single-binary-and-vault-dashboard]]"
  - "[[D-0012-distribution-single-exec-and-web-ui]]"
depends_on:
  - "[[T-ZLND-web-ui-prototype-app]]"
  - "[[T-D7X1-web-ui-mock-api-shapes]]"
  - "[[T-S5K8-web-ui-status-design-system]]"
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
prs:
  - https://github.com/sksizer/markdown-contract/pull/127
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

- AC-1 (all five status states rendered with correct treatment): auto — prototype `npm run typecheck` (`nuxt prepare && vue-tsc --noEmit`) passed and `npm run build-storybook` compiled the `index.stories` chunk, proving the grid/table render every state (`error` surfaces `vault.error.message`; `running` shows an inline `LoadingState`; `drift` shows `drift.entries.length`; `findings`/`green` show `countByLevel` badges) on the five-state `VaultStatus` model. deferred-user — visual correctness of each status treatment.
- AC-2 (≥2 layout variants + empty/first-run as stories): auto — the `layout: "grid" | "table"` prop drives both layouts and the Storybook build produced the `Grid`, `Table`, and `Empty` variant chunks (plus `AllGreen` / `Running` / `WithError`).
- AC-3 (cards link to detail): agent-manual — every grid card root and every table row name is `<a :href="/vault/${vault.id}">` (plain anchor, Storybook-safe); confirmed in source. deferred-user — actual navigation in the running app.
- AC-4 (refresh-all affordance, mock-driven): agent-manual — a "Refresh all" button calls `refreshAll()`, which re-invokes the `mockApi.listVaults()` seam and reassigns the reactive list; a per-state summary tally ("are they all green?") and status-legend filter chips are present. deferred-user — interaction feel.

### What worked

- `pages/vault/[id].vue` was an exact dual-surface template: the prop-or-load pattern, explicit-imports-only discipline, and plain-anchor navigation transferred to the new page cleanly, so the `@storybook/vue3-vite` (Nuxt-free) surface and the Nuxt app shell both render it without divergence.
- The mock seam already exported everything the screen needed — `mockApi.listVaults()`, all five per-state `VaultStatus` fixtures, and `emptyVaultList` — so AC-1's five states and the empty state needed zero new fixtures (CONVENTIONS.md "drive variants off mocks" satisfied for free).
- The kit (`StatusBadge`, `EmptyState`, `LoadingState`, `statusTokens`) covered all five states out of the box; the screen is pure composition over `design/tokens.ts`.
- The baseline-gated Step 7 gate cleanly separated the 4 pre-existing `typecheck` findings on `origin/main` from this branch's drift (zero new), so the gate passed without manual triage.

### Friction and automation gaps

- Permission-probe false positive — `preflight_permissions.ts` reported `Bash(bun:*)`, `Bash(npm:*)`, `Write`, and `Edit` as missing even though the harness granted them all (bun/git/Write/Edit ran throughout). In an autonomous dispatch there is no operator to confirm, so the probe's exit-1 is pure noise. Gap: the probe should reconcile against demonstrated tool access / the resolved runtime sandbox, not only the static settings files.
- Step 7 baseline-dir resolution in a worktree — the gate, run from the worktree, looked for the baseline under the *worktree's* `.sdlc/quality-baselines/`, but Step 3a captured it in the *main repo's* `.sdlc/`. The gate failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly. Gap: task-work Step 7's default baseline-dir should resolve to the superproject (main repo) when cwd is a linked worktree, matching where Step 3a writes it.
- Nested-app deps not installed by `worktree_init` — `worktree_init: [bun install]` installs only root deps; the prototype's own `vue-tsc` / Storybook needed a separate `npm install` in `prototype/web-ui/`. Already tracked by the in-flight meta-task `worktree-init-installs-nested-app-deps`; not re-filed.
- Legacy `components/VaultDashboard.vue` orphaned — replacing the `pages/index.vue` scaffold left the older two-state dashboard component referenced only by its own story (a duplicate `Screens/*` sidebar entry). Captured as backlog `B-8ZKX-retire-legacy-vaultdashboard-component` (retire/reconcile) and committed on this branch rather than as a separate follow-up PR, per the PR-consolidation directive.
