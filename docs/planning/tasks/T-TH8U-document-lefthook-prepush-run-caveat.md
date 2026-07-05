---
type: task
schema_version: '5'
id: T-TH8U
status: open/ready
created: '2026-07-04'
related:
- T-QX1Q-gate-covers-declaration-emit
tags: []
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-07-05T05:11:09Z'
---
# Note the lefthook pre-push manual-run caveat (needs --all-files without unpushed commits)

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 because the task is
> autonomy: autonomous/pr. Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

This repo's lefthook pre-push gate needs a documented caveat about manual dry-runs,
originating from [[T-QX1Q-gate-covers-declaration-emit]] in
`git@github.com:sksizer/markdown-contract.git`. When someone tries to demonstrate a
pre-push gate failure by hand, `bunx lefthook run pre-push` silently skips its gates on
a branch that has no upstream / no unpushed commits, which is easy to misread as a
passing gate. Recording the caveat in the hook comment and/or the git-hooks docs keeps a
future manual run from drawing the wrong conclusion.

> _From [[T-QX1Q-gate-covers-declaration-emit]]:_
>
> `bunx lefthook run pre-push` skips its gates with 'no matching push files' on a branch
> that has no upstream / no unpushed commits, so demonstrating a pre-push gate failure
> manually requires `--all-files` (or a real `git push`). The gate fires correctly on an
> actual push; only the manual dry-run is affected. Note this manual-run caveat in the
> hook's comment in lefthook.yml and/or the README git-hooks docs so a future run does
> not misread a skipped manual invocation as a passing gate.

## Today

| Location | Role today |
|---|---|
| `lefthook.yml` | The `pre-push` command block runs `bunx moon run core:typecheck core:test`. Its header comment documents hook arming and the `git push --no-verify` bypass, but says nothing about `bunx lefthook run pre-push` silently skipping its gates on a branch with no upstream / no unpushed commits. |
| `README.md` | The **Git hooks** bullet (near line 38) documents lefthook arming and the per-run `--no-verify` bypass, but omits the manual dry-run caveat — a hand-run `bunx lefthook run pre-push` looks like it passed when it actually matched no push files. |

## Proposed

Record the manual-run caveat in both the `lefthook.yml` `pre-push` comment block and
the README **Git hooks** bullet: `bunx lefthook run pre-push` skips its gates with
"no matching push files" on a branch that has no upstream / no unpushed commits, so
demonstrating a pre-push gate failure by hand requires `--all-files` (or a real
`git push`). The gate fires correctly on an actual push; only the manual dry-run is
affected. Keeping the note in both places means a future manual run does not misread a
skipped invocation as a passing gate.

## Approach

1. In `lefthook.yml`, extend the `pre-push:` comment block (the header comment above
   `commands:` / the `gates:` entry) with a "Manual run caveat" note: `bunx lefthook run
   pre-push` skips its gates ("no matching push files") on a branch with no upstream / no
   unpushed commits; pass `--all-files` (or push for real) to force the gate to run by hand.
2. In `README.md`, extend the **Git hooks** bullet with the same caveat sentence so the
   docs and the hook comment agree.
3. Keep the wording consistent between the two locations. This is a comment/docs-only
   change — do not alter any hook `run:` command or gate behavior.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `lefthook.yml` | modify | Add a manual-run caveat note to the `pre-push` comment block. |
| `README.md` | modify | Add the same caveat sentence to the **Git hooks** bullet. |

## Acceptance criteria

- [ ] AC-1: `lefthook.yml` contains a comment noting that `bunx lefthook run pre-push`
  skips its gates on a branch with no unpushed commits, and that `--all-files` (or a real
  `git push`) is required to exercise the gate by hand.
- [ ] AC-2: The README **Git hooks** section contains an equivalent caveat sentence.
- [ ] AC-3: No hook `run:` command or gate behavior changes — the diff is limited to a
  comment in `lefthook.yml` and prose in `README.md`.

## Out of scope

- Changing any pre-push / pre-commit gate behavior or the commands the hooks run.
- Altering lefthook arming (the `prepare` script or `worktree_init`).
- Adding tooling/automation to detect or warn about the skipped manual run.

## Dependencies

- none — this is a standalone docs/comment change. It originated from
  [[T-QX1Q-gate-covers-declaration-emit]] but does not depend on it.

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from
[[T-QX1Q-gate-covers-declaration-emit]] in `git@github.com:sksizer/markdown-contract.git`.
