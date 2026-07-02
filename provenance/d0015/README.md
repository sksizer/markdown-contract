---
type: decision
schema_version: "1"
id: D-0015
status: open/proposed
title: "Structured cells — typed cell transforms, typed row read-back, position preservation"
created: 2026-06-28
last_reviewed: 2026-06-28
related:
  - "[[D-0014-markdown-structure-validation]]"
  - "[[D-0001-finding-model]]"
  - "[[D-0002-projection]]"
  - "[[D-0005-out-of-model]]"
tags:
  - markdown
  - validation
  - consumption
  - typed-model
  - planning-meta
need_human_review: true
---
# Structured cells — typed cell transforms, typed row read-back, position preservation

## Summary

`markdown-contract` is **validate-only** at the cell level. A `table({ columns, cells })` leaf runs
each declared cell's Zod schema with `safeParse` and keeps only `success` / `!success`
(`src/core/content.ts` `validateTable`); the parsed *output* is discarded. The consumption model
hands rows back as raw strings — `TableView<Row = Record<string, string>>`
(`src/core/types.ts`), built directly from `node.rows: string[][]` in `src/core/model.ts`
`tableView`. So a downstream consumer that needs a *typed* value (a parsed path-and-symbol, a
number, a normalized enum) must re-parse the same raw string the contract already validated. And the
projection flattens away the byte positions a consumer would need to do precise raw-snippet work
(inline-code spans, character offsets) — `flattenInline` in `src/core/projection.ts` collapses an
`inlineCode` node to its `value`, dropping the span, and a `table` block carries only line-grained
`pos` / `rowPos(i)`, never a per-cell `col`.

This is a **discovery / design proposal**, not an implementation. It explores three coupled
additions — (a) per-cell **transforms** so consumers read back *typed* cell values, (b) a typed
`Row = z.output<cells>` flowing out of the projection and `read()`, and (c) **position
preservation** (per-cell character offsets and inline-code spans threaded through the projection) —
weighs the design options against the engine's "validate-only, no IO, pure core, additive model"
philosophy (D-0014, D-0005), and **recommends** a concrete shape. The recommended option:
**transforms run at the existing validate-time `safeParse` and the parsed output is cached on the
projection node and exposed through a new `read`-side typed `Row = z.output<cells>`; positions are
attached as an additive `cellPos(row, col)` / inline-span side-table on the table node, leaving every
existing string-cell consumer and `TableView<Record<string, string>>` default untouched.**
Implementation is **out of scope for this PR** — this records the decision and the API shape so the
follow-on tasks can be scoped.

^summary

## Context

D-0014 settled the validator: one remark/mdast parse → a position-carrying projection
(`src/core/projection.ts`, `DocTree` / `SectionNode` / `BlockNode`) → a content-model grammar over
the section sequence (`src/core/grammar.ts`, `structure.ts`) with **Zod embedded at every leaf**
(`src/core/content.ts`, `leaves.ts`). The `table()` leaf grew a `cells?: Record<col, ZodType>` key
that validates each declared column's value per row. The typed consumption model (D-0005,
`src/core/model.ts`) is a lazy facade over the same projection — `read()` / `validate().doc` hand
back a navigable `Doc` whose `body` is a dual-key `SectionGroup`, sections expose `TableView`s, etc.

D-0014's `proposed-shape.md` §6 already *sketches* typed rows — `TableView<Row>` where declared
cells "take their Zod type in the inferred `Row`" — but two things stop that sketch from delivering
typed values today, and a third use case can't be served at all:

1. **The transform output is thrown away.** `validateTable` (`src/core/content.ts`) does:

   ```ts
   const res = zod.safeParse(value);
   if (!res.success) { out.push(ctx.finding({ id: "content/table/cell", … })); }
   ```

   It branches on `res.success` and never reads `res.data`. A `z.string().transform(parseLocation)`
   cell would *validate* fine, but the parsed `{ path, symbol }` evaporates — the model still hands
   back the raw backticked string.

2. **The model is wired to raw strings, end to end.** `tableView` (`src/core/model.ts`) builds each
   row as `Record<string, string>` straight off `node.rows: string[][]`
   (`BlockNode` table arm, `src/core/types.ts`). `TableView<Row = Record<string, string>>` defaults
   to strings, and `read()`'s `Doc` body has no path that carries `z.output<cells>` to the row type.
   `Infer` (`src/core/types.ts`) **deliberately punts** on per-column literal inference: its own
   docstring says mapping "each declared table's `cells` to a typed `Row` … is left as deliberate
   future work; `B & SectionGroup` keeps `Infer` correct and navigable in the meantime." So even the
   *type* `z.output<cells>` doesn't flow to `read()` today, let alone the runtime value.

