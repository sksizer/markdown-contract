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

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
