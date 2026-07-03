---
type: task
schema_version: '5'
id: T-EW8J
status: planning/draft
created: '2026-07-02'
related:
- T-SCFX-structured-cells-fixture-scaffold
- T-SCPP-cell-position-preservation
- T-SCRB-typed-row-read-back
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Refresh stale packages/core paths across the docs/planning task corpus in one pass

## Goal

The `packages/core/` monorepo relocation left pre-existing task files under
`docs/planning/` citing stale `src/…` and `tests/…` paths plus the old
`npm run typecheck` command. Today each task only gets corrected ad hoc at
pickup via the relevance check, which costs extra commit/push rounds against a
moving `origin/main`. This task closes that gap with a single repo-wide sweep
that refreshes the whole corpus at once. Spawned as a Local follow-up from
[[T-SCFX-structured-cells-fixture-scaffold]] in
https://github.com/sksizer/markdown-contract.

> The packages/core/ monorepo relocation (T-WKSP) left pre-existing task files
> under docs/planning/ citing old `src/…` and `tests/…` paths plus the old
> `npm run typecheck` command; each task only gets corrected ad hoc at pickup
> via the relevance check, costing extra commit/push rounds against a moving
> origin/main. Do a one-shot repo-wide sweep of docs/planning/ that rewrites
> relocated paths (and the moved typecheck/quality commands) to their
> packages/core/ + moon equivalents, refreshing the whole corpus at once
> instead of per-task at pickup.
>
> — [[T-SCFX-structured-cells-fixture-scaffold]]

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

Spawned by /sdlc:spawn-task-pr on 2026-07-02 UTC from
[[T-SCFX-structured-cells-fixture-scaffold]] in
https://github.com/sksizer/markdown-contract.

### Dedup search (spawn-from-post-mortem)

Bullet: The task spec's file paths were stale (`src/core/*`, `tests/*`, and AC-6's `npm run *`) after the repo moved to a moon monorepo (`packages/core/*`, moon verbs); they had to be retargeted on `origin/main` before the readiness gate would resolve touchpoints. A periodic task-relevance sweep after a repo restructure would catch this class before pickup.
Keywords searched: task-relevance, touchpoints, restructure, retargeted, readiness, monorepo, packages, periodic
Excluded: T-SCPP-cell-position-preservation
Top candidates (score / status / headline):

- 46 / closed/done / T-HIL6-knip-dead-code — Add knip to detect unused files, exports, and dependencies
- 30 / closed/done / T-WKSP-bun-workspace-split — Split the repo into a Bun workspace — `packages/core` (+ `apps/web` placeholder)
- 25 / closed/done / T-SCFX-structured-cells-fixture-scaffold — Scaffold the structured-cells fixtures and enable gates (`cell-typed` / `list-typed` / `cell-pos`)
- 20 / closed/done / T-U6W3-document-moon-npm-script-wrapping — Document that moon tasks must wrap npm scripts under moon's runtime-only node toolchain
- 19 / closed/done / T-DAEM-daemon-and-json-api — `daemon` mode + a JSON API over the runner — the `apps/web` server face

Decision: LINKED-EXISTING (T-EW8J-refresh-planning-paths-post-monorepo-split)
Rationale: Overrode the script's SPAWNED. The keyword scorer under-ranked this task (score 0 — its own body predates the "task-relevance/touchpoints" vocabulary), but T-EW8J is a genuine near-duplicate: it already exists to refresh exactly the stale `src/…`/`tests/…`/`npm run` paths that the monorepo relocation left across the docs/planning corpus — the same friction this bullet reports. Linking here avoids spawning a duplicate Local sweep task; the bullet's "periodic sweep" framing informs T-EW8J's scope.

### Dedup search (spawn-from-post-mortem)

Bullet: Task touchpoints referenced the pre-monorepo `src/core/*` / `tests/*` paths; a monorepo migration had relocated everything under `packages/core/` on `origin/main` after the task was authored, so the readiness gate failed until the paths were retargeted — a sibling task (T-SCPP) hit the identical drift. A migration that relocates a package root should sweep open task touchpoints (a path-rewrite pass over `docs/planning/tasks/`) so downstream pickups don't each re-discover the same stale-path gate failure.
Keywords searched: pre-monorepo, path-rewrite, touchpoints, re-discover, referenced, everything, retargeted, downstream
Excluded: T-SCRB-typed-row-read-back
Top candidates (score / status / headline):
  - 5 / closed/done / T-U6W3-document-moon-npm-script-wrapping — Document that moon tasks must wrap npm scripts under moon's runtime-only node toolchain
  - 4 / closed/done / T-FMSP-frontmatter-split-primitive — Frontmatter/body split — a pure splitter retained on the `parse()` result
  - 4 / closed/done / T-L77L-package-publish-hygiene — Validate published-package hygiene with publint and are-the-types-wrong
  - 3 / open/ready / T-SCDF-structured-cells-dogfood — Dogfood structured cells on a realistic worked contract and close the milestone
  - 2 / closed/done / T-2HF6-projection-engine — Implement the projection — one parse into a positioned DocTree, GFM + invariants, and the resolved Obsidian dialect
Decision: LINKED-EXISTING → T-EW8J-refresh-planning-paths-post-monorepo-split
Rationale: The script decided SPAWNED — its keyword extraction picked hyphenated tokens (pre-monorepo, path-rewrite, touchpoints, …) that don't lexically overlap this task's body, so keyword scoring did not surface it. Overridden to LINKED-EXISTING by hand: this task IS the proposed fix — a one-shot repo-wide sweep of docs/planning/ that rewrites the packages/core monorepo-relocation's stale `src/…` / `tests/…` paths — so the T-SCRB post-mortem's path-rewrite-sweep bullet is a duplicate ask, linked here from [[T-SCRB-typed-row-read-back]] rather than re-spawned.
