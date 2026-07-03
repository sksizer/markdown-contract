---
type: task
schema_version: '5'
id: T-MUDE
status: planning/draft
created: '2026-07-03'
related:
- T-SCRB-typed-row-read-back
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Add a shared conditional-safe type-equality test helper for row types

## Goal

Strict `Equal<>` type-equality false-negatives on deferred conditional/mapped
types like `RowOf<...>`: the two sides are equivalent but TypeScript won't
reduce the conditional before comparing, so the assertion fails. The T-SCRB
type test worked around this with a `Resolve<>` homomorphic-mapped-type wrapper
that forces reduction before comparison. Promote that into a shared,
conditional-safe type-equality helper in the test utilities so conditional-heavy
row types can be asserted without each test rediscovering the `Resolve<>` trick.
Spawned as a Local follow-up from [[T-SCRB-typed-row-read-back]] in
https://github.com/sksizer/markdown-contract.

> Strict `Equal<>` type-equality false-negatived on the deferred `RowOf<...>` conditional types; a `Resolve<>` homomorphic-mapped-type wrapper was needed to force reduction before comparison — a shared conditional-safe type-equality helper would save rediscovering this each time a row type is conditional-heavy.
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
