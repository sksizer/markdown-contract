---
type: task
schema_version: '5'
id: T-Y9JR
status: closed/done
created: '2026-06-28'
completion_note: 'Resolved by #67: contracts/task.contract.yaml now validates status against the canonical SDLC enum (including bare in-progress) instead of the ^[a-z-]+/[a-z-]+$ stage/reason pattern, so in-flight task docs pass validation. Non-task contracts keep the pattern, which is correct since milestones and decisions have no bare statuses.'
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

Resolved. The project's own `validate docs/planning` used to reject in-flight task
files whose `status` is a bare SDLC stage (e.g. `in-progress`), because
`contracts/task.contract.yaml` constrained `status` with `^[a-z-]+/[a-z-]+$` (a
`stage/reason` shape) while the task-status vocabulary legitimately includes bare
statuses. The validator contradicted the very docs it was asked to validate.

## Proposed

Make the task contract accept the canonical SDLC status vocabulary so in-flight
task docs validate.

## Approach

Shipped in #67 (`fix/task-contract-status-enum`): the `status` constraint in
`contracts/task.contract.yaml` was replaced with an `enum` of the canonical SDLC
task statuses (`planning/*`, `open/ready`, `in-progress`, `in-progress/blocked`,
`closed/*`). The other entity contracts (milestone, decision, capability, product,
driver) keep `^[a-z-]+/[a-z-]+$` — correct, since those entities have no bare-stage
statuses to admit.

## Files to touch

- `contracts/task.contract.yaml` — `status` pattern → enum (done in #67).

## Acceptance criteria

- A task doc with `status: in-progress` passes
  `node dist/cli/index.js validate docs/planning`. ✓ verified against the enum.

## Out of scope

- Reconciling the non-task contracts — they have no bare statuses, so no change is
  needed there.

## Dependencies

- Resolved by #67 (`fix/task-contract-status-enum`).

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-MOON-adopt-moon-monorepo]] in https://github.com/sksizer/markdown-contract.
