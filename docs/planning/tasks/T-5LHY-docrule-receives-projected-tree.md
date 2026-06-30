---
type: task
schema_version: '5'
id: T-5LHY
status: in-progress
created: '2026-06-29'
related:
- T-TXAP-text-predicate-builders
- T-TXYL-declarative-requires-forbids
depends_on:
- '[[T-TXAP-text-predicate-builders]]'
tags: []
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
readiness_verified_at: '2026-06-30T05:43:18Z'
last_reviewed: '2026-06-30'
---
# Pass the projected tree to DocRule for line-exact whole-document text scopes

## Goal

Whole-document (`textRule`) `forbids` line-positioning is limited: the `DocRule`
runtime contract passes only the typed `Doc` model (`src/core/validate.ts`), whose
`SectionView` exposes list/table positions but not per-paragraph source lines, so
prose hits anchor just after the heading rather than at the offending line. Give
`DocRule` access to the projected tree (not just the model) so whole-document text
scopes can emit line-exact findings.

> Whole-document (`textRule`) `forbids` line-positioning is limited: the `DocRule`
> runtime contract passes only the typed `Doc` model (`validate.ts:100`), whose
> `SectionView` exposes list/table positions but not per-paragraph source lines, so
> prose hits are anchored just after the heading (fixture 23's expected line moved
> 3→2 for a blank-line gap the model can't see). A line-exact whole-document scope
> needs the `DocRule` to receive the projected tree, not just the model — worth a
> follow-up.
>
> — from [[T-TXAP-text-predicate-builders]] post-mortem

## Today

The cross-plane `DocRule` contract is `run(doc, ctx)` (`src/core/types.ts:223`): a
doc rule sees the typed `Doc` model and the finding factory, but **not** the
projected tree. `runDocRules` (`src/core/validate.ts:96`) already holds the
`tree: DocTree` in scope — it builds the model *from* that tree — yet passes only
`doc` at the call site (`validate.ts:100`). The model's `SectionView`
(`src/core/model.ts`) exposes list/table block positions but not per-paragraph
source lines, so a whole-document (`textRule`) `forbids` hit in prose can only be
anchored at the section heading, not at the offending line. (`textRule` itself is
still a no-finding stub — `src/core/text-constraints.ts:56` — its matcher lands in
[[T-TXAP-text-predicate-builders]], which is where this limitation surfaced:
fixture 23's expected line had to be coarsened 3→2 for a blank-line gap the model
can't see.)

## Proposed

Widen the `DocRule` contract so `run` also receives the projected tree (`DocTree`)
alongside the typed model. A whole-document text scope can then walk the projected
blocks — which carry source positions — and pin a finding to the exact offending
line instead of the post-heading position. The change is **additive**: a doc rule
that ignores the new argument compiles and behaves identically.

## Approach

1. Widen `DocRule.run` in `src/core/types.ts:223` from `run(doc, ctx)` to
   `run(doc, ctx, tree: DocTree)` — a third, additive argument so existing rules
   that don't read it keep compiling unchanged. *(Alternative considered: thread
   the tree through `Ctx`. Rejected — `Ctx` is shared with per-node `Rule.run`,
   which already gets a positioned `SectionNode` and doesn't need the whole tree.)*
2. Update the `docRule(id, fn)` factory (`src/core/grammar.ts:155`) so `fn`
   receives the tree and forwards it into the branded rule's `run`.
3. Pass the in-scope `tree` at the `runDocRules` call site
   (`src/core/validate.ts:100`): `r.run(doc, ctx, tree)`.
4. In `textRule` (`src/core/text-constraints.ts`), use the tree to position a
   whole-document `forbids` hit at the offending source line. (The match logic
   itself is T-TXAP/T-TXYL's; this task makes the line-exact `pos` reachable.)
5. Re-pin the affected fixture — `tests/fixtures/validation/23-text-forbids-body-root`
   (the body-root `forbids` case) — so its expected `pos.line` is the exact
   offending line rather than the coarsened post-heading line.

## Files to touch

| Location | Kind | Change |
| --- | --- | --- |
| `src/core/types.ts` | modify | widen `DocRule.run` to `run(doc, ctx, tree)` |
| `src/core/grammar.ts` | modify | `docRule(id, fn)` factory forwards the tree |
| `src/core/validate.ts` | modify | `runDocRules` passes the in-scope `tree` (≈ line 100) |
| `src/core/text-constraints.ts` | modify | `textRule` uses the tree for line-exact whole-doc `forbids` positions |
| `tests/fixtures/validation/23-text-forbids-body-root.*` | modify | re-pin expected `pos.line` to the exact offending line |

## Acceptance criteria

- [ ] AC-1: A whole-document (`textRule`) `forbids` hit in prose anchors at the
  **exact offending source line**, not the section heading or the coarsened
  post-heading line; fixture `23-text-forbids-body-root` asserts that line and
  `npm run test` is green.
- [ ] AC-2: `DocRule.run` receives the projected `DocTree`; the per-node
  `Rule.run(node, ctx)` signature is **unchanged** (this widening is scoped to
  doc rules only).
- [ ] AC-3: The new argument is additive — existing doc rules that ignore it
  compile and emit identical findings (no behavior change for rules that don't
  read the tree).

## Out of scope

- The text-match matcher itself (literal / regex / count) — that's
  [[T-TXAP-text-predicate-builders]] / [[T-TXYL-declarative-requires-forbids]].
- Section-scoped (`requires` / `forbids` on a node) positioning — per-node rules
  already receive a positioned `SectionNode`; this task is only the whole-document
  (`textRule`) scope.

## Dependencies

- Sequence after [[T-TXAP-text-predicate-builders]] — it lands the `textRule`
  matcher whose positions this refines; T-5LHY widens the contract that matcher
  emits through.

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-TXAP-text-predicate-builders]] in https://github.com/sksizer/markdown-contract.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1 (whole-document `forbids` anchors at the exact offending line): auto — `npm run test`. Fixture `tests/fixtures/validation/23-text-forbids-body-root` now asserts `line: 3` (the `}scripts/` prose line) and its unit twin `src/core/text-constraints.test.ts` asserts `f.pos?.line === 3`; the suite is green.
- AC-2 (`DocRule.run` receives the projected `DocTree`; per-node `Rule.run(node, ctx)` unchanged): auto — `npm run typecheck`. `DocRule.run(doc, ctx, tree)` compiles across the call site and the `docRule`/`textRule` factories; `Rule.run` in `types.ts` was left untouched.
- AC-3 (additive — doc rules that ignore the new arg compile and emit identical findings): auto — `npm run typecheck` + `npm run test`. The third arg is positional; no doc rule other than `textRule` was modified, and the `textRule requires` document-level-miss test still expects `pos` undefined, confirming no behavior change for rules that don't read the tree.

### What worked

- The widening was genuinely additive: the single `fn as DocRule["run"]` cast in `docRule` absorbed the arity change, so no caller that ignores the tree needed touching — typecheck stayed green with only `textRule` reading the new arg.
- Collapsing the model-based whole-document reconstruction onto the existing line-faithful `sectionScopeText(tree.root)` deleted ~85 lines of helper code (`isSectionView` / `collectSectionViews` / `placeSectionView`) while making positions exact — the line-accuracy win and a simplification landed together.

### Friction and automation gaps

- Step 3b's sandbox permission probe flagged `npm` / `node` / `Write` / `Edit` as missing by matching settings `allow:` globs, yet all four worked — false positives an autonomous run can't resolve via AskUserQuestion (no interactive user). Gap: the probe should test effective sandbox capability (or detect `acceptEdits` / `bypassPermissions` mode) rather than only string-matching settings allow-lists, so autonomous task-work isn't forced to judgement-call past generic node/npm findings. → already addressed upstream by sksizer/dev#495 + #423 (skipped — no new task).
- The peer unit test `src/core/text-constraints.test.ts` pinned the same whole-document `forbids` position and had to be re-pinned (`toBe(2)` → `toBe(3)`), but `## Files to touch` listed only the integration fixture. Gap: a behavior-changing AC should prompt the spec author (or ensure-ready) to enumerate the co-located peer-test twin alongside the fixture, since this repo's convention pins the same contract in both places. → [[T-KS7C-ensure-ready-enumerates-peer-test-twin]]
- Step 7's baseline lives in the main checkout's `.sdlc/quality-baselines/`, but `sdlc quality run` resolves `--baseline-dir`'s default relative to the worktree, so `--diff-against-baseline` errored `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly. Gap: when run from a worktree, the quality runner could resolve the baseline-dir against the git common-dir (main checkout) by default. → [[T-A1SR-quality-gate-resolves-superproject-baseline]]

### Spawned follow-up tasks

- [[T-KS7C-ensure-ready-enumerates-peer-test-twin]] (https://github.com/sksizer/dev/pull/516) — Upstream-plugin (`sdlc-meta`): a behavior-changing AC should enumerate the co-located peer-test twin in `## Files to touch`; spawned (new PR). Related to but distinct from sksizer/dev#512 (the gated-fixture variant of the same Files-to-touch under-enumeration theme).
- [[T-A1SR-quality-gate-resolves-superproject-baseline]] (https://github.com/sksizer/dev/pull/514) — Upstream-plugin (`sdlc-meta`): the quality runner should resolve `--baseline-dir` against the git common-dir when run from a worktree; linked to an existing open PR via spawn-task-pr idempotency (reuse, not a new PR).
- Step 3b permission-probe false positives — skipped (no new task): the proposed fix is already merged upstream by sksizer/dev#495 (probe honors runtime `acceptEdits`/`bypassPermissions`, or touch-tests, before flagging Write/Edit gaps) and #423 (probe keys the package-manager signal off project verbs, not blanket npm).
