> Example 09 for [[D-0016-per-node-source-fidelity|D-0016]] — one cell, three views; the M-0011
> convergence. Non-normative; the decision (and M-0011) win.

# 09 · Structured cells — three views on one cell (M-0011)

## Affordance

The structured-cells milestone (M-0011, PR #100) is this decision at cell depth, already in flight.
It shows a single table cell carrying **all three views at once**:

- **typed model** — the contract's transforming cell parses the string once; `read()` hands back the
  typed value (`Location.path`), flowing through the model, not the raw tree.
- **raw** — `cell.raw()` is the verbatim cell source (backticks intact).
- **position** — `cellPos(row, col)` / the cell's `range`.

## Input

```md
## Files to touch

| Location                  | Kind   | Change              |
|---------------------------|--------|---------------------|
| `src/core/frontmatter.ts` | new    | the splitter        |
```

## Consumer code

```ts
import { z } from "zod";
import { contract, parse, section, sections, table } from "markdown-contract";

const parseLocation = (s: string) => ({ path: s.replace(/`/g, ""), backticked: s.startsWith("`") });

const Task = contract({
  body: sections({
    "Files to touch": section({
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Location: z.string().transform(parseLocation) },   // transforming cell
      }),
    }),
  }),
});

// ── typed view — INTENDED M-0011 shape, not today's runtime (see Notes) ──
//    through the model (read / validate().doc), contract-inferred
const doc = Task.read(source);
const files = doc.body["Files to touch"];
//   TableView<{ Location: { path: string; backticked: boolean }; Kind: string; Change: string }>
for (const r of files) {
  r.Location.path;        // "src/core/frontmatter.ts"   ← parsed once, in the contract
  r.Location.backticked;  // true
  r.Kind;                 // string  (undeclared cell defaults to string)
}

// ── raw + position views — off the tree, same cell ──
const tree = parse(source);
const t = tree.root.sections.find((s) => s.name === "Files to touch")!
  .blocks.find((b) => b.kind === "table")!;

t.cell(0, 0).raw();       // "`src/core/frontmatter.ts`"   ← verbatim (raw view)
t.typed(0, 0);            // { path: "src/core/frontmatter.ts", backticked: true }  ← cached transform output
t.cellPos(0, 0);          // { line: 4, col: 3 }           ← position view
```

## The doc / tree boundary

The typed value flows **only** through the model (`read()` / `validate().doc`); the raw `tree` keeps
strings (`t.rows[0][0]` is still `"src/core/frontmatter.ts"`, `t.cell(0,0).raw()` is the verbatim
`` `…` ``). That is the D-0005 `doc` vs `tree` split, preserved: `tree` is source-faithful, `doc` is
contract-typed. The same cell answers both because they share its `range`.

## Why it matters

This is the concrete proof of the whole decision: the three views coexist on one node without
fighting. It's additive and opt-in (`mcVersion: 1`, no golden moves), it does **not** extend mdast
(the transform output is a sparse overlay beside the raw `rows`), and it's reached by accessor
functions — the composition + accessor + overlay-beside-raw shape D-0016 generalizes.

## Notes

- **Convergence (decision, Open questions).** M-0011 ships `typed(row,col)`, `cellPos(row,col)`, and
  an `inlineSpans` overlay as separate accessors. The open question is whether they become the
  cell/inline projection of this decision's single per-node `range`, so the depth ladder shares one
  positional model instead of growing per-depth accessors.
- **Status — intended, not current.** The typed per-cell view is the **M-0011 target**, not today's
  runtime. Today `read()` returns rows as `Record<string, string>` (every cell a string; `cells`
  schemas drive *validation*, not a typed row object — see `packages/core/src/core/model.ts`), and
  none of `cell()` / `typed()` / `cellPos()` exists yet; the raw/position accessors are likewise
  proposed.
- **Precise per-cell typing is deferred.** `typed(0, 0)` narrowing to `{ path; backticked }` needs
  per-column *literal* inference; with two numeric positional args TS can only widen. The literal path
  — a `<K extends keyof Cells>` key, as `TableView.column` already does — is the shape, and the
  refinement is explicit future work (the `Infer` scope note in `packages/core/src/core/types.ts`).
- Transforms are a TS-API feature; declarative-YAML transform exposure is deferred (M-0011 / D-0011).
