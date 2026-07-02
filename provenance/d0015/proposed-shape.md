# Proposed shape — structured cells

> Companion to [README.md](README.md) (decision **D-0015**). **Non-normative**: this sketches the
> concrete API for the recommended option (A1 + B1 + C1) so the follow-on tasks can be scoped. Where
> this disagrees with README.md, README.md wins; where either disagrees with a *shipped* D-0014
> surface (`src/core/types.ts`, `content.ts`, `model.ts`, `projection.ts`), the shipped code wins and
> this is the migration target. Implementation is **out of scope** for this PR.

## 1. What exists today (the baseline this extends)

The three load-bearing facts, with the files that establish them:

```ts
// src/core/types.ts — the table node carries RAW strings + line positions only
type BlockNode =
  | { kind: "table"; columns: string[]; rows: string[][]; rowPos(i: number): SourcePos;
      anchor?: string; pos: SourcePos }
  | …;

// src/core/types.ts — TableView defaults to raw-string rows
interface TableView<Row = Record<string, string>> extends Iterable<Row> { rows: Row[]; … }

// src/core/content.ts — validateTable: the transform output is DISCARDED
const res = zod.safeParse(value);
if (!res.success) out.push(ctx.finding({ id: "content/table/cell", … }));
//  ↑ branches on success; res.data is never read

// src/core/model.ts — tableView: rows are built straight off raw strings
const rows: Record<string, string>[] = node.rows.map((cells) => { … row[col] = cells[i] ?? ""; … });

// src/core/projection.ts — flattenInline: an inlineCode span collapses to its value (span lost)
case "inlineCode": out += n.value; break;
```

Structured cells changes three of these **additively**: keep `res.data`, carry it to `Row`, and
record the spans `flattenInline` currently drops. The raw `rows`, the default `TableView` type, and
the finding shape are untouched.

## 2. Axis A + B — transform output at validate-time, cached on the node

`validateTable` already runs `safeParse` per cell. The minimal change keeps the output:

```ts
// src/core/content.ts — validateTable, after the change (sketch)
if (cfg.cells) {
  for (const [col, schema] of Object.entries(cfg.cells)) {
    const colIdx = node.columns.indexOf(col);
    if (colIdx === -1) continue;
    const zod = asZod(schema);
    node.rows.forEach((row, i) => {
      const res = zod.safeParse(row[colIdx] ?? "");
      if (!res.success) {
        out.push(ctx.finding({ id: "content/table/cell", message: …, pos: node.rowPos(i) }));
      } else {
        node.setTyped?.(i, col, res.data);   // ← NEW: cache parsed output on the projection node
      }
    });
  }
}
```

The table `BlockNode` gains an additive, sparse typed overlay — raw `rows` retained:

```ts
// src/core/types.ts — table arm of BlockNode (proposed additions marked ← NEW)
| {
    kind: "table";
    columns: string[];
    rows: string[][];                 // unchanged — raw strings, always present
    rowPos(i: number): SourcePos;     // unchanged — row line
    cellPos(row: number, col: number): SourcePos;       // ← NEW (axis C): per-cell line + col
    typed(row: number, col: string): unknown | undefined; // ← NEW (axis B): cached transform output
    inlineSpans(row: number, col: number): InlineSpan[];  // ← NEW (axis C): inline-code byte ranges
    anchor?: string;
    pos: SourcePos;
  }
```

`typed(row, col)` returns `undefined` for any cell with no transform (the common case), so the
overlay is sparse and a plain-string table allocates nothing extra. `InlineSpan` records the byte /
column range of one inline-code run within a cell's flattened text:

```ts
interface InlineSpan { start: SourcePos; end: SourcePos; raw: string }  // raw = the backticked text
```

Timing (axis A1): the cache is populated during the **existing** content-plane pass, before the model
is built. `read()` / `validate().doc` read `node.typed(...)`; they never re-run Zod.

## 3. Axis B — typed `Row = z.output<cells>` flows to `read()`

The combinator carries literal types through its generics — the per-column inference `Infer`'s
docstring (`src/core/types.ts`) names as deferred. `table()` becomes generic over its `cells` map:

```ts
// src/core/leaves.ts — table() gains a type parameter over the cells map (sketch)
export function table<C extends Record<string, ZodType>>(s: {
  columns: string[];
  cells?: C;
  anchor?: string; minRows?: number; extraColumns?: "ignore" | "error";
}): TableLeafSpec<C> { … }

// Row = declared cells take z.output<…>, undeclared columns are string
type RowOf<Cols extends string, C extends Record<string, ZodType>> =
  { [K in Cols]: K extends keyof C ? z.output<C[K]> : string };
```

`tableView` (`src/core/model.ts`) reads the cache instead of always taking the raw string:

```ts
// src/core/model.ts — tableView, after the change (sketch)
const rows = node.rows.map((cells, r) => {
  const row: Record<string, unknown> = {};
  node.columns.forEach((col, c) => {
    const t = node.typed(r, col);          // ← cached transform output, if any
    row[col] = t !== undefined ? t : (cells[c] ?? "");
  });
  return row;
});
```

