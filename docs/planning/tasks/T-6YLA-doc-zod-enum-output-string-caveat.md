---
type: task
schema_version: '5'
id: T-6YLA
status: planning/draft
created: '2026-07-03'
related:
- T-SCRB-typed-row-read-back
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Document zod v4 enum output resolves to string, not the literal union

## Goal

In zod v4, `z.output<ZodEnum<...>>` resolves to `string`, not the literal
union of the enum members, so a type-level cell read-back test cannot narrow on
an enum-declared cell — it has to anchor on a `.transform()` cell (which yields
a distinct object output) to prove per-column narrowing. Capture this
zod-version behavior in the structured-cells design/decision docs so future
task specs don't assume enum-literal read-back and mis-scope their type-level
acceptance criteria. Spawned as a Local follow-up from
[[T-SCRB-typed-row-read-back]] in https://github.com/sksizer/markdown-contract.

> zod v4 `z.output<ZodEnum<...>>` resolves to `string`, not the literal union, so the AC-2 type test had to anchor on a `.transform()` cell (distinct object output) rather than enum-literal narrowing — a task spec that assumes enum-literal read-back should note the zod-version behavior up front.
>
> — [[T-SCRB-typed-row-read-back]]

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

_TBD — receiver to fill before promoting from planning/draft._

## Dependencies

_TBD — receiver to fill before promoting from planning/draft._

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-03 UTC from
[[T-SCRB-typed-row-read-back]] in https://github.com/sksizer/markdown-contract.
