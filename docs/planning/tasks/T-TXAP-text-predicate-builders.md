---
type: task
schema_version: '5'
id: T-TXAP
status: closed/done
created: '2026-06-28'
related:
- '[[M-0004-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[C-0005-two-plane-contract-engine]]'
depends_on:
- '[[T-TXMC-text-match-core]]'
- '[[T-TXSC-text-constraint-fixture-scaffold]]'
tags:
- text-match
- combinators
- core-api
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
last_reviewed: '2026-06-30'
prs:
- https://github.com/sksizer/markdown-contract/pull/71
completion_note: 'Shipped via #71.'
---
# TS-API predicate builders — `requires` / `forbids` / `textRule`

## Goal

Give combinator authors a first-class way to attach required / forbidden phrase checks — `requires([...])` / `forbids([...])` on a section, `textRule(...)` for the document — that compiles to the engine's `rule` / `docRule` over the text-match core. This is both the hand-authored surface and the compile target the declarative front-end ([[T-TXYL-declarative-requires-forbids]]) emits to, so the two surfaces share one implementation and one set of findings.

## Today

`rule` / `docRule` exist but a phrase check must be hand-written each time (fixture 17). There is no library predicate for "this scope must / must not contain X".

| Location | Role today |
|---|---|
| `src/core/grammar.ts#rule` | `rule(id, fn)` — node-local named rule (and `docRule(id, fn)`) |
| `src/core/text-match.ts` | The matcher + finding-builder + id synthesis (from [[T-TXMC-text-match-core]]) |
| `src/core/types.ts` | `Rule`, `DocRule`, `Ctx`, `SectionNode`, `Doc` |
| `src/index.ts` | Public barrel that already re-exports `rule` / `docRule` |
| `tests/fixtures/validation/17-node-level-custom-rule.ts` | The hand-written equivalent these builders replace |

## Proposed

