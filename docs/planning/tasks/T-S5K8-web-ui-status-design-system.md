---
type: task
schema_version: '5'
id: T-S5K8
status: in-progress
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-ZLND-web-ui-prototype-app]]'
tags:
- web-ui
- prototype
- design
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T14:02:35Z'
last_reviewed: '2026-06-30'
---
# Prototype: status visual language & shared component kit

## Goal

Establish the **status visual language** (`green` / `findings` / `drift` /
`running` / `error`), the severity scale, and the **shared component kit** that
the surface screens compose. This is the visual spine of the whole dashboard;
Storybook hosts multiple variants of each component so we can compare directions
before committing.

## Today

| Location | Role today |
|---|---|
| `docs/planning/decisions/D-0012-distribution-single-exec-and-web-ui.md` | the status taxonomy (green / findings / drift) exists only as prose here and in C-0010 |
| `prototype/web-ui/` | the scaffold + Storybook harness ([[T-ZLND-web-ui-prototype-app]]) this kit lands in |

## Proposed

A documented status/severity **token set** (state → color · icon · label) plus a
Storybook-cataloged **component kit** — `StatusBadge`, `VaultCard`, `FindingRow`,
`ContractGroup`, `EmptyState`, `Loading`, `ErrorState`, and the app layout/header
— each key component shipping **≥2 comparable variants** as stories. Empty,
loading, and error are first-class, not afterthoughts.

## Approach

1. Define status + severity tokens (color, icon, label) for all five states.
2. Build the core component kit (badges, cards, finding rows, contract groups, layout/header, empty/loading/error).
3. Author ≥2 visual variants per key component in Storybook for side-by-side comparison.
4. Document the candidate direction; final pick deferred to the review gate ([[T-UTKU-web-ui-prototype-review]]).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/components/` | new | shared component kit |
| `prototype/web-ui/design/tokens.ts` | new | status + severity tokens |
| `prototype/web-ui/components/*.stories.ts` | new | multi-variant stories per component |

## Acceptance criteria

- [ ] AC-1: A status/severity token set covers all five states (`green` / `findings` / `drift` / `running` / `error`) plus severity levels.
- [ ] AC-2: The core component kit renders in Storybook, each key component with **≥2 comparable variants**.
- [ ] AC-3: Empty, loading, and error states exist as first-class components with stories.

## Out of scope

- Final brand / visual polish — the winning direction is chosen at [[T-UTKU-web-ui-prototype-review]].
- Real data / engine wiring.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]] (scaffold + Storybook harness). Consumes the status taxonomy pinned in [[T-D7X1-web-ui-mock-api-shapes]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); the status taxonomy is the green/findings/drift language from [[C-0010-single-binary-and-vault-dashboard]] / [[D-0012-distribution-single-exec-and-web-ui]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
