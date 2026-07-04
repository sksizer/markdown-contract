---
type: backlog
schema_version: '1'
id: B-UHOH
last_reviewed: '2026-07-04'
tags:
- monorepo
- testing
- packages-core
status: promoted/task
result: '[[T-1GIL-vendor-c0004-projection-fixture]]'
---
# `packages/core` projection test reaches out to a repo-root planning doc — vendor it as a package-local fixture

The Bun-workspace split (T-WKSP) surfaced a package-isolation smell:
`packages/core/src/core/projection.test.ts` reads a *real* provenance entity
document as a projection fixture —
`docs/planning/capabilities/C-0004-dialect-aware-projection.md` — which lives at
the **workspace root**, not inside the package. Before the split the relative
path was `../../docs/planning/...` (repo root == package root); after the move it
had to climb out of the package to `../../../../docs/planning/...`.

That works, but it couples `packages/core`'s test suite to a file outside the
package: extracting or independently testing `packages/core` would break, and the
depth is pinned to the exact `packages/<name>/` layout.

**Idea:** vendor a snapshot of the C-0004 doc (or a representative real-entity
document) under `packages/core/tests/fixtures/` and point the test at the
package-local copy, so the package is self-contained. If the intent is
specifically to catch drift against the live repo doc, keep that as a separate,
clearly-labelled repo-level check rather than a `packages/core` unit test.

Captured on-branch during T-WKSP per the PR-consolidation directive (no separate
follow-up PR).
