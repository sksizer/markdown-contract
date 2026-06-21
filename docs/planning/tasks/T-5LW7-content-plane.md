---
type: task
schema_version: '5'
id: T-5LW7
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped the content plane — Zod leaves over each block''s data plus position-aware frontmatter validation. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0005-two-plane-contract-engine]]'
- '[[D-0004-content-plane]]'
- '[[D-0001-finding-model]]'
depends_on:
- '[[T-2HF6-projection-engine]]'
tags:
- content-plane
- zod
- leaves
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Implement the content plane — Zod leaves over projected blocks and the content/* findings

## Goal

Implement the leaf helpers (`C-0005` / `D-0004`): `table` / `list` / `code` / `maxWords`, each a structural kind-gate plus a content Zod schema over a projected node's data. This is the content half of the engine — it validates a present, correct-kind block's *data shape*, the job Zod does well, while leaving presence and kind to the structure plane. It runs in parallel with the structure plane over the same projection.

## Today

The leaf helpers and the content pass are stubs.

| Location | Role today |
|---|---|
| `src/core/leaves.ts` | Leaf-helper stubs (`table`/`list`/`code`/`maxWords`) |
| `src/core/validate.ts` | `validate` entry stub (assembled in `T-3NC8`) |
| `src/core/projection.ts` | Implemented `DocTree` (from `T-2HF6`) whose blocks this plane reads |
| `tests/fixtures/` | Content/leaf fixtures (C-family, typed cells, leaf bounds), skipped |

## Proposed

`src/core/leaves.ts` implements the leaf builders producing `LeafSpec` (a `BlockKind` gate + a content Zod schema), and the content pass validates a present, correct-kind block's data: table columns / `minRows` / typed `cells` with `extraColumns` `ignore`|`error`; list `everyItem` (`checkbox` | Zod) + `minItems`; code `lang`; paragraph `maxWords`. Findings are namespaced `content/<leaf>/<check>` and carry source lines remapped from the Zod issue path (via `rowPos` / `lineForPath`). The content/leaf fixtures are un-skipped and green.

## Approach

1. Implement the leaf builders → `LeafSpec` (kind + Zod), with raw `z.*` allowed inside a leaf for richer cell schemas.
2. Implement the content validator: after the structure kind-gate confirms the block's kind, run the leaf's Zod over the projected node's data.
3. Remap Zod `issues[].path` to source lines (table row → `rowPos`, frontmatter key → `lineForPath`), emitting `content/<leaf>/<check>` findings.
4. Un-skip and green the content/leaf fixtures.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/leaves.ts` | modify | Implement `table`/`list`/`code`/`maxWords` + the content pass |
| `src/core/validate.ts` | modify | Wire the content pass into the validate entry |
| `tests/fixtures/` | modify | Un-skip the content/leaf fixtures |

## Acceptance criteria

- [x] AC-1: `table` / `list` / `code` / `maxWords` produce a `LeafSpec` with a `BlockKind` gate and a content Zod schema.
- [x] AC-2: `table` validates columns, `minRows`, and typed `cells`; `extraColumns: "error"` emits `content/table/column-extra`, `"ignore"` does not.
- [x] AC-3: `list` validates `everyItem` (`checkbox` or Zod) and `minItems`; `code` validates `lang`; `maxWords` bounds a paragraph.
- [x] AC-4: A correct-kind block with bad data yields `content/<leaf>/<check>` findings; a wrong-kind block defers to the structure plane's `block-kind` (no double-report).
- [x] AC-5: Content findings carry source lines remapped from the Zod issue path (e.g. the offending table row).
- [x] AC-6: The content/leaf fixtures are un-skipped and green.

## Out of scope

- The section grammar / structure plane (`T-8RJ5`).
- The deterministic finding merge + ordering and `read()` / `ContractError` (`T-3NC8`).
- The typed consumption model and the CLI.

## Dependencies

- Needs the implemented projection from `[[T-2HF6-projection-engine]]`.
- Pairs with `[[T-8RJ5-structure-plane]]`; the cross-plane merge + ordering is finalised in `[[T-3NC8-validate-and-finding-assembly]]`.
