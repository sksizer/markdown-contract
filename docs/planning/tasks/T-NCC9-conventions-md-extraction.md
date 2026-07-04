---
type: task
schema_version: "5"
id: T-NCC9
status: in-progress
created: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
tags:
  - docs
  - conventions
  - quality
need_human_review: false
impact: low
complexity: small
autonomy: autonomous/pr
readiness_verified_at: 2026-07-04T19:21:54Z
last_reviewed: 2026-07-04
prs:
  - https://github.com/sksizer/markdown-contract/pull/236
---
# Extract engineering conventions into a human-facing CONVENTIONS.md

## Goal

The repo's engineering conventions (modules & barrels, peer tests, fixture
markdown) live only in `CLAUDE.md` — an agent-instructions file that human
contributors have no reason to open. The
[sksizer/node-template](https://github.com/sksizer/node-template)
library-health baseline ships them as a first-class `CONVENTIONS.md` repo doc.
Extract ours into a root `CONVENTIONS.md` as the single canonical copy, with
`CLAUDE.md` importing it via Claude Code's `@path` import syntax — one source
of truth serving both audiences, no duplicated prose.

## Today

| Location | Role today |
|---|---|
| `CLAUDE.md` | Holds the three engineering-convention sections ("Modules & barrels", "Tests", "Fixture markdown") plus the agent-specific "Commit & PR authorship" rules. Loaded into every agent session; effectively invisible to human contributors. |
| `README.md` | Layout and "Library health baseline" sections; links no conventions doc (the baseline comparison flagged this as the layer-9 delta vs the template's `CONVENTIONS.md`). |
| `packages/core/README.md` | Package-level readme; also links no conventions doc. |

## Proposed

A root `CONVENTIONS.md` holds the three engineering sections verbatim (they
are already well-written; move, don't rewrite). `CLAUDE.md` shrinks to: the
one-line repo intro, an `@CONVENTIONS.md` import (Claude Code resolves `@path`
imports in CLAUDE.md, so agents keep getting the full text), and the
agent-specific "Commit & PR authorship" section, which stays in `CLAUDE.md`
because it instructs agents rather than documenting the codebase. `README.md`
links `CONVENTIONS.md` from the "Library health baseline" section, closing the
conventions-layer delta.

## Approach

1. Create `CONVENTIONS.md` at the repo root: title + the "Modules & barrels",
   "Tests", and "Fixture markdown" sections moved verbatim from `CLAUDE.md`
   (including the `provenance/d0014/` pointer sentence, reworded only as much
   as standalone reading requires).
2. Rewrite `CLAUDE.md` to: the repo-conventions intro line, a line containing
   `@CONVENTIONS.md` (the Claude Code import), and the retained "Commit & PR
   authorship" section. Verify no convention sentence now exists in both
   files.
3. Add a `CONVENTIONS.md` link to `README.md`'s "Library health baseline"
   section (it is the layer-9 counterpart of the template's file).
4. Sanity-check the import: start a scratch agent query (or use
   `claude /memory` inspection) confirming the imported conventions are
   visible in agent context; note the check in the PR.
5. Run `bunx moon run core:lint core:test` (docs-only change; gates must stay
   green — Biome does not format Markdown, so no reflow risk).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `CONVENTIONS.md` | new | The three engineering-convention sections, moved verbatim. |
| `CLAUDE.md` | modify | Replace moved sections with an `@CONVENTIONS.md` import; keep the agent-specific authorship rules. |
| `README.md` | modify | Link `CONVENTIONS.md` from the "Library health baseline" section. |

## Acceptance criteria

- [ ] AC-1: `CONVENTIONS.md` exists at the repo root and contains the "Modules & barrels", "Tests", and "Fixture markdown" sections.
- [ ] AC-2: `CLAUDE.md` contains `@CONVENTIONS.md` and no longer contains the moved section bodies — `grep -c "barrel only" CLAUDE.md CONVENTIONS.md` shows the phrase in exactly one file.
- [ ] AC-3: `README.md` links to `CONVENTIONS.md`.
- [ ] AC-4: The "Commit & PR authorship" section remains in `CLAUDE.md` (agent-facing, not part of the human conventions doc).
- [ ] AC-5: `bunx moon run core:lint core:test` stays green.

## Out of scope

- Rewriting or expanding the conventions themselves — this is a relocation,
  not an editorial pass.
- The untracked local agent-config file under the `.claude/` settings directory
  (the worktree-per-effort instruction) — purely agent-operational and not part
  of the repo's committed docs.
- Adding new convention categories to match the template's `CONVENTIONS.md`
  content (e.g. its error-handling notes, if any) — mirror structure now,
  reconcile content later if the template's file proves richer.

## Dependencies

- none. Docs-only; no ordering constraints with in-flight tasks.

## Discovery context

Surfaced by the node-template baseline comparison (2026-07-04, README
"Library health baseline" section): the template's `pr9-conventions` layer
ships `CONVENTIONS.md` as a human-facing repo doc; this repo's equivalent
content is agent-only in `CLAUDE.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
