---
type: backlog
schema_version: '1'
id: B-L0CK
last_reviewed: '2026-07-01'
tags:
- bun
- lockfile
- dx
- task-work
---
# Local proto bun writes a `configVersion` line into `bun.lock` that the canonical CI bun neither writes nor requires

Surfaced while running `/sdlc:task-work T-L77L-package-publish-hygiene`. Adding
two devDependencies (`publint`, `@arethetypeswrong/cli`) to
`packages/core/package.json` required a `bun install` to update the committed
root `bun.lock`. Both bun binaries available locally through proto — the
`1.3.12` shim on `PATH` **and** the pinned `~/.tools/proto/tools/bun/1.3.14/bun`
(the version CI pins via `oven-sh/setup-bun@v2` in `.moon/toolchains.yml`) —
write an extra top-level field into the lockfile:

```
   "lockfileVersion": 1,
+  "configVersion": 0,
   "workspaces": { ... }
```

But the committed `bun.lock` on `main` has no `configVersion` line, and CI is
green against it — meaning the bun that generated the canonical lock (and CI's
`bun install --frozen-lockfile`) neither writes nor requires that field. So a
routine local `bun install` dirties `bun.lock` with a spurious one-line diff
that has nothing to do with the intended dependency change, and the field has to
be hand-stripped before committing to keep the lock in the exact format CI's
frozen install accepts. (Verified for this task: after stripping the line and
committing, `~/.tools/proto/tools/bun/1.3.14/bun install --frozen-lockfile`
reports "no changes" and exit 0 — so the stripped lock is the correct committed
shape.)

This is a per-developer papercut: every dependency-touching task in this Bun
workspace risks an unexplained `configVersion` line sneaking into the lockfile
diff, and a reviewer or the author has to know to strip it.

**Idea (pick when triaged):**

- Pin the *dev* bun that a local `bun install` uses so it matches whatever bun
  produced the canonical committed lock — e.g. a proto/`.prototools` pin for the
  interactive shell bun (not just the moon-toolchain pin), or a documented
  `packageManager`/`.bun-version` marker — so local installs and CI agree on the
  lockfile format and no field churns.
- Or add a cheap `worktree_init` / pre-commit assertion that fails loudly if
  `bun install --frozen-lockfile` (with the pinned bun) would modify `bun.lock`,
  catching format drift before it lands rather than in review.
- Or, if `configVersion: 0` is in fact harmless-and-forward-compatible, accept
  it once into the committed lock so future installs are no-ops — but only after
  confirming CI's `--frozen-lockfile` tolerates it.

Root cause is unconfirmed (a bun version/format quirk vs. a proto-shim
behaviour); the triage should first pin down *which* bun wrote the clean
committed lock, since both local proto binaries reproduce the churn.

Captured on-branch during T-L77L per the PR-consolidation directive (no separate
follow-up PR).
