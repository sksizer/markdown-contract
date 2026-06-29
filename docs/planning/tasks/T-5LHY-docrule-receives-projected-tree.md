---
type: task
schema_version: '5'
id: T-5LHY
status: planning/draft
created: '2026-06-29'
related:
- T-TXAP-text-predicate-builders
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Pass the projected tree to DocRule for line-exact whole-document text scopes

## Goal

Whole-document (`textRule`) `forbids` line-positioning is limited: the `DocRule`
runtime contract passes only the typed `Doc` model (`src/core/validate.ts`), whose
`SectionView` exposes list/table positions but not per-paragraph source lines, so
prose hits anchor just after the heading rather than at the offending line. Give
`DocRule` access to the projected tree (not just the model) so whole-document text
scopes can emit line-exact findings.

> Whole-document (`textRule`) `forbids` line-positioning is limited: the `DocRule`
> runtime contract passes only the typed `Doc` model (`validate.ts:100`), whose
> `SectionView` exposes list/table positions but not per-paragraph source lines, so
> prose hits are anchored just after the heading (fixture 23's expected line moved
> 3→2 for a blank-line gap the model can't see). A line-exact whole-document scope
> needs the `DocRule` to receive the projected tree, not just the model — worth a
> follow-up.
>
> — from [[T-TXAP-text-predicate-builders]] post-mortem

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

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-TXAP-text-predicate-builders]] in https://github.com/sksizer/markdown-contract.
