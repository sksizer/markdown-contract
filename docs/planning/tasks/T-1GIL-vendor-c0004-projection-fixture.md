---
type: task
schema_version: "5"
id: T-1GIL
status: in-progress
created: 2026-07-04
related: []
tags: []
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: 2026-07-04T09:42:37Z
last_reviewed: 2026-07-04
prs:
  - https://github.com/sksizer/markdown-contract/pull/221
---
# Vendor the C-0004 projection fixture into packages/core instead of reaching out to a repo-root planning doc

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 from the linked backlog origin story
> ([[B-UHOH-vendor-c0004-projection-fixture]]). Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

`packages/core/src/core/projection.test.ts` reads a real provenance document —
`docs/planning/capabilities/C-0004-dialect-aware-projection.md` at the workspace root —
as a projection fixture, climbing out of the package with `../../../../`. That couples the
package's test suite to a file outside the package and pins the exact `packages/<name>/`
depth, so extracting or independently testing `packages/core` would break. Vendor a
package-local snapshot and point the test at it so the package is self-contained.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/core/projection.test.ts` | Projection unit tests; one case reads the root doc via `../../../../docs/planning/capabilities/C-0004-dialect-aware-projection.md` (~line 448), coupling the suite to a file outside the package. |
| `docs/planning/capabilities/C-0004-dialect-aware-projection.md` | The real provenance capability doc used as the projection fixture; lives at the workspace root, not inside the package. |
| `packages/core/tests/fixtures/` | Package-local fixtures dir (`consumption`, `corpus`, `infer`, `validation`); has no projection fixture, so the test reaches out to the repo root instead. |

## Proposed

A vendored snapshot of the C-0004 document lives under `packages/core/tests/fixtures/`,
and `projection.test.ts` loads the package-local copy. The package no longer reaches
outside its own tree for the projection fixture and the `../../../../` climb is gone. If
drift-against-the-live-doc coverage is still wanted, it lives as a separate,
clearly-labelled repo-level check rather than a `packages/core` unit test.

## Approach

1. Copy `docs/planning/capabilities/C-0004-dialect-aware-projection.md` verbatim to a
   package-local fixture, e.g. `packages/core/tests/fixtures/projection/C-0004-dialect-aware-projection.md`.
2. Update `projection.test.ts` to load the vendored copy via a package-local relative
   path (no `../../../../` climb), keeping the same assertions (H1 title, H2 sections,
   frontmatter `id: C-0004`, the `^summary` anchor).
3. Confirm the vendored bytes satisfy what the test asserts; run the core test suite.
4. Decide the drift question: if catching drift against the live repo doc is desired, add
   a separate, clearly-labelled repo-level check (out of scope here) rather than
   re-coupling the unit test.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/fixtures/projection/C-0004-dialect-aware-projection.md` | new | Vendored package-local snapshot of the C-0004 capability doc. |
| `packages/core/src/core/projection.test.ts` | modify | Point the projection case at the vendored fixture; remove the `../../../../` root climb. |

## Acceptance criteria

- [ ] AC-1: `packages/core/src/core/projection.test.ts` contains no `../../../../` (nor any path escaping `packages/core/`) — it loads the fixture from within the package.
- [ ] AC-2: A package-local fixture file exists under `packages/core/tests/fixtures/` and the projection test loads it.
- [ ] AC-3: The core test suite passes: the C-0004 projection case still asserts the H1 title, H2 sections, frontmatter `id: C-0004`, and the `^summary` anchor against the vendored copy.

## Out of scope

- Adding a repo-level drift check comparing the vendored snapshot against the live `docs/planning/capabilities/C-0004-dialect-aware-projection.md` — noted as a follow-up, deliberately not a `packages/core` unit test.
- Vendoring fixtures for any other test that reaches outside the package — only the projection C-0004 case is in scope here.

## Dependencies

- none.

## Discovery context

Promoted from [[B-UHOH-vendor-c0004-projection-fixture]]. The coupling surfaced during
the T-WKSP Bun-workspace split, when the fixture path had to climb from `../../` to
`../../../../` after `packages/core` moved below the repo root.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `command grep '\.\./\.\./\.\./\.\.' packages/core/src/core/projection.test.ts` returns 0 matches; the test now loads `../../tests/fixtures/projection/C-0004-dialect-aware-projection.md`, which stays inside `packages/core/`.
- AC-2: auto — fixture exists at `packages/core/tests/fixtures/projection/C-0004-dialect-aware-projection.md` (byte-identical to the source doc per `cmp`), and `projection.test.ts` loads it; the case passes under `bunx moon run core:test`.
- AC-3: auto — `bunx moon run core:test` passes; the C-0004 case still asserts the H1 title (`Dialect-aware projection`), the H2 Summary/Statement sections, frontmatter `id: C-0004` / `type: capability`, and the `^summary` anchor against the vendored copy.

### What worked

- Clean run — the baseline-gated quality gate reported `OK 6/6` on the first pass with zero new drift.
- `cp` of the source doc preserved the fixture byte-for-byte (`cmp` confirmed identical), so no assertion needed adjusting; the vendoring was a pure path swap plus a comment refresh.

### Friction and automation gaps

- The pre-flight permissions probe (Step 3b) reported hard gaps for `Bash(bun:*)`, `Write`, and `Edit` that were false positives — `bun` ran throughout the session and `Write`/`Edit` were available — because the probe reads static settings without reconciling against tools already exercised successfully this session. The probe could down-weight a gap for a tool family already observed working, or task-work could treat a demonstrated-working family as covered. → [[T-0X9M-probe-credits-session-observed-tools]]
- Step 7's baseline-gated `quality run` failed on the first attempt (`baseline not found`) because the baseline is written to the main repo's `.sdlc/quality-baselines/` in Step 3a, but running from the worktree resolves the default `--baseline-dir` to the worktree's own `.sdlc/`. Step 7's invocation should pass `--baseline-dir` pointing at the main repo (the worktree's superproject) when run from a worktree, matching where Step 3a captured it. → [[T-4U2H-quality-run-baseline-dir-from-worktree]]

### Spawned follow-up tasks

- [[T-0X9M-probe-credits-session-observed-tools]] (https://github.com/sksizer/dev/pull/658) — task-work permissions pre-flight probe treats session-observed tool families as covered; spawned Upstream-plugin (sdlc-meta).
- [[T-4U2H-quality-run-baseline-dir-from-worktree]] (https://github.com/sksizer/dev/pull/659) — task-work Step 7 quality run targets the main-repo baseline dir when run from a worktree; spawned Upstream-plugin (sdlc-meta).
