---
type: task
schema_version: '5'
id: T-TXAP
status: open/ready
created: '2026-06-28'
related:
- '[[M-0003-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[C-0005-two-plane-contract-engine]]'
depends_on:
- '[[T-TXMC-text-match-core]]'
tags:
- text-match
- combinators
- core-api
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
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
| `src/core/text-constraints.ts` | new | `requires` / `forbids` / `textRule` builders over the matcher |
| `src/core/text-constraints.test.ts` | new | Peer unit test — happy-path pass/fail first, then purity + counts |
| `src/core/index.ts` | modify | Re-export the builders from the core barrel |
| `src/index.ts` | modify | Re-export `requires` / `forbids` / `textRule` from the public barrel |

## Acceptance criteria

- [ ] AC-1: `requires([{pattern:"X"}])` attached to a section produces a `Rule` that emits a `text/requires` finding (at the heading) when the section's subtree text lacks `X`, and none when present.
- [ ] AC-2: `forbids([{pattern:"Y"}])` emits a `text/forbids` finding at the offending line when `Y` appears in scope; `textRule(...)` applies the same over the whole document as a `DocRule`.
- [ ] AC-3: `min` / `max` counts and `regex` / `normalize` / `ignoreCase` behave identically to the matcher's unit contract; `note` and `level` flow onto the finding.
- [ ] AC-4: Each emitted finding carries a stable, per-entry id (synthesized from scope + pattern, overridable via the spec's `id`), so two requirements on one section are distinct findings.
- [ ] AC-5: A `requires` spec with `max: 0` (or `max < min`) is rejected at build time with a clear error; `forbids` is the absence form.
- [ ] AC-6: The builders are exported from `src/index.ts`; `src/core/text-constraints.test.ts` is green and reads as documentation.

## Out of scope

- YAML recognition and the closed match-spec vocabulary validation — [[T-TXYL-declarative-requires-forbids]].
- Cross-entry duplicate / contradiction rejection — that is a declarative compile-time check ([[T-TXYL-declarative-requires-forbids]]); the builder only enforces single-spec purity (`max >= min`).
- The fixture-corpus parity proof and dogfood contract — [[T-TXFX-text-constraint-fixtures]].

## Dependencies

- Hard: needs the matcher, finding area, and id synthesis from `[[T-TXMC-text-match-core]]`.
