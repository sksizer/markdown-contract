---
type: task
schema_version: '5'
id: T-SQFB
status: planning/backlog
created: '2026-07-01'
related:
- '[[M-0010]]'
tags:
- quality
need_human_review: false
impact: low
complexity: small
---
# Document moon runInCI:false + dedicated side-gate workflow pattern

## Goal

T-HIL6 rediscovered a non-obvious moon behavior the hard way: a task marked
`runInCI: false` is skipped by moon even for an **explicit** `moon run <task>`
once moon detects a CI environment (a non-empty `CI` env var). The dedicated
report-only `knip.yml` workflow therefore needs `env: CI: ''` on the step to
exercise the task at all. Capture this pattern in the repo's moon conventions so
the next author of a report-only side-gate workflow (Biome, coverage variants,
future detectors) does not rediscover it.

## Today

| Location | Role today |
|---|---|
| `packages/core/moon.yml` | Declares `lint-docs` and (from T-HIL6) `lint-deps` with `runInCI: false`. The interaction with `moon run` under CI is undocumented. |
| `.github/workflows/knip.yml` | Works around the skip with `env: CI: ''`, explained only in an inline comment on that one workflow. |
| repo docs / conventions | No shared note on the `runInCI: false` + dedicated-side-gate-workflow + `CI:''` pattern; the knowledge lives in a single workflow comment. |

## Proposed

A short, discoverable convention note (in the repo's moon/CI docs or a
conventions file) that states: (1) `runInCI: false` also suppresses explicit
`moon run` under CI; (2) the pattern for running such a task from a dedicated
side-gate workflow is to clear `CI` for that step; (3) when to prefer a
dedicated workflow over the shared `moon run` CI list. Cross-referenced from the
`knip.yml` comment.

## Approach

1. Confirm the moon version's CI-detection behavior (pinned `@moonrepo/cli`
   2.3.5 keys on a non-empty `CI` env var) and whether a cleaner official
   mechanism exists (e.g. a task-level `runInCI` override for explicit runs).
2. Write the convention note describing the `runInCI: false` + dedicated-workflow
   + `CI:''` pattern, with the rationale (report-only gates must not fail the
   shared build gate).
3. Point the `knip.yml` inline comment at the new note; keep the workflows as the
   canonical example.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| repo moon/CI conventions doc | modify | Add the `runInCI: false` + side-gate-workflow + `CI:''` note. |
| `.github/workflows/knip.yml` | modify | Cross-reference the convention note from the inline comment. |

## Acceptance criteria

- [ ] AC-1: A discoverable convention note documents that `runInCI: false` suppresses explicit `moon run` under CI and gives the `CI:''` side-gate pattern.
- [ ] AC-2: The `knip.yml` workflow comment references that note rather than being the sole source of the explanation.

## Out of scope

- Changing the `runInCI: false` setting on any task, or flipping knip to a hard gate.

## Dependencies

- Follows [[T-HIL6]] (which introduced the pattern). Not blocking.

## Discovery context

- Surfaced by the [[T-HIL6]] post-mortem friction list: the moon `runInCI: false` / `CI:''` interaction cost a debugging cycle and is currently documented only in a single workflow comment.
