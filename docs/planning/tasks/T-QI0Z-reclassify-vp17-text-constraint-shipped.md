---
type: task
schema_version: '5'
id: T-QI0Z
status: planning/draft
created: '2026-06-30'
related:
- T-CVPL-catalog-validation-planes
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Reclassify catalog VP-17 text-constraint example from planned to shipped

## Goal

The validation-planes catalog carries `VALIDATION-PLANES-17` (text-constraint
`requires` / `forbids`, C-0009 / D-0011) as `status: planned`, but the builders
already ship in `src/core/text-constraints.ts` with fixtures 22–25. Do a human
reclassification pass: decide whether VP-17 should become a shipped, verified
entry and reconcile its planned-vs-shipped framing across `docs/example-catalog.md`
and `docs/catalog/validation-planes.yaml`.

> From [[T-CVPL-catalog-validation-planes]] in
> https://github.com/sksizer/markdown-contract: VP-17 (text-constraint
> `requires`/`forbids`) is framed as planned (C-0009/D-0011) but the builders
> already ship in `src/core/text-constraints.ts` with fixtures 22–25. Kept
> `planned` per the explicit AC-4 instruction, but the catalog's
> planned-vs-shipped framing for this feature is worth a human reclassification
> pass.

Sibling to the in-flight [[T-237L-reconcile-text-constraint-catalog-syntax]]
(PR https://github.com/sksizer/markdown-contract/pull/113), which does the same
planned-vs-shipped reconciliation for the `DECLARATIVE-YAML-14..20` entries in
the `declarative-yaml` category. These two cover the same text-constraint
planned-vs-shipped issue across two catalog categories and may be folded together
at the receiver's discretion.

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

<Things adjacent to this task that are deliberately NOT being addressed
here. Useful for keeping PR review focused and for future tasks to point
back to. Always required: if scope is obvious and nothing is excluded,
leave a single "- none" bullet so the explicit signal is "scope
considered, nothing to exclude.">

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from
[[T-CVPL-catalog-validation-planes]] in
https://github.com/sksizer/markdown-contract.