`src/core/text-constraints.ts` exports `requires(specs)` / `forbids(specs)` returning a node-local `Rule` bound to a section's subtree text, and `textRule({ requires?, forbids? })` returning a `DocRule` bound to the whole document — both running the [[T-TXMC-text-match-core]] matcher and minting `text/*` findings through `ctx.finding(...)`. Each builder resolves the scope's text, derives the `scopeKey` for id synthesis (the section's generated OOM key, or `doc`), and enforces `requires` / `forbids` purity: a `requires` spec with `max < min` (including `max: 0`) is a constructor-time error. The builders are exported from the core and root barrels.

## Approach

1. Add `src/core/text-constraints.ts`: `requires(specs)` / `forbids(specs)` → `Rule` (section subtree text); `textRule({requires, forbids})` → `DocRule` (document text). Each maps every spec through the [[T-TXMC-text-match-core]] matcher + finding-builder.
2. Compute the scope text from the bound node / doc (subtree concatenation for a section, whole body for the doc) and pass the `scopeKey` into id synthesis.
3. Enforce purity: reject a `requires` spec whose bound expresses absence (`max: 0` or `max < min`) at build time, with a clear error.
4. Export from `src/core/index.ts` and `src/index.ts`.
5. Peer unit test `src/core/text-constraints.test.ts`: lead with a "section requires phrase" pass/fail and a "document forbids phrase" pass/fail (mirroring fixture 17), then the purity rejection and count cases.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/text-constraints.ts` | modify | Replace the T-TXSC stub with the real `requires` / `forbids` / `textRule` builders over the matcher |
| `src/core/text-constraints.test.ts` | new | Peer unit test — happy-path pass/fail first, then purity + counts |
| `tests/components.ts` | modify | Flip `IMPLEMENTED["text-api"]` → `true` (greens the gated TS fixtures) |

## Acceptance criteria

- [ ] AC-1: `requires([{pattern:"X"}])` attached to a section produces a `Rule` that emits a `text/requires` finding (at the heading) when the section's subtree text lacks `X`, and none when present.
- [ ] AC-2: `forbids([{pattern:"Y"}])` emits a `text/forbids` finding at the offending line when `Y` appears in scope; `textRule(...)` applies the same over the whole document as a `DocRule`.
- [ ] AC-3: `min` / `max` counts and `regex` / `normalize` / `ignoreCase` behave identically to the matcher's unit contract; `note` and `level` flow onto the finding.
- [ ] AC-4: Each emitted finding carries a stable, per-entry id (synthesized from scope + pattern, overridable via the spec's `id`), so two requirements on one section are distinct findings.
- [ ] AC-5: A `requires` spec with `max: 0` (or `max < min`) is rejected at build time with a clear error; `forbids` is the absence form.
- [ ] AC-6: The builders are exported from `src/index.ts` (replacing the T-TXSC stub); `src/core/text-constraints.test.ts` is green and reads as documentation.
- [ ] AC-7: `IMPLEMENTED["text-api"]` is flipped to `true` and the gated TS fixtures from [[T-TXSC-text-constraint-fixture-scaffold]] (section `requires`, body-root `forbids`, `count`, `regex`) now run and are green.

## Out of scope

- YAML recognition and the closed match-spec vocabulary validation — [[T-TXYL-declarative-requires-forbids]].
- Cross-entry duplicate / contradiction rejection — that is a declarative compile-time check ([[T-TXYL-declarative-requires-forbids]]); the builder only enforces single-spec purity (`max >= min`).
- Authoring the gated fixtures (done up front in [[T-TXSC-text-constraint-fixture-scaffold]]); the `.contract.yaml` parity peers ([[T-TXYL-declarative-requires-forbids]]); the live dogfood and final census ([[T-TXFX-text-constraint-fixtures]]).

## Dependencies

- Hard: needs the matcher, finding area, and id synthesis from `[[T-TXMC-text-match-core]]`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-28. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — fixture 22 (`section requires`, pass/fail) + peer test "requires — a section must CONTAIN a phrase".
- AC-2: auto — peer test "forbids … reported at the source line" + fixture 23 (`textRule` body-root forbids) + peer "textRule — a document must NOT contain a phrase".
- AC-3: auto — fixture 24 (count) + fixture 25 (regex) + peer tests "count bounds", "regex / normalize / ignoreCase", "note and level flow onto the finding".
- AC-4: auto — peer "per-entry id (AC-4)" (two distinct requirements → two distinct findings; explicit-id override) + every gated fixture asserts a synthesized `text/<kind>/<scopeKey>/<hash>` id.
- AC-5: auto — peer "requires purity (AC-5)": `requires([{max:0}])` / `max<min` and the `textRule` requires arm throw `ContractBuildError` at construction; `forbids` is the absence form and does not throw.
- AC-6: auto — `requires` / `forbids` / `textRule` exported from `src/core/index.ts` and `src/index.ts`; 19-test peer suite green and reads documentation-first.
- AC-7: auto — `IMPLEMENTED["text-api"]` flipped to `true`; the 4 gated TS fixtures now run (validation suite reports 0 skipped) and are green.

### What worked

- The matcher core (`src/core/text-match.ts`, from T-TXMC) was complete and exhaustively unit-tested, so the builders were a thin scope-resolution + finding-plumbing layer — `matchText` + `buildTextFindings` + `synthesizeTextId` did the heavy lifting.
- The pre-authored gated fixtures (T-TXSC) plus the harness's exact-id finding match made greening deterministic: flip the flag, run the suite, tighten expected ids/lines to the real output.
- Baseline-gated quality (`--diff-against-baseline`) cleanly separated this branch's effect from pre-existing drift — `OK 2/2`, zero new drift.

### Friction and automation gaps

- The task's `## Files to touch` table omitted the four gated fixture files (`tests/fixtures/validation/text/22..25-*.ts`), yet AC-7 cannot pass without updating their expected finding ids (the harness asserts `id` exactly and the builders emit synthesized per-entry ids) — the implementer had to discover this from the fixtures' own comments. When a task flips an `IMPLEMENTED[...]` flag that activates gated fixtures asserting illustrative/placeholder ids, the readiness gate or the spec template should require those fixtures be enumerated as `modify` rows. → [[T-KY0Y-enumerate-activated-gated-fixtures]]
- Whole-document (`textRule`) `forbids` line-positioning is limited: the `DocRule` runtime contract passes only the typed `Doc` model (`validate.ts:100`), whose `SectionView` exposes list/table positions but not per-paragraph source lines, so prose hits are anchored just after the heading (fixture 23's expected line moved 3→2 for a blank-line gap the model can't see). A line-exact whole-document scope needs the `DocRule` to receive the projected tree, not just the model — worth a follow-up. → [[T-5LHY-docrule-receives-projected-tree]]
- A pre-existing divergent duplicate of `TextMatchSpec` (declared in both `text-match.ts` and the `text-constraints.ts` stub) was breaking `npm run build` and the `cli/index.test.ts` suite on `origin/main`; it surfaced only mid-implementation and was fixed here by single-sourcing the type. The baseline-capture step recorded the failing suite but it was not flagged prominently at pickup — surfacing "baseline contains a failing suite" loudly at Step 3a would shorten the discovery loop. → [[T-LDH4-surface-failing-baseline-at-pickup]]

### Spawned follow-up tasks

- [[T-KY0Y-enumerate-activated-gated-fixtures]] (PR pending — parent to push `meta-task/enumerate-activated-gated-fixtures` on sksizer/dev) — spawned (Upstream-plugin `sdlc-meta`): readiness gate / spec template should require fixtures activated by an `IMPLEMENTED[...]` flag-flip be enumerated as `modify` rows.
- [[T-5LHY-docrule-receives-projected-tree]] (PR pending — parent to push `meta-task/docrule-receives-projected-tree` on sksizer/markdown-contract) — spawned (Local): give `DocRule` the projected tree (not just the model) so whole-document `textRule` scopes emit line-exact findings.
- [[T-LDH4-surface-failing-baseline-at-pickup]] (PR pending — parent to push `meta-task/surface-failing-baseline-at-pickup` on sksizer/dev) — spawned (Upstream-plugin `sdlc-meta`): task-work Step 3a should loudly surface a pre-existing failing baseline suite at pickup.
