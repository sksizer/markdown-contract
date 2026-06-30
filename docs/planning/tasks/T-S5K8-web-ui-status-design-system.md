---
type: task
schema_version: "5"
id: T-S5K8
status: in-progress
created: 2026-06-30
related:
  - "[[M-0009-local-web-ui-vault-dashboard]]"
  - "[[C-0010-single-binary-and-vault-dashboard]]"
  - "[[D-0012-distribution-single-exec-and-web-ui]]"
depends_on:
  - "[[T-ZLND-web-ui-prototype-app]]"
tags:
  - web-ui
  - prototype
  - design
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
readiness_verified_at: 2026-06-30T14:02:35Z
last_reviewed: 2026-06-30
prs:
  - https://github.com/sksizer/markdown-contract/pull/109
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

- AC-1: auto — `design/tokens.ts` defines the full status set (`green` / `findings` / `drift` / `running` / `error`) plus the three-level severity scale (`error` / `warn` / `report`, with `rank`); typechecked clean by the prototype's `npm run typecheck` (vue-tsc), and rendered end-to-end by the `Kit/StatusBadge` `Gallery` and `Kit/SeverityBadge` `Scale` stories in the successful `npm run build-storybook`.
- AC-2: auto — `npm run build-storybook` built all nine kit components; each ships ≥3 named, fixture-driven variants (StatusBadge 6, VaultCard 6, FindingRow 5, ContractGroup 4, SeverityBadge 4, AppHeader/EmptyState/LoadingState/ErrorState 3), comfortably above the ≥2 floor in `prototype/web-ui/CONVENTIONS.md`.
- AC-3: auto — `EmptyState.vue`, `LoadingState.vue`, and `ErrorState.vue` are standalone first-class components, each with its own multi-variant story file; all three built successfully in the same `build-storybook` run.
- deferred-user: the *final visual direction* (which variant wins) is explicitly out of scope here — it is chosen at the review gate [[T-UTKU-web-ui-prototype-review]]. Reviewers should open Storybook (`npm run storybook`) and compare the `Kit/*` variants side by side.

### What worked

- The T-ZLND scaffold paid off: `CONVENTIONS.md` (the ≥2-variant rule), the mock fixtures (`cleanVault` / `warningVault` / `failingVault`), the `--mc-*` CSS custom properties, and the `@storybook/vue3-vite` config gave the kit a clean, well-documented surface to build against, so the kit slotted in with zero scaffold changes.
- Keeping the new `drift` / `running` accent colors in `design/tokens.ts` (bound inline in components) rather than adding CSS variables kept the entire diff inside the owned `components/` + `design/` subtree — no contention with the parallel sibling task on `mocks/` + `types/`.
- The prototype's own `npm run typecheck` + `npm run build-storybook` gave complete local, non-interactive verification of all three ACs, so the run was fully auto-verified with no human spot-check required to confirm the components render.
- Baseline-gated `quality run` cleanly separated pre-existing root-typecheck drift from this branch's (zero) new drift, so the root gate passed without manual triage.

### Friction and automation gaps

- none observed
