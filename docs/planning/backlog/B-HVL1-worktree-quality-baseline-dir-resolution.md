---
type: backlog
schema_version: '1'
id: B-HVL1
last_reviewed: '2026-07-04'
tags:
- sdlc
- tooling
- task-work
---
# task-work Step 7 baseline-dir does not resolve to the superproject when run from a worktree

When `/sdlc:task-work` runs inside its worktree (`.sdlc/worktrees/<basename>/`),
Step 7's quality gate

```
sdlc quality run --config <project-root>/sdlc.yaml --diff-against-baseline <sha> --line
```

defaults its baseline-dir to the **worktree's own** `.sdlc/quality-baselines/`.
But Step 3a captured the baseline earlier, while still on `main`, into the
**main repo's** `.sdlc/quality-baselines/<sha>.json`. The two directories are
distinct working trees, so the gate aborts with:

```
error: baseline not found: <worktree>/.sdlc/quality-baselines/<sha>.json
```

The run only proceeds once `--baseline-dir <main-repo>/.sdlc/quality-baselines`
is passed explicitly — knowledge the skill prose does not currently call out at
Step 7. Surfaced during `T-CRWS-catalog-real-world-schemas`, where the first
baseline-gated `quality run` failed for exactly this reason before the explicit
flag was added.

**Idea:** make the baseline location consistent between capture and gate when
task-work runs from a worktree. Either (a) Step 7 resolves the baseline-dir to
the superproject (the worktree's main checkout) by default, or (b) Step 3a writes
the baseline into the worktree's `.sdlc/quality-baselines/` instead of the main
repo's. Whichever side moves, capture and gate must agree on one directory so the
common worktree case needs no manual `--baseline-dir`.

This is most likely an upstream `sdlc`-plugin change (task-work skill prose and/or
the `quality run` baseline-dir default), not a `markdown-contract` repo change —
flag accordingly at triage.

Out of scope for this capture: the non-worktree (standalone) `quality run`
default, which already resolves correctly against the single checkout.
