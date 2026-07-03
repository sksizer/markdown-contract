---
type: backlog
schema_version: '1'
id: B-QF64
last_reviewed: '2026-07-01'
tags:
- monorepo
- moon
- bun
- dx
---
# Guard that `bunx moon` resolves the pinned `@moonrepo/cli`, not a shadowing global proto moon

During T-WKSP, `bunx moon` initially ran a **global proto-managed moon (1.41.8)**
instead of the workspace-pinned `@moonrepo/cli@2.3.5`. Two things combined to hide
it:

1. Bun links a workspace *package's* dev-dependency bin into that package's own
   `node_modules/.bin` (here `packages/core/node_modules/.bin/moon`), **not** the
   workspace-root `node_modules/.bin`. With moon only in `packages/core`'s
   devDeps, root `bunx moon` found no local bin and fell through to the `moon` on
   `PATH` (a proto shim). Fixed by moving `@moonrepo/cli` (and `@biomejs/biome`)
   to the **root** `package.json` devDependencies.
2. moon's config schema is version-inverted (`vcs.client` in 2.x vs `vcs.manager`
   in 1.x), so the wrong-version moon surfaced as a *config parse error* rather
   than an obvious "wrong moon" — masking the real cause.

Under the older moon the per-task `toolchain:` split silently degraded to
`system` (build/typecheck/test all ran on ambient PATH), so the bun/node gate
would not actually be enforced.

**Idea:** add a cheap preflight (a `worktree_init` verb, or a moon/CI step) that
asserts `bunx moon --version` equals the version pinned in `.moon/toolchains.yml`
/ root `@moonrepo/cli`, failing loudly on a shadowing global. This catches the
regression on any machine with a global proto moon on `PATH`.

Captured on-branch during T-WKSP per the PR-consolidation directive (no separate
follow-up PR).
