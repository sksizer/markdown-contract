---
type: task
schema_version: '5'
id: T-8RJ5
status: open/ready
created: '2026-06-20'
related:
- '[[C-0005-two-plane-contract-engine]]'
- '[[D-0003-structure-plane]]'
- '[[D-0001-finding-model]]'
depends_on:
- '[[T-2HF6-projection-engine]]'
tags:
- structure-plane
- grammar
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Implement the structure plane — the tree-grammar combinators and the structure/* findings

## Goal

Implement the section/block tree grammar (`C-0005` / `D-0003`): the one thing Zod cannot
express — the sequence and nesting of sections, and the presence and kind of blocks. The
combinators (`sections`/`section`/`optional`/`oneOf`/`gap`) build the grammar; the matcher
walks a `DocTree` and emits `structure/*` findings. This is the first of the two planes and
defines the structural half of the engine.

## Today

The combinators and the structure pass are stubs.

| Location | Role today |
|---|---|
| `src/core/grammar.ts` | Combinator stubs (`sections`/`section`/`optional`/`oneOf`/`gap`/`rule`/`docRule`) |
| `src/core/validate.ts` | `validate` entry stub (assembled in `T-3NC8`) |
| `src/core/projection.ts` | Implemented `DocTree` (from `T-2HF6`) this plane reads |
| `tests/fixtures/` | Structure fixtures (B-family, kind-gate, anchors, collisions), skipped |

## Proposed

`src/core/grammar.ts` implements the combinators and the structure-matching pass: order
semantics (`none` / `recognized-relative` / `strict`) crossed with `allowUnknown` and `gap()`
windows (`min` / `max`), `oneOf` alias sets, `optional`, nested `children`, the block kind-gate
(`structure/block-missing`, `structure/block-kind`), anchor presence
(`structure/anchor-missing`), and the dual-key guards (`structure/duplicate-section`,
`structure/key-collision`, plus the build-time `contract/key-collision` throw). The
structure-family fixtures are un-skipped and green.

## Approach

1. Implement the combinator builders to produce the grammar IR (a level = `LevelOpts` + an
   ordered `Spec[]`, recursing through `children`).
2. Implement the level matcher: walk the projection's sections, apply order + `allowUnknown` +
   `gap()` admission, resolve `oneOf` / `optional`.
3. Implement the structural kind-gate and anchor checks, emitting `Finding`s through the
   finding model (`Ctx`).
4. Implement duplicate-section / key-collision (Unicode-aware camelCase) and the build-time
   `contract/key-collision` throw.
5. Un-skip and green the structure-family fixtures.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/grammar.ts` | modify | Implement the combinators + the structure matcher |
| `src/core/validate.ts` | modify | Wire the structure pass into the validate entry |
| `tests/fixtures/` | modify | Un-skip the structure-family fixtures |

## Acceptance criteria

- [ ] AC-1: The combinators (`sections`/`section`/`optional`/`oneOf`/`gap`) build a grammar an
  author can declare and the matcher consumes.
- [ ] AC-2: `order` ∈ {`none`, `recognized-relative`, `strict`} and `allowUnknown` behave per
  the `D-0003` table; a strict prefix coexists with an open tail via `gap()`.
- [ ] AC-3: `gap({ min, max })` bounds the unknown-section window.
- [ ] AC-4: The kind-gate emits `structure/block-missing` and `structure/block-kind`; declared
  anchors emit `structure/anchor-missing` when unresolved.
- [ ] AC-5: Duplicate headings → `structure/duplicate-section`; camelCase collisions →
  `structure/key-collision` (document) and `contract/key-collision` (build-time throw).
- [ ] AC-6: The structure-family fixtures (section sequence, aliases, gaps, nesting, anchors,
  collisions) are un-skipped and green.

## Out of scope

- Content / leaf Zod validation (`T-5LW7`).
- The deterministic finding merge + ordering and `read()` / `ContractError` (`T-3NC8`).
- The typed consumption model and the CLI.

## Dependencies

- Needs the implemented projection from `[[T-2HF6-projection-engine]]`.
- Uses the `Finding` shape from `[[T-7K2D-common-types]]`; the cross-plane merge + ordering is
  finalised in `[[T-3NC8-validate-and-finding-assembly]]`.