`TableView`'s default type parameter **stays** `Record<string, string>`, so a `byAnchor` table or an
undeclared table is still string-typed; only a contract-declared table with `cells` carries
`z.output`.

## 4. Worked example — use case 1: typed "Files to touch"

The `Location` cell transforms its backticked path-and-symbol grammar; `Kind` is the existing enum.

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

const LOCATION_RE = /^`([^#`]+)(?:#([^`]+))?`$/;          // `path` or `path#symbol`, backticked

const Location = z.string().transform((s, ctx) => {
  const m = LOCATION_RE.exec(s.trim());
  if (!m) { ctx.addIssue({ code: "custom", message: "not a `path` or `path#symbol`" }); return z.NEVER; }
  return { path: m[1]!, ...(m[2] ? { symbol: m[2] } : {}) };  // → { path: string; symbol?: string }
});

export const TaskContract = contract({
  body: sections({}, [
    section("Files to touch", {
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: {
          Location,                                        // transforms → { path; symbol? }
          Kind: z.enum(["new", "modify", "delete"]),       // D-0014 G1 — closed vocabulary
        },
      }),
    }),
  ]),
});
```

Read-back — the consumer gets typed rows, no re-parse:

```ts
const doc = TaskContract.read(source, { path });
for (const r of doc.body.filesToTouch) {
  r.Location.path;     // string         — parsed by the contract, not the consumer
  r.Location.symbol;   // string | undefined
  r.Kind;              // "new" | "modify" | "delete"
  r.Change;            // string         — undeclared cell stays raw
}
// Row = { Location: { path: string; symbol?: string }; Kind: "new"|"modify"|"delete"; Change: string }
```

A malformed `Location` (e.g. a bare unbackticked path) fails the transform's `addIssue` and surfaces
as the **existing** `content/table/cell` finding at the offending row's line (the A3 remap is
unchanged); `read()` throws `ContractError`, `validate()` reports it as data. The duplicate
`parseLocation()` in `parse-touchpoints` / `resolve-touchpoints` (use case 3) deletes — both consume
`doc.body.filesToTouch` directly.

## 5. Worked example — use case 2: `scan-placeholders` masking via preserved spans

Today `scan-placeholders` re-scans raw bytes because the projection dropped inline-code spans. With
axis C, a cell (or paragraph) carries its inline-code spans, so masking reads off the tree:

```ts
const doc = TaskContract.validate(source, { path }).tree;   // or the model's section views
const cell = table.cellPos(row, col);                       // { line, col } — full precision

// detect <...> placeholders OUTSIDE inline-code spans:
for (const span of table.inlineSpans(row, col)) {
  // span = { start: {line,col}, end: {line,col}, raw: "`<T>`" } — mask this range, do not flag it
}
// a `<...>` whose offset is NOT covered by any inlineSpans range is an unfilled placeholder → finding
```

The check stops re-implementing fence / inline-code awareness; the projection computed the spans once
(in `flattenInline`'s replacement) and `scan-placeholders` consumes them. Position precision is real:
`cellPos` sets `col` (D-0014 C3 deferred `col`, non-breaking), and each `InlineSpan` carries the raw
backticked text for snippet diagnostics.

## 6. Compatibility checklist (what does NOT change)

- `BlockNode` table `rows: string[][]` — retained; every string-cell consumer and `text()` unchanged.
- `TableView<Row = Record<string, string>>` default — unchanged; `byAnchor` / undeclared tables stay
  string-typed.
- `validate()` finding shape, the `content/table/cell` id, and the A3 line remap — unchanged; a
  failed transform is a cell finding exactly as a `.refine()` is today.
- `tree` vs `doc` boundary (D-0005) — typed output flows only through the **model** (`read` /
  `validate().doc`); `tree` keeps raw strings (the typed cache is an internal node detail the model
  reads).
- No existing fixture golden changes — a contract that declares no transforming `cells` is
  byte-identical.

## 7. Open questions for the implementation spike

- **Generic depth.** Carrying `z.output<cells>` through `table()` → `section()` → `sections()` →
  `Infer` is the per-column literal inference `Infer` deferred. Spike: confirm the generics infer
  cleanly for a realistic multi-section contract under the repo's TS config, and that the dual-key
  `SectionGroup` index signature can host a typed `TableView` key without widening to `unknown`.
- **Span representation.** `InlineSpan` as `{ start, end, raw }` with `SourcePos` endpoints vs a flat
  byte-offset pair. mdast already carries `position` on `inlineCode`; the spike decides whether to
  thread mdast's offsets or recompute against the cell's flattened text.
- **Transform error → finding id.** A transform that `addIssue`s reports `code: "custom"`; confirm it
  maps to `content/table/cell` (not a new id) so goldens and the A3 remap hold.
- **List / paragraph generalization.** Whether `list({ everyItem: ZodType })` keeps its output the
  same way (README "Out of scope") — same mechanism, separate task.
