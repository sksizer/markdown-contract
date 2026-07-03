---
type: task
schema_version: '5'
id: T-83FP
status: planning/draft
created: '2026-07-03'
related:
- T-SCRB-typed-row-read-back
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Guard table() generic overloads against the declarative loader's dynamic call site

## Goal

When T-SCRB added typed generic overloads to `table()`, they rejected the
declarative loader's dynamic `table()` call — the loader builds its `cells` map
with the placeholder `ZodType`, which none of the new literal-typed overloads
accepted — until a third runtime/dynamic overload was added. Add a standing
regression check (a type-level and/or runtime test exercising the dynamic/loader
call site) so future combinator-overload changes must keep the dynamic call site
compiling, not only the literal ones. Spawned as a Local follow-up from
[[T-SCRB-typed-row-read-back]] in https://github.com/sksizer/markdown-contract.

> New typed overloads on `table()` rejected the declarative loader's dynamic `table()` call (built with the placeholder `ZodType`) until a third runtime/dynamic overload was added — adding generic overloads to a combinator should include a check against dynamic/loader call sites, not only literal ones.
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
