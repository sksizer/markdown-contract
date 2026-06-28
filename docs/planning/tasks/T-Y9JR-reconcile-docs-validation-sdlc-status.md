---
type: task
schema_version: '5'
id: T-Y9JR
status: planning/draft
created: '2026-06-28'
related:
- T-MOON-adopt-moon-monorepo
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Reconcile docs-validation status pattern with the SDLC status enum so in-flight task files validate

## Goal

Close the gap surfaced while adopting moon in [[T-MOON-adopt-moon-monorepo]]
(in https://github.com/sksizer/markdown-contract): the project's own
`validate docs/planning` rejects in-flight SDLC task files because it requires
a `stage/reason` status (`^[a-z-]+/[a-z-]+$`) while the SDLC status vocabulary
legitimately uses bare statuses like `in-progress`. The repo's validator should
accept the status vocabulary of the very task files it is asked to validate so
in-flight task docs stop failing the project's own dogfood check.

> `moon run :lint-docs` fails on this very task file because the orchestrator
> sets `status: in-progress` (a bare stage) while the project's own
> `validate docs/planning` requires the `^[a-z-]+/[a-z-]+$` `stage/reason`
> pattern. The mismatch is between the SDLC task-status vocabulary (allows bare
> `in-progress`) and markdown-contract's own docs-validation schema. The
> project's docs-validation pattern and the SDLC status enum should be
> reconciled so in-flight task docs don't fail the repo's own validator.
>
> — originating note from [[T-MOON-adopt-moon-monorepo]]

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

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-MOON-adopt-moon-monorepo]] in https://github.com/sksizer/markdown-contract.
