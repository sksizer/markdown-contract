---
type: task
schema_version: '5'
id: T-1GIL
status: open/ready
created: '2026-07-04'
related: []
tags: []
need_human_review: false
impact: medium
complexity: medium
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
