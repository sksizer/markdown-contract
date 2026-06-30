---
type: task
schema_version: '5'
id: T-5QJV
status: open/ready
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
- registry
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T15:27:51Z'
---
# Prototype: register / manage vault flow

## Goal

Prototype the **register / manage-vault flow** — add a vault (path + config),
edit it, remove it — against mock registry state. The daemon *reads* vaults and
never edits the docs; this UI only manages the registry of which vaults are
tracked. Multiple flow variants live in Storybook.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/mocks/` | the mock registry state ([[T-D7X1-web-ui-mock-api-shapes]]) this flow mutates |
| `prototype/web-ui/components/` | the form/error-state kit ([[T-S5K8-web-ui-status-design-system]]) this flow composes |

## Proposed

An add-vault form (path + config selection) with client-side validation, an
edit/remove flow surfaced from the dashboard/detail, and error states for a
missing path or invalid config — all over mock registry state. **≥2 variants** in
Storybook (e.g. modal vs inline panel). New/edited/removed vaults reflect on the
dashboard ([[T-6RFC-web-ui-vault-dashboard]]).

## Approach

1. Build the add-vault form (path-picker placeholder + config field) with validation states.
2. Build edit + remove affordances on the dashboard/detail.
3. Model error states: missing path, invalid config.
4. Author variants: modal vs inline add flow.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/components/VaultForm.vue` | new | add/edit form + validation |
| `prototype/web-ui/components/VaultForm.stories.ts` | new | flow + error-state variants |

## Acceptance criteria

- [ ] AC-1: Add / edit / remove flows mutate the mock registry and reflect on the dashboard.
- [ ] AC-2: Error states for missing path / invalid config render.
- [ ] AC-3: **≥2 flow variants** exist as Storybook stories.

## Out of scope

- Real filesystem path picking; persisting the registry file; the daemon writing to docs.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); the registry of managed vaults is the durable-intent layer in [[D-0012-distribution-single-exec-and-web-ui]] §D4.