3. **Positions are flattened to lines, and inline-code spans are discarded.** The projection's
   `flattenInline` (`src/core/projection.ts`) turns a cell's inline subtree into a plain string —
   `inlineCode` contributes only its `value`, so the *fact* that a substring was inside backticks,
   and *where* (its byte/column span), is gone. A table node carries `pos` (the block's line) and
   `rowPos(i)` (the row's line); `SourcePos = { line; col? }` has a `col`, but the table projection
   never sets it for a cell. D-0014 A3/C3 **committed** line-granularity remap and **deferred**
   cell-`col` precision — a finding can locate the *row*, not the *character*. That's adequate for
   diagnostics; it is **not** adequate for a consumer that needs to mask or extract a raw inline-code
   span at a precise offset.

These three gaps surfaced concretely when a downstream SDLC entity system adopted
`markdown-contract` as its body validator. Three real consumers (below) each hit one of them. The
forces converge now: the validator has shipped, the cell schema exists, and these are the consumers
that want to *read* through it rather than re-parse around it.

### The three motivating use cases

**Use case 1 — the task "Files to touch" table (typed cell transform + typed row).**
A task document has a `## Files to touch` section whose sole content is a table with columns
`Location | Kind | Change`:

```md
## Files to touch

| Location                | Kind   | Change                          |
| ----------------------- | ------ | ------------------------------- |
| `src/core/content.ts#validateTable` | modify | thread parsed output through |
| `src/core/model.ts`     | modify | build typed rows                |
| `src/core/legacy.ts`    | delete | remove dead scanner             |
```

`Kind` is already a closed `z.enum(["new", "modify", "delete"])` cell (D-0014 question G1). `Location`
has a **grammar**: a repo-relative path, an optional `#symbol`, wrapped in backticks (e.g.
`` `src/core/content.ts#validateTable` ``). Downstream owns a `parseLocation()` that re-parses the raw
`Location` string into `{ path: string; symbol?: string }`, plus a four-way classification derived
from the `Kind` block value. Today the contract validates the table and the consumer re-parses every
`Location` cell from the raw string the contract already saw. With **structured cells**, `Location`
becomes a cell whose Zod type *transforms* the raw string into the parsed object —
`z.string().regex(LOCATION_RE).transform(parseLocation)` — and the consumer reads
`row.Location.path` / `row.Location.symbol` directly off a typed `Row`. The duplicate parse vanishes;
the grammar lives in one place (the contract).

**Use case 2 — `scan-placeholders` (the position-preservation blocker).**
A downstream check, `scan-placeholders`, detects unfilled `<...>` template placeholders in a document
while **masking** anything inside inline-code spans (so a literal `` `<T>` `` in a code example is not
flagged as an unfilled placeholder). It could **not** migrate onto the projection tree, because it
needs **byte-pinned inline-code spans and raw column-offset snippets** — exactly what the projection
discards. `flattenInline` has already merged the `inlineCode` value into the surrounding text, with no
record of where the backticks were. So `scan-placeholders` still runs its own line scanner over the
raw bytes, re-implementing fence/inline-code awareness the projection already computed once and threw
away. This is the position-preservation motivation: if the projection *preserved* each inline-code
span's byte range (and per-cell character offsets), `scan-placeholders` could consume the tree and
delete its scanner.

**Use case 3 — `Files to touch` consumers (parse-touchpoints / resolve-touchpoints).**
Two further downstream ops — `parse-touchpoints` and `resolve-touchpoints` — read the same
`Files to touch` table. Both currently re-split the raw markdown rows and re-parse the cells
(`Location` via `parseLocation`, `Kind` against a `VALID_KINDS` set — the very set D-0014 G1 says the
contract's enum must preserve). A typed `Row = z.output<cells>` read-back would let both consume
`doc.body.filesToTouch` directly — `for (const r of doc.body.filesToTouch) r.Location.path` — and
delete their duplicate split-and-parse code. This is the same gap as use case 1, seen from a second
and third consumer, which is what makes "the transform output flows to `read()`" load-bearing rather
than a nicety.

## Decision

Add **structured cells** as an **additive, opt-in** layer on the existing `table()` leaf and the
consumption model. The three additions and how they land:

| #   | Component                | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | **Transform timing**     | A cell transform runs at the **existing validate-time `safeParse`** — no second parse pass, no lazy re-run on read. `validateTable` already calls `zod.safeParse(value)` per cell; the change is to *keep* `res.data` on success instead of discarding it. The transform is pure (it is a Zod schema; D-0014's "no IO, pure core" holds — a transform that did IO would violate the contract and is out of scope). When `read()`/`validate().doc` builds the model it reuses the cached output rather than re-running Zod.                                                                                                                                                                                                                                                                                                                                       |
| 2   | **Where output is held** | The parsed output is cached on the **projection's table node**, beside the raw `rows`, as a parallel `typedRows?: unknown[][]` (or a per-cell sparse overlay), populated by the content plane during validation. The projection stays the single substrate (D-0002); the model reads cached output, not a re-parse. The raw `rows: string[][]` is **never removed** — string-cell consumers and `text()`/diagnostics keep reading it. A cell with no transform (plain `z.string()`, `z.enum`, or no `cells` entry) keeps its string value, so the overlay is sparse and the common case is unchanged.                                                                                                                                                                                                                                                          |
| 3   | **Typed row read-back**  | `TableView<Row>`'s `Row` becomes `z.output<cells>` for declared cells, `string` for undeclared columns — the type D-0014 §6 sketched, now *also* carried at runtime. This requires teaching the `table()` / `cells` combinator to carry literal types through its generics so `read()` returns a `Doc` whose `body.<table>` is `TableView<{ Location: { path; symbol? }; Kind: "new" \| "modify" \| "delete"; Change: string }>`. This is precisely the per-column literal inference `Infer`'s docstring named as deferred future work; structured cells is that work. **Default unchanged**: `TableView`'s default type parameter stays `Record<string, string>`, so a `byAnchor` table or an undeclared table is still string-typed.                                                                                                                          |
| 4   | **Position preservation**| The projection gains an **additive** per-cell position side-table on the table node — `cellPos(row, col): SourcePos` with `col` set — and an **inline-span overlay** recording each cell's (and paragraph's) inline-code byte ranges, computed once in `flattenInline`'s replacement. `SourcePos.col` is already optional (D-0014 C3 deferred it as non-breaking), so adding it is additive. Existing `pos` / `rowPos(i)` are untouched. This unblocks `scan-placeholders` (use case 2): the masking consumer reads the inline-span overlay instead of re-scanning bytes. Position preservation ships **independently** of transforms (it is a projection enrichment, not a content-plane change) — they are separable tasks under one decision.                                                                                                                |
| 5   | **Backward-compat**      | Strictly additive. `rows: string[][]` stays; `TableView<Record<string, string>>` stays the default; `validate()` findings are unchanged (the cell finding shape, id `content/table/cell`, and the A3 line remap are preserved — a transform that *throws* / returns an issue is a `content/table/cell` finding exactly as a refine does today). No existing fixture's golden output changes. Opt-in: a contract that declares no transforming `cells` gets byte-identical behavior.                                                                                                                                                                                                                                                                                                                                                                            |
| 6   | **Validate ↔ read split**| `validate()` stays "show me everything, never throws"; a transform failure is a finding, not an exception. `read()` stays "give me the data or throw `ContractError`"; on success it hands back typed rows. The transform output is only surfaced through the **model** (`read` / `validate().doc`), never through the raw `tree` — `tree` is the contract-free projection and keeps raw strings (the cached `typedRows` is an internal projection detail the model reads, not a public `tree` surface). This preserves D-0005's `doc` vs `tree` boundary: typed data through `doc`, raw AST through `tree`.                                                                                                                                                                                                                                                  |

The concrete API surface, the worked examples for all three use cases, and the typing story are in
[proposed-shape.md](proposed-shape.md) (non-normative; finalized by the implementation spike).

## Why

- **The transform already runs — we just keep its output.** `validateTable` calls `safeParse` per
  cell *today*. A transform cell validates today (it just looks like a no-op refine because the
  output is dropped). Caching `res.data` is the minimal change that turns the existing validate pass
  into a parse pass, with no extra traversal and no second Zod run on read. This is the cheapest
  point in the pipeline to capture typed output, and it keeps the engine single-pass.
- **It honors "validate-only, no IO, pure core."** A Zod transform is a pure function of the cell
  string; it does no IO and lives entirely in `core`. The engine stays read-only — it never mutates
  the document, only the *model* it hands back carries richer values. Transforms that need IO
  (filesystem `resolve-touchpoints`) stay in the consumer; the contract transforms the *syntax*
  (`parseLocation`), the consumer does the *semantics* (resolving the path on disk). That is the same
  seam D-0014 drew between deterministic core and downstream adjudication.
- **It collapses three duplicate parsers.** Use cases 1 and 3 re-parse the same `Location` grammar in
  three places; `parse-touchpoints` re-derives the `Kind` `VALID_KINDS` set the contract's enum
  already encodes. Typed read-back makes the contract the single parse, exactly as D-0014 made it the
  single *validate* — the natural next step of the same consolidation.
- **Position preservation unblocks a consumer that the projection locked out.** `scan-placeholders`
  is the proof that line-granularity is a real ceiling: it is the one downstream check that *could
  not* migrate onto the tree, because masking inline-code requires byte spans the projection
  discards. Preserving spans is a projection enrichment that pays for itself the moment one
  byte-precise consumer exists — and one does.
- **It is the future work `Infer` already named.** The typing story is not a new ambition; D-0014's
  `Infer` docstring explicitly deferred per-column literal inference and `proposed-shape.md` §6 drew
  the typed `Row`. This decision picks that thread up deliberately rather than letting it stay a
  perpetual "later."

## Options considered

Three axes, considered independently because they are separable (transforms, typed read-back, and
position preservation can each ship alone). For each axis, the chosen sub-option and the alternatives:

### A. When does a transform run?

| Option | Verdict |
|---|---|
| **A1 — at validate-time `safeParse`, cache the output (chosen)** | One pass; reuses the call already made; the model reads cache. No re-parse, no second traversal. |
| A2 — lazily on first `read()` / row access | Re-runs Zod outside the validate pass, duplicating work and risking a transform observed as "valid" by `validate()` but throwing on `read()` if the schema is non-deterministic. Splits the single-pass model. |
| A3 — eager separate parse phase after validate | A whole extra traversal of every cell for output the validate pass already computed and threw away. Pure waste. |

A1 wins: the `safeParse` call exists; the only change is to stop discarding `res.data`.

### B. Where is the typed output held?

| Option | Verdict |
|---|---|
| **B1 — cached on the projection table node beside `rows`, raw `rows` retained (chosen)** | Single substrate (D-0002); model reads cache; raw strings still available for `text()`, diagnostics, and string-cell consumers. Sparse overlay — only transformed cells differ from their string. |
| B2 — replace `rows: string[][]` with `rows: unknown[][]` | Breaks every string-cell consumer and the `TableView<Record<string,string>>` default; loses the raw string the line remap and `text()` need; a non-additive change to the public `BlockNode`. |
| B3 — `{ value, raw, pos }` cell objects everywhere | D-0014 A3 explicitly **rejected** baking `{value, pos}` into every cell ("pollutes the model" — having Zod reach into `.value`). Re-litigating that here would contradict a settled decision. |

B1 wins and is consistent with A3's rejection of B3.

### C. How are positions preserved?

| Option | Verdict |
|---|---|
| **C1 — additive `cellPos(row, col)` + an inline-code span overlay on the node (chosen)** | Additive; `SourcePos.col` is already optional (C3 deferred, non-breaking); computed once where `flattenInline` runs; unblocks `scan-placeholders` without touching the string flattening every other consumer relies on. |
| C2 — expose layer-0 mdast and make consumers walk it | `tree.mdast` is already public, but that pushes inline-code awareness back onto every consumer — the duplication D-0014 set out to retire. A projection that throws away the spans it computed, then tells consumers to recompute them, is the anti-goal. |
| C3 — stop flattening; keep cell inline subtrees in the model | Reverses D-0002's "cells flatten to strings" invariant and D-0014 §6's "typed scalars and iterables instead of a tree to walk." Far too large; breaks `TableView` rows. |

C1 wins: enrich the projection with the spans it already sees, additively.

### Recommended option

Take **A1 + B1 + C1**: transforms run at validate-time and their output is cached on the projection
table node beside the retained raw `rows`; `read()` exposes `TableView<z.output<cells>>` typed rows
off that cache; and the projection additively preserves per-cell `col` and inline-code byte spans for
position-precise consumers. Each axis ships as its own task (transforms + typed read-back are
coupled; position preservation is independent), all additive, all opt-in, no existing golden changed.

## Out of scope

- **Implementation.** This PR is the design record only. The follow-on tasks (cache the transform
  output; thread `z.output<cells>` through `TableView` / `Infer` / `read()`; add `cellPos` + the
  inline-span overlay; consumer migrations) are scoped *after* this decision is accepted.
- **List-item and paragraph transforms.** The same "keep the output" idea applies to
  `list({ everyItem: ZodType })` and could to paragraphs; this decision focuses on table cells (the
  three motivating consumers are all tables). The list/paragraph generalization is a noted follow-on,
  not decided here.
- **IO-bearing transforms.** `resolve-touchpoints`' filesystem resolution stays in the consumer; the
  contract transforms syntax, not semantics (the core stays pure / no-IO).
- **Cell character-`col` in *findings*.** D-0014 C3 deferred putting `col` on a `content/table/cell`
  finding. Position preservation here is about the *model/projection* surface for consumers; whether
  findings also gain `col` remains C3's call.

## Assumptions

- **Decision id `D-0015` / directory `provenance/d0015/`.** `provenance/` currently holds only
  `d0014/` (= `D-0014`). Following that `dNNNN` ⇄ `D-NNNN` convention, the next free id is `D-0015`.
  If the canonical decision registry has already claimed `D-0015`, renumber the directory and the
  frontmatter `id` to the next free value — the content is registry-independent.
