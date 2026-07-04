---
type: task
schema_version: "5"
id: T-1C0J
status: in-progress
created: 2026-07-02
last_reviewed: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
  - "[[T-0MVN-biome-lint-format]]"
tags:
  - quality
  - lint
  - cleanup
  - biome
  - tech-debt
need_human_review: false
impact: low
complexity: small
autonomy: autonomous/pr
readiness_verified_at: 2026-07-04T07:39:14Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/219
---
# Remove stale eslint-disable comments from test fixtures now that Biome is the linter

## Goal

The repo never adopted ESLint, yet several test fixtures carry
`// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments (copied in from
external examples). Now that [[T-0MVN-biome-lint-format]] has made Biome the enforced
linter, those comments are dead weight: they suppress nothing, and where a real Biome
suppression was added next to one (e.g. the `noSelfCompare` case in
`03-dual-key-section-access.ts`), the stale eslint comment now sits between the
`biome-ignore` and its target line, which is confusing. Sweep them.

## Today

Inventory (verified 2026-07-03 via `grep -rn "eslint-disable" packages/core --include='*.ts'`):
**65 sites** — 64 line-level comments across ten consumption fixtures, plus one
file-level block in a co-located unit test under `src/`.

| Location | Role today |
|---|---|
| `packages/core/tests/fixtures/consumption/*.ts` | Ten fixtures (01–09, 11) carry 64 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments that no linter reads (ESLint is not configured). |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | Has a stale eslint-disable directly above a real `// biome-ignore lint/suspicious/noSelfCompare` comment (added by T-0MVN). |
| `packages/core/src/core/model.test.ts` | Carries a file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` (line 14) — the one site outside `tests/fixtures/`. |

## Proposed

No `eslint-disable` / `@typescript-eslint` comments remain in the codebase. Where the
suppressed concern is real under Biome (e.g. `noExplicitAny` on `(doc.body as any)`), it is
either left unsuppressed (the rule is `warn`, non-blocking) or converted to a proper
`// biome-ignore` with a rationale. The test suite stays green.

## Approach

1. `grep -rn "eslint-disable\|@typescript-eslint" packages/core` to enumerate every site.
2. For each: delete the stale comment; if the underlying finding is a Biome *error*, replace
   with a `// biome-ignore <rule>: <reason>`; if it is only a `warn` (e.g. `noExplicitAny`),
   just delete the comment (warnings do not block the gate).
3. Run `bunx moon run core:lint` (stays green — no new errors) and `bunx moon run core:test`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/fixtures/consumption/*.ts` | modify | Remove stale `eslint-disable` comments; convert to `biome-ignore` only where a real Biome error needs suppressing. |
| `packages/core/src/core/model.test.ts` | modify | Remove the file-level `/* eslint-disable */` block comment. |

## Acceptance criteria

- [ ] AC-1: `grep -rn "eslint-disable" packages/core` returns nothing.
- [ ] AC-2: `bunx moon run core:lint` exits 0.
- [ ] AC-3: `bunx moon run core:test` stays green.

## Out of scope

- Actually fixing the `any` usages the comments point at — that is
  [[T-JGCX-biome-noexplicitany-source-fix]] (and [[T-FOCX-biome-nononnull-source-fix]]
  for non-null assertions). This task only removes dead directives. If T-JGCX lands
  first and rewrites a fixture, re-run the grep — the sweep is cheap either way.

## Dependencies

- [[T-0MVN-biome-lint-format]] (Biome must be the enforced linter first).

## Discovery context

Captured from the [[T-0MVN-biome-lint-format]] post-mortem: the `noSelfCompare` suppression
placement surfaced that stale ESLint directives still live in the fixtures.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `grep -rn "eslint-disable" packages/core` returns nothing (exit 1); no `@typescript-eslint` residue either.
- AC-2: auto — `bunx moon run core:lint` exits 0 (via the `sdlc quality run` gate, `OK 5/5`).
- AC-3: auto — `bunx moon run core:test` stays green (same gate).

### What worked

- The readiness gate passed clean on the first run: the task's inventory (65 sites — 64 line-level across fixtures 01–09/11 plus one file-level block in `model.test.ts:14`) matched the live grep exactly, so no relevance drift to reconcile even though T-JGCX had merged just ahead of this pickup.
- The `noExplicitAny: "warn"` severity in `biome.jsonc` made the whole sweep pure deletion — no `biome-ignore` conversions needed — and the one real suppression (`noSelfCompare` in `03-dual-key-section-access.ts`) was preserved cleanly.
- The baseline-gated quality gate cleanly separated the single new format error from the 325 pre-existing `warn`-level findings, so the gate flagged only drift this branch introduced.

### Friction and automation gaps

- Deleting an eslint comment that sat *between* a lambda header and its body (in `11-real-task-consumed.ts`) let Biome reflow the two lines into one, which surfaced as a format **error** in `biome check:ci` — a raw comment-deletion sweep needs a `biome format --write` follow-up before the lint gate. The quality gate caught it, so no automation gap: expected and handled.
- Step 7's baseline-gated `quality run` (invoked with cwd = the worktree) defaults `--baseline-dir` to `<worktree>/.sdlc/quality-baselines/`, but Step 3a captured the baseline into the *main repo's* `.sdlc/quality-baselines/`; the run failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly — the task-work Step 7 invocation, which omits `--baseline-dir`, cannot find a Step-3a baseline when run from a worktree. → [[T-2GGI-step7-baseline-dir-from-main-repo]]

### Spawned follow-up tasks

- [[T-2GGI-step7-baseline-dir-from-main-repo]] (https://github.com/sksizer/dev/pull/632) — linked to an already-open upstream `sdlc-meta` follow-up in `sksizer/dev` (spawned earlier from [[T-77ST-git-hooks-lefthook]]'s post-mortem for the identical gap). The `/sdlc:spawn-task-pr` idempotency check matched the open head branch `meta-task/step7-baseline-dir-from-main-repo` and resolved to PR #632, so no duplicate PR was opened. The local dedup search could not surface this because T-2GGI lives in the plugin repo, outside this repo's `docs/planning/tasks/` corpus.
- The first friction bullet (Biome reflowing two lines into one after a comment was deleted between a lambda header and its body) was **skipped**, not spawned: the post-mortem itself flags it "no automation gap: expected and handled" — the baseline-gated quality gate already catches the resulting format error, so there is no concrete tooling change to make.
