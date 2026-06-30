---
type: task
schema_version: '5'
id: T-HHLC
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
- drift
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
readiness_verified_at: '2026-06-30T15:26:39Z'
last_reviewed: '2026-06-30'
---
# Prototype: config drift view (init --check surface)

## Goal

Prototype the **config-drift view** — the `init --check` surface: what config
inference would change versus the committed config. Multiple presentation
variants live in Storybook.

## Today

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` | `inferConfig` / the `--check` drift logic the *real* view will later call; the prototype only mirrors its result shape |
| `prototype/web-ui/mocks/` | the mock drift payload ([[T-D7X1-web-ui-mock-api-shapes]]) this view renders |

## Proposed

A drift screen/panel showing a diff between the committed config and the inferred
config — added / removed / changed entries — with an in-sync vs in-drift summary
status. **≥2 variants** in Storybook (e.g. unified diff vs side-by-side), with
in-sync and drifted data variants. Drift status surfaces as a badge on the vault
card/detail, linking here.

## Approach

1. Build the drift summary (in-sync vs in-drift) from the mock drift payload.
2. Build the change list: added / removed / changed config entries.
3. Author variants: unified vs side-by-side diff; in-sync vs drifted data.
4. Surface a drift badge on the vault card/detail that links to this view.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/components/DriftView.vue` | new | the drift diff view |
| `prototype/web-ui/components/DriftView.stories.ts` | new | presentation + data variants |

## Acceptance criteria

- [ ] AC-1: The drift view renders added / removed / changed config entries from mock drift data.
- [ ] AC-2: In-sync and drifted states both render.
- [ ] AC-3: **≥2 presentation variants** exist as Storybook stories.

## Out of scope

- Running real `inferConfig` / `--check`; applying or writing config changes.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); drift is the third status dimension (green / findings / drift) in [[C-0010-single-binary-and-vault-dashboard]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
