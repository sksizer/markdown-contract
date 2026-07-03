---
type: task
schema_version: "5"
id: T-SCRB
status: in-progress
created: 2026-06-30
related:
  - "[[M-0011-structured-cells]]"
  - "[[D-0015-structured-cells]]"
  - "[[D-0005-consumption-oom]]"
  - "[[C-0002-typed-consumption]]"
depends_on:
  - "[[T-SCTC-table-cell-transform-capture]]"
tags:
  - structured-cells
  - consumption
  - typed-model
  - oom
need_human_review: false
impact: high
complexity: large
autonomy: supervised
last_reviewed: 2026-07-03
readiness_verified_at: 2026-07-03T03:22:32Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/192
---
# Thread `z.output<cells>` to a typed `TableView` row read-back through `read()` and `Infer`

## Goal

Surface the cached transform output (from `T-SCTC`) as a **typed** row read-back: `TableView<Row>`'s `Row` becomes `z.output<cells>` for declared cells and `string` for undeclared columns, carried both at compile time (through the `table()` generics into `Infer`) and at runtime (`tableView` reading the cache). This is the per-column literal inference `Infer`'s docstring named as deferred future work; this task is that work. It flips the `cell-typed` gate.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/core/model.ts#tableView` | Builds each row as `Record<string, string>` straight off `node.rows`; ignores any cached typed output. |
| `packages/core/src/core/types.ts#TableView` | `TableView<Row = Record<string, string>>` — string default; no path carries `z.output<cells>`. |
| `packages/core/src/core/types.ts#Infer` | Docstring **defers** per-column literal `Row` inference (`B & SectionGroup` keeps it navigable meanwhile). |
| `packages/core/src/core/leaves.ts#table` | `table()` is generic over its `cells` map after `T-SCFX`'s stub, but the literal types don't reach `read()`. |
| `packages/core/tests/fixtures/consumption/` | Typed-row fixtures authored by `T-SCFX`, skipped under `cell-typed: false`. |

## Proposed

`tableView` reads `node.typed(row, col)` and uses it when present, falling back to the raw string otherwise (sparse: undeclared and no-transform cells stay raw strings). The combinator carries literal types: `table<C extends Record<string, ZodType>>(...)` derives `Row = { [K in Cols]: K extends keyof C ? z.output<C[K]> : string }`, threaded through `section()` → `sections()` → `Infer` so `read()` returns a `Doc` whose `body.<table>` is a `TableView` of the typed `Row`. The `TableView` **default** type parameter stays `Record<string, string>`, so a `byAnchor` table or an undeclared table is still string-typed. Un-skip the typed-row fixtures by flipping `cell-typed`.

Consuming typed rows off the public model — a declared transform cell yields parsed objects, an undeclared column stays a raw string:

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

// A cell transform: parse `path` or `path#symbol` into a structured object.
const LOCATION_RE = /^`([^#`]+)(?:#([^`]+))?`$/;
const Location = z.string().transform((s, ctx) => {
  const m = LOCATION_RE.exec(s.trim());
  if (!m) { ctx.addIssue({ code: "custom", message: "expected `path` or `path#symbol`" }); return z.NEVER; }
  return { path: m[1]!, ...(m[2] ? { symbol: m[2] } : {}) };
});

const spec = contract({
  body: sections({}, [
    section("Files to touch", {
      content: table({
        columns: ["Location", "Kind", "Change"], // declared columns
        cells: {
          Location,                               // transform → { path; symbol? }
          Kind: z.enum(["new", "modify", "delete"]), // transform → literal union
          // Change is undeclared → stays a raw string
        },
      }),
    }),
  ]),
});

const doc = spec.read(source, { path: "T-SCRB.md" }); // read() is a contract method; throws ContractError on invalid input

// doc.body.filesToTouch is the auto lowerCamelCase alias of "Files to touch"
// (dual-key SectionGroup, D-0005 §6); ["Files to touch"] / .section(...) reach the same view.
for (const r of doc.body.filesToTouch) {
  r.Location.path;   // string        — from the Location transform
  r.Location.symbol; // string | undefined — optional field of the parsed object
  r.Kind;            // "new" | "modify" | "delete" — enum-typed
  r.Change;          // string        — undeclared column, raw string
}
// Inferred Row:
//   { Location: { path: string; symbol?: string };
//     Kind: "new" | "modify" | "delete";
//     Change: string }
```

VARIANT — a table with no `cells` transforms keeps the `Record<string, string>` default, demonstrating the opt-in/additive guarantee:

```ts
const plain = contract({
  body: sections({}, [
    section("Files to touch", {
      content: table({ columns: ["Location", "Kind", "Change"] }), // no cells → nothing declared
    }),
  ]),
});

const plainDoc = plain.read(source, { path: "T-SCRB.md" });
for (const r of plainDoc.body.filesToTouch) {
  r.Location; // string — no transform, so the value is the raw cell text
  r.Kind;     // string — every column is a raw string
  r.Change;   // string
}
// Inferred Row falls back to the default: Record<string, string>
```

## Approach

1. In `packages/core/src/core/model.ts#tableView`, build each row by reading `node.typed(r, col)` when defined and falling back to `cells[c] ?? ""` otherwise; the row map becomes `Record<string, unknown>` internally, typed as `Row` at the boundary.
2. In `packages/core/src/core/leaves.ts`, finalize `table<C extends Record<string, ZodType>>` so the `cells` map's literal types are captured, and define the `RowOf<Cols, C>` mapped type (declared cells → `z.output<C[K]>`, undeclared → `string`).
3. Thread the typed `Row` through `section()` → `sections()` so a declared table's view type reaches the contract's `body` shape; keep the dual-key `SectionGroup` index able to host the typed `TableView` key without widening to `unknown`.
4. Finalize the per-column inference in `packages/core/src/core/types.ts#Infer` (replacing the deferred-future-work note) so `Infer<Contract>` yields the typed `Row`; keep `TableView<Row = Record<string, string>>`'s default.
5. Flip `cell-typed` to `true` in `packages/core/tests/components.ts` and un-skip the typed-row fixtures; assert both the runtime value (`row.Location.path`) and the static type (a type-level expectation, per the repo's typing-test convention).
6. Add peer unit tests in `packages/core/src/core/model.test.ts`: typed declared cell, raw undeclared column, string default for an undeclared/`byAnchor` table.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/core/model.ts` | modify | `tableView` reads `node.typed(...)` with raw-string fallback; rows typed as `Row` |
| `packages/core/src/core/leaves.ts` | modify | Finalize `table<C>` literal-type capture + the `RowOf<Cols, C>` mapped type |
| `packages/core/src/core/types.ts` | modify | Finalize `Infer` per-column inference; `TableView<Row>` carries the typed `Row`, default unchanged |
| `packages/core/src/core/model.test.ts` | modify | Peer tests for typed declared cells, raw undeclared columns, string default |
| `packages/core/tests/components.ts` | modify | Flip `cell-typed` to `true` |
| `packages/core/tests/fixtures/consumption/` | modify | Un-skip the typed-row fixtures gated by `cell-typed` |

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

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-03. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
