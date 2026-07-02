---
type: task
schema_version: '5'
id: T-SCRB
status: planning/proposed
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[D-0005-consumption-oom]]'
- '[[C-0002-typed-consumption]]'
depends_on:
- '[[T-SCTC-table-cell-transform-capture]]'
tags:
- structured-cells
- consumption
- typed-model
- oom
need_human_review: false
impact: high
complexity: large
autonomy: supervised
last_reviewed: '2026-06-30'
---
# Thread `z.output<cells>` to a typed `TableView` row read-back through `read()` and `Infer`

## Goal

Surface the cached transform output (from `T-SCTC`) as a **typed** row read-back: `TableView<Row>`'s `Row` becomes `z.output<cells>` for declared cells and `string` for undeclared columns, carried both at compile time (through the `table()` generics into `Infer`) and at runtime (`tableView` reading the cache). This is the per-column literal inference `Infer`'s docstring named as deferred future work; this task is that work. It flips the `cell-typed` gate.

## Today

| Location | Role today |
|---|---|
| `src/core/model.ts#tableView` | Builds each row as `Record<string, string>` straight off `node.rows`; ignores any cached typed output. |
| `src/core/types.ts#TableView` | `TableView<Row = Record<string, string>>` — string default; no path carries `z.output<cells>`. |
| `src/core/types.ts#Infer` | Docstring **defers** per-column literal `Row` inference (`B & SectionGroup` keeps it navigable meanwhile). |
| `src/core/leaves.ts#table` | `table()` is generic over its `cells` map after `T-SCFX`'s stub, but the literal types don't reach `read()`. |
| `tests/fixtures/consumption/` | Typed-row fixtures authored by `T-SCFX`, skipped under `cell-typed: false`. |

## Proposed

`tableView` reads `node.typed(row, col)` and uses it when present, falling back to the raw string otherwise (sparse: undeclared and no-transform cells stay raw strings). The combinator carries literal types: `table<C extends Record<string, ZodType>>(...)` derives `Row = { [K in Cols]: K extends keyof C ? z.output<C[K]> : string }`, threaded through `section()` → `sections()` → `Infer` so `read()` returns a `Doc` whose `body.<table>` is a `TableView` of the typed `Row`. The `TableView` **default** type parameter stays `Record<string, string>`, so a `byAnchor` table or an undeclared table is still string-typed. Un-skip the typed-row fixtures by flipping `cell-typed`.

## Approach

1. In `src/core/model.ts#tableView`, build each row by reading `node.typed(r, col)` when defined and falling back to `cells[c] ?? ""` otherwise; the row map becomes `Record<string, unknown>` internally, typed as `Row` at the boundary.
2. In `src/core/leaves.ts`, finalize `table<C extends Record<string, ZodType>>` so the `cells` map's literal types are captured, and define the `RowOf<Cols, C>` mapped type (declared cells → `z.output<C[K]>`, undeclared → `string`).
3. Thread the typed `Row` through `section()` → `sections()` so a declared table's view type reaches the contract's `body` shape; keep the dual-key `SectionGroup` index able to host the typed `TableView` key without widening to `unknown`.
4. Finalize the per-column inference in `src/core/types.ts#Infer` (replacing the deferred-future-work note) so `Infer<Contract>` yields the typed `Row`; keep `TableView<Row = Record<string, string>>`'s default.
5. Flip `cell-typed` to `true` in `tests/components.ts` and un-skip the typed-row fixtures; assert both the runtime value (`row.Location.path`) and the static type (a type-level expectation, per the repo's typing-test convention).
6. Add peer unit tests in `src/core/model.test.ts`: typed declared cell, raw undeclared column, string default for an undeclared/`byAnchor` table.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/model.ts` | modify | `tableView` reads `node.typed(...)` with raw-string fallback; rows typed as `Row` |
| `src/core/leaves.ts` | modify | Finalize `table<C>` literal-type capture + the `RowOf<Cols, C>` mapped type |
| `src/core/types.ts` | modify | Finalize `Infer` per-column inference; `TableView<Row>` carries the typed `Row`, default unchanged |
| `src/core/model.test.ts` | modify | Peer tests for typed declared cells, raw undeclared columns, string default |
| `tests/components.ts` | modify | Flip `cell-typed` to `true` |
| `tests/fixtures/consumption/` | modify | Un-skip the typed-row fixtures gated by `cell-typed` |

## Acceptance criteria

- [ ] AC-1: For a contract with a transforming `Location` cell, `read(src).body.<table>` rows expose the parsed object at runtime (`row.Location.path`), sourced from the cache, with no re-run of the transform.
- [ ] AC-2: The row type is `z.output<cells>` for declared cells and `string` for undeclared columns — verified by a type-level test, not only a runtime assertion.
- [ ] AC-3: `TableView`'s default type parameter is still `Record<string, string>`; an undeclared or `byAnchor` table reads back string rows.
- [ ] AC-4: `cell-typed` is `true` and the typed-row fixtures run and pass; no previously-passing fixture changes.
- [ ] AC-5: The typed value flows only through the model (`read` / `validate().doc`); `tree` rows remain raw strings.
- [ ] AC-6: `npm run build`, `npm run test`, and `npm run typecheck` pass.

## Out of scope

- Capturing the transform output (done in `T-SCTC`).
- List-item read-back (`T-SCLI`) and position preservation (`T-SCPP`).

## Dependencies

- [[T-SCTC-table-cell-transform-capture]] — provides the cached `typed(row, col)` overlay this read-back reads.
