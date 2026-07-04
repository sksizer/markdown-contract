---
type: backlog
schema_version: '1'
id: B-BUNZ
last_reviewed: '2026-07-04'
tags:
- sdlc
- tooling
- task-work
---
# Readiness/relevance gate does not cross-check task-referenced package-manager verbs and lockfiles against the actual repo layout

Surfaced while running `/sdlc:task-work T-LCA7-dependency-updates-audit`. That
task's `## Proposed`, `## Approach`, `## Files to touch`, and `## Acceptance
criteria` sections literally prescribe `npm ci`, `npm audit --audit-level=high`,
`package-lock.json`, and `actions/setup-node` — but the repo was converted to a
Bun workspace (`T-WKSP` / `D-0010`): `package-lock.json` was deleted, the
committed lockfile is `bun.lock`, and CI already uses `oven-sh/setup-bun@v2` +
`bun install --frozen-lockfile`. The shipped gate therefore had to be adapted to
`bun audit --audit-level=high` against `bun.lock` (the 1:1 Bun equivalent).

The relevant point: neither guard that runs before implementation caught the
drift.

- The **relevance check** (task-work Step 2) extracts referenced file paths and
  confirms they exist, but the task's stale `package-lock.json` reference lives
  in prose the check treats as narrative — it flagged nothing.
- The **readiness gate** (`sdlc task gap-report`) is purely structural: it
  reports `has_gaps: false` as long as the required H2 sections are present. It
  has no notion of whether the package manager / lockfile the spec leans on
  actually exists in the tree. So a task doc can prescribe a toolchain the repo
  no longer uses and still verify implementation-ready.

Here the implementer had an explicit "IMPORTANT LAYOUT" note in the dispatch
brief, so the adaptation was made deliberately and the outcome is correct. But
absent that out-of-band note, the stale npm-era commands would have been
implemented verbatim against a repo with no `package-lock.json` — a workflow
that fails on `npm ci` at the first CI run.

**Idea:** add a lightweight heuristic to the relevance check (or `gap-report`)
that scans the task body for package-manager verbs and lockfile names
(`npm ci`, `npm audit`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`,
`setup-node`, etc.) and cross-checks them against what the repo actually
declares — the root lockfile on disk (`bun.lock` vs `package-lock.json`) and the
package manager CI uses. When the spec references a lockfile/verb the layout has
retired, surface it as a relevance warning ("task references `package-lock.json`
but the repo ships `bun.lock`") rather than silently passing the structural
gate. This is the layout-drift analogue of the existing referenced-path
existence check, extended from files-that-must-exist to
toolchain-that-must-match.

_Follow-up captured on branch `task/T-LCA7-dependency-updates-audit` per the
run's directive to keep post-mortem follow-ups off separate PRs. Sibling
friction items from the same run are already captured as
[[B-HVL1-worktree-quality-baseline-dir-resolution]] (Step 7 baseline-dir) and
[[B-PFPB-permissions-probe-false-positive]] (Step 3b probe)._
