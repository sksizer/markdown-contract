---
type: backlog
schema_version: '1'
id: B-PFPB
last_reviewed: '2026-07-04'
tags:
- sdlc
- task-work
- dx
---
# `task-work` Step 3b permissions probe reports false-positive gaps in this environment

While running `/sdlc:task-work T-CEMB-catalog-embed-and-ci`, the Step 3b
permissions probe
(`plugin/skills/task-work/preflight_permissions.ts`) exited `1` and reported four
gaps:

```
bun: missing Bash(bun:*)
npm: missing Bash(npm:*)
Write: missing Write(/…/.sdlc/worktrees/T-CEMB-catalog-embed-and-ci/**)
Edit: missing Edit(/…/.sdlc/worktrees/T-CEMB-catalog-embed-and-ci/**)
```

Every one of those was a false positive: the run executed dozens of `bun run …`
and `npm run …` commands (the lease CLI, the readiness gate, the quality run) and
multiple `Write`/`Edit` calls into that exact worktree path — all succeeded. The
probe resolves against the literal settings file(s) and does not account for
permissions the Claude Code harness grants at runtime, so on this environment it
fires a spurious AskUserQuestion on **every** supervised task-work run, training
the operator to reflexively pick "proceed anyway."

**Idea:** make the probe self-falsifying for the tool families it can cheaply
test — e.g. probe `bun --version` / `npm --version` and a scratch `Write`/`Edit`
into a temp path under the would-be worktree, and treat an empirically-working
family as covered regardless of what the settings file lists. Failing that,
downgrade an unconfirmed gap to a non-blocking stderr note rather than a blocking
prompt, so the false positive does not gate the run.

This is an upstream `sdlc` plugin concern (the probe lives in
`plugin/skills/task-work/`), captured here per the PR-consolidation directive
rather than spawned as a separate follow-up PR. Out of scope for this capture:
whether the harness should surface its runtime grants to the settings resolver in
the first place.
