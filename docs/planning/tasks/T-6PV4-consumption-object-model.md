---
type: task
schema_version: '5'
id: T-6PV4
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped the typed consumption object model — dual-key views, byAnchor, and Infer. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0002-typed-consumption]]'
- '[[D-0005-consumption-oom]]'
depends_on:
- '[[T-3NC8-validate-and-finding-assembly]]'
tags:
- consumption
- typed-model
- oom
need_human_review: true
impact: medium
complexity: large
autonomy: supervised
---
# Implement the typed object model — read()/validate().doc returning navigable, typed section and block views

## Goal

Implement the object model (`C-0002` / `D-0005`): a lazy facade over the projection that, for a valid document, exposes `Infer<Contract>` — sections by name, typed table rows, anchor lookups. The reward for validity: the same contract that checks a document also types it. It is additive and the validator never consults it, so it lands after the finding path is solid.

## Today

The model entry is a stub; the validator gates `doc` but returns nothing typed.

| Location | Role today |
|---|---|
| `src/core/model.ts` | OOM entry stub (from `T-4QM9`) |
| `src/core/validate.ts` | Gates `doc` presence on no-error (from `T-3NC8`); needs the model built on demand |
| `src/core/types.ts` | View declarations + the `Infer<Contract>` entry (placeholder from `T-7K2D`) |
| `tests/fixtures/` | Consumption fixtures (read door, dual-key, views, byAnchor), skipped |

## Proposed

`src/core/model.ts` implements `Doc { frontmatter, body, byAnchor }` and the views (`SectionView`, `TableView<Row>`, `ListView`, `CodeView`, `ParagraphView`, `BlockView`) as a lazy facade over the layer-1 projection — no second copy, positions preserved. Section access is dual-key (exact bracket + lowerCamelCase + `.section()`); `body.unknown` is always present; absent optional sections read as `undefined`; tables yield typed rows from the column/cell declarations; `byAnchor` returns a kind-discriminated `BlockView`. `read()` / `validate().doc` return it, and `Infer<Contract>` is finalised. The consumption fixtures green.

## Approach

1. Implement the lazy `SectionView` / `TableView` / `ListView` / `CodeView` / `ParagraphView` over projection nodes (built on demand, positions preserved).
2. Implement dual-key generation (Unicode-aware camelCase) + `.section()` + the `SectionGroup` shape shared by `doc.body` and nested `SectionView.sections`.
3. Implement `byAnchor` + `BlockView` narrowing and the always-present `body.unknown`.
4. Finalise `Infer<Contract>` so declared names/columns/cells become typed keys/rows/fields.
5. Wire `read()` / `validate().doc` to build and return the model.
6. Un-skip and green the consumption fixtures (`01`..`11`).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/model.ts` | modify | Implement the lazy facade + views + dual-key + `byAnchor` |
| `src/core/types.ts` | modify | Finalise `Infer<Contract>` (was a placeholder in `T-7K2D`) |
| `src/core/validate.ts` | modify | Build the model on demand for `doc` / `read()` |
| `tests/fixtures/` | modify | Un-skip the consumption fixtures |

## Acceptance criteria

- [x] AC-1: `read()` / `validate().doc` return a typed `Doc`; the validator never consults the model (findings still come from projection + Zod + grammar alone).
- [x] AC-2: Sections resolve via exact bracket, lowerCamelCase, and `.section()`; all three reach one `SectionView`.
- [x] AC-3: `TableView` yields typed rows (column / cell types), is iterable, and supports `column` / `find` / `rowPos`.
- [x] AC-4: `byAnchor` returns a `.kind`-discriminated `BlockView`; an undeclared anchor returns a dynamic `Record<string,string>` table.
- [x] AC-5: `body.unknown` is always present (`[]` when none); an absent optional section reads as `undefined`.
- [x] AC-6: The consumption fixtures (read door, dual-key, `SectionView` / `TableView`, `byAnchor`, nested sections, unknown sections) green.

## Out of scope

- Validation logic (done in `T-3NC8`) — this task is purely the read surface.
- The CLI / corpus runner (`T-J9TZ`).

## Dependencies

- Needs the assembled validate path from `[[T-3NC8-validate-and-finding-assembly]]` (the `doc` gate and `read()` / `ContractError`).
