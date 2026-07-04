---
type: task
schema_version: '5'
id: T-T5JW
status: planning/draft
created: '2026-07-04'
related:
- T-8ZKX-retire-legacy-vaultdashboard-component
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Refresh apps/daemon-web-prototype README file-tree and CONVENTIONS examples to drop retired-component references

## Goal

Retiring the legacy `VaultDashboard` component and its leaves left stale prose
references to the deleted files in the prototype's own docs — `apps/daemon-web-prototype/README.md`
and `apps/daemon-web-prototype/CONVENTIONS.md`. Because these are prose/examples rather
than imports, neither an acceptance criterion nor the knip check flagged them, and they
fell outside the retiring task's declared `## Files to touch`. This follow-up freshens
those docs so they only cite surviving components. Originating from
[[T-8ZKX-retire-legacy-vaultdashboard-component]] in https://github.com/sksizer/markdown-contract.

> From the originating task's post-mortem:
>
> Retiring the legacy VaultDashboard component and its leaves (VaultStatusCard,
> FindingsList, RunSummary) left stale references in apps/daemon-web-prototype/README.md
> (the components/ file-tree and the variant-convention example table) and
> apps/daemon-web-prototype/CONVENTIONS.md (naming-convention examples). These are
> prose/examples, not imports, so no acceptance criterion or knip check caught them.
> Freshen the README file-tree and repoint the convention examples to surviving components.

## Today

_TBD — receiver to fill before promoting from planning/draft._

## Proposed

_TBD — receiver to fill before promoting from planning/draft._

## Approach

_TBD — receiver to fill before promoting from planning/draft._

## Files to touch

_TBD — receiver to fill before promoting from planning/draft._

## Acceptance criteria

_TBD — receiver to fill before promoting from planning/draft._

## Out of scope

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from [[T-8ZKX-retire-legacy-vaultdashboard-component]] in https://github.com/sksizer/markdown-contract.
