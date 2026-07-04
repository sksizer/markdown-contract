---
type: task
schema_version: "5"
id: T-SQFB
status: in-progress
created: 2026-07-01
last_reviewed: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
tags:
  - quality
need_human_review: false
impact: low
complexity: small
autonomy: autonomous/pr
readiness_verified_at: 2026-07-04T07:38:27Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/218
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
| `README.md` | Has a "Toolchain → Authoring moon tasks" section — the natural home for the convention — that today says nothing about `runInCI` / moon's CI detection. |

## Proposed

A short, discoverable convention note in `README.md` (under "Authoring moon
tasks") that states: (1) `runInCI: false` also suppresses explicit
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
| `README.md` | modify | Add the `runInCI: false` + side-gate-workflow + `CI:''` note under "Authoring moon tasks". |
| `.github/workflows/knip.yml` | modify | Cross-reference the convention note from the inline comment. |

## Acceptance criteria

- [ ] AC-1: `README.md`'s "Authoring moon tasks" section documents that `runInCI: false` suppresses explicit `moon run` under CI and gives the `CI:''` side-gate pattern.
- [ ] AC-2: The `knip.yml` workflow comment references that note rather than being the sole source of the explanation.

## Out of scope

- Changing the `runInCI: false` setting on any task, or flipping knip to a hard gate.

## Dependencies

- Follows [[T-HIL6]] (which introduced the pattern). Not blocking.

## Discovery context

- Surfaced by the [[T-HIL6]] post-mortem friction list: the moon `runInCI: false` / `CI:''` interaction cost a debugging cycle and is currently documented only in a single workflow comment.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — added the `runInCI: false` + `CI:''` side-gate note to `README.md`'s "Authoring moon tasks" section; inspected the rendered prose to confirm it states the CI-skip behavior, the `CI:''` pattern (citing `.github/workflows/knip.yml`), and when to prefer a dedicated side-gate. Names `core:lint-deps` / `core:lint-docs` as the `runInCI: false` tasks.
- AC-2: agent-manual — extended the `knip.yml` inline comment to cross-reference the README convention ("See README 'Authoring moon tasks' …"); confirmed by reading the workflow that the comment now points at the note rather than being the sole source.

### What worked

- The relevance check confirmed every referenced path and claim up front (both `runInCI: false` tasks in `moon.yml`, the `CI:''` workaround in `knip.yml`, the pinned `@moonrepo/cli` 2.3.5), so no rediscovery was needed during implementation.
- Baseline-gated quality run reported `OK 5/5` with pre-existing findings subtracted; doc-only edits sailed through build/typecheck/lint/test/package-check.

### Friction and automation gaps

- `sdlc quality run --diff-against-baseline` defaulted `--baseline-dir` to the worktree's `.sdlc/` and errored `baseline not found`, because Step 3a captured the baseline in the main-repo `.sdlc/quality-baselines/`; had to re-invoke with an explicit `--baseline-dir` pointing at the main repo — the gate step should resolve the baseline dir against the superproject root (not the worktree) so the Step 7 invocation works without a manual `--baseline-dir` override. → not re-spawned: already tracked upstream in the `sdlc` plugin as the aggregator task `T-44OO-plugin-scripts-self-discover-project-root` plus open PRs sksizer/dev#632, #608, #605, #598. Skipped as an upstream duplicate to avoid fragmenting that backlog.
- The base moved between task pickup and the Step 5b reset (`knip.yml` had been flipped from report-only to a blocking gate on origin/main by parallel work), so the file I first read differed from the branch base; re-reading the worktree copy before editing caught it — a pre-implementation re-read of touched files against the actual branch base (not the pickup-time snapshot) would make this a non-event. → `T-EYC2-reread-touched-files-against-branch-base` (sksizer/dev#654).

### Spawned follow-up tasks

- `T-EYC2-reread-touched-files-against-branch-base` (<https://github.com/sksizer/dev/pull/654>) — spawned; Upstream-plugin (`sdlc-meta`). Pre-implementation re-read of touched files against the post-reset branch base; the PR body cross-references the adjacent-but-distinct T-61OI (#284), T-XU99 (#111), and #602 so the upstream reviewer can close it as a duplicate if they disagree.
- Baseline-dir/superproject friction — not spawned; already covered upstream in the `sdlc` plugin by aggregator task `T-44OO-plugin-scripts-self-discover-project-root` and open PRs sksizer/dev#632, #608, #605, #598 (the same friction landed there across ≥5 prior post-mortems, e.g. `T-61OI`). Skipped to avoid duplicating the upstream backlog.
