---
type: task
schema_version: '5'
id: T-4CUI
status: planning/draft
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
