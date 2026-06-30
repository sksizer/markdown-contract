---
type: task
schema_version: '5'
id: T-4CUI
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
- findings
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T15:24:51Z'
last_reviewed: '2026-06-30'
---
# Prototype: vault detail & findings drill-down

## Goal

Prototype the **per-vault detail view and findings drill-down** — pass/fail per
contract, findings grouped by contract, each finding drillable to its
file·line·severity·rule·message (the [[D-0001-finding-model]] shape). Multiple
presentation variants live in Storybook.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/components/` | the `FindingRow` / `ContractGroup` / `StatusBadge` kit ([[T-S5K8-web-ui-status-design-system]]) this view composes |
| `prototype/web-ui/mocks/` | the findings-heavy + green vault fixtures ([[T-D7X1-web-ui-mock-api-shapes]]) this view renders |

## Proposed

A vault-detail screen: a header (status, last-run, counts), a contracts list with
pass/fail and finding counts, findings grouped by contract, and a finding detail
showing file·line·severity·rule·message. **≥2 variants** in Storybook (e.g.
grouped-by-contract vs flat severity-sorted), plus a green (zero-findings) state.
Back-navigation returns to the dashboard ([[T-6RFC-web-ui-vault-dashboard]]).

## Approach

1. Build the detail header (status, last-run, finding counts).
2. Build the contract grouping with pass/fail and per-contract finding counts.
3. Build the finding row + detail (file:line, severity, rule id, message), reusing `FindingRow`.
4. Author variants: grouped-by-contract vs flat list; green vault vs findings-heavy vault.
5. Provide back-navigation to the dashboard.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/pages/vault/[id].vue` | new | the vault-detail screen |
| `prototype/web-ui/pages/vault/[id].stories.ts` | new | presentation + data variants |

## Acceptance criteria

- [ ] AC-1: Detail renders contracts with pass/fail and findings grouped by contract from mock data.
- [ ] AC-2: A finding shows file·line·severity·rule·message.
- [ ] AC-3: **≥2 presentation variants** exist as Storybook stories, plus a green (zero-findings) state.

## Out of scope

- Opening the actual offending file (no editor integration); drift ([[T-HHLC-web-ui-drift-view]]); live updates ([[T-0P0U-web-ui-live-status-sse]]).

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); drill-into-findings-per-contract is the detail surface called out in [[C-0010-single-binary-and-vault-dashboard]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — grouped presentation renders one `ContractGroup` per contract (findings grouped on the first segment of the namespaced rule `id`), with pass/fail per contract surfaced as the group subtitle and a "N pass / N fail" header summary; bound to the `VaultStatus` mock fixtures. Verified by `vue-tsc --noEmit` and `storybook build` (the `Screens/VaultDetail` `GroupedByContract` story indexes off `findingsVaultStatus`). Visual render is a deferred-user spot-check.
- AC-2: auto — reuses the kit `FindingRow`, which renders SeverityBadge (severity) + rule `id` + `path:line:col` location + message + optional fix. Exercised in both presentations; covered by typecheck + Storybook build.
- AC-3: auto — two prop-driven presentations (`grouped` default, `flat` severity-sorted via `severityRank`) plus five named Storybook variants including the required `Green` zero-findings state. `storybook build` indexes all five `Screens/VaultDetail` stories. Visual comparison is a deferred-user spot-check.

### What worked

- The merged design-system kit (`FindingRow`, `ContractGroup`, `SeverityBadge`, `StatusBadge`, `EmptyState`, `ErrorState`) and the `VaultStatus` mock fixtures (`findingsVaultStatus`/`greenVaultStatus`/`errorVaultStatus`/`driftVaultStatus`) composed cleanly — the screen is almost entirely composition, no new tokens or API types.
- The dual-surface guard (prefer `props.vault`, short-circuit before `useRoute()`) let one prop-driven SFC serve both the Nuxt route and Nuxt-free Storybook without a separate screen component.
- `storybook build` is a real AC-3 gate: it indexes the stories and surfaces compile errors, so "≥2 variants exist and load" is machine-checkable, not just asserted.

### Friction and automation gaps

- The Step 7 baseline gate fails from the worktree unless `--baseline-dir` is passed explicitly — Step 3a captures the baseline into the MAIN repo's `.sdlc/quality-baselines/`, but `quality run --diff-against-baseline` from the worktree defaults to the WORKTREE's `.sdlc/quality-baselines/` and reports "baseline not found". task-work Step 7 should pass the same `--baseline-dir` (main-repo path) it passed at Step 3a capture, or the executor should resolve the baseline dir against the superproject root.
- `worktree_init: ["npm install"]` installs only the root project's deps; the nested `prototype/web-ui` Nuxt app's deps were absent, so the implementer had to `npm install` inside `prototype/web-ui` before typecheck/Storybook. For web-UI tasks the worktree-init recipe (or a task note) should also install the nested app's deps.
- The `preflight_permissions` probe (Step 3b) reported `npm`, `Write`, and `Edit` as ungranted, but all three worked at runtime in this harness — a false-positive that forced a proceed-anyway judgment call. The probe reads static settings files and can't see the harness's effective grants; a note that a failing probe is advisory (and an empirical write/exec smoke-test as a tiebreaker) would reduce the friction.
- Storybook's `stories` glob covered only `components/**`, so a page-level story under `pages/` required editing the shared `.storybook/main.ts` — a shared-file touch the task's "Files to touch" didn't anticipate. Worth either globbing `pages/**` up front in the prototype scaffold or noting the glob edit in screen-task specs.
