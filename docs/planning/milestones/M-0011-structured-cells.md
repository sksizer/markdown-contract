---
type: milestone
schema_version: '1'
id: M-0011
status: open/planned
title: Structured cells — typed transforms, typed read-back, position preservation
created: '2026-06-30'
related:
  - '[[D-0015-structured-cells]]'
  - '[[D-0014-markdown-structure-validation]]'
  - '[[D-0005-consumption-oom]]'
  - '[[D-0002-projection-and-dialect]]'
  - '[[D-0001-finding-model]]'
  - '[[C-0002-typed-consumption]]'
  - '[[DR-0002-typed-consumption]]'
  - '[[T-6PV4-consumption-object-model]]'
tasks:
  - '[[T-SCFX-structured-cells-fixture-scaffold]]'
  - '[[T-SCTC-table-cell-transform-capture]]'
  - '[[T-SCRB-typed-row-read-back]]'
  - '[[T-SCLI-list-item-transforms]]'
  - '[[T-SCPP-cell-position-preservation]]'
  - '[[T-SCPA-paragraph-transform-adr]]'
  - '[[T-SCDF-structured-cells-dogfood]]'
tags:
  - structured-cells
  - consumption
  - typed-model
  - oom
  - position-preservation
  - milestone
need_human_review: true
---

# Structured cells — typed transforms, typed read-back, position preservation

## Summary

- Extend the typed consumption object model ([[D-0005-consumption-oom]], shipped in [[T-6PV4-consumption-object-model]]) from **validate-only cells** to **structured cells**, as decided in [[D-0015-structured-cells]] (`provenance/d0015/`, PR #49). Today a `table({ columns, cells })` leaf runs each declared cell's Zod schema with `safeParse` and keeps only `success` / `!success` — the parsed *output* is discarded (`src/core/content.ts` `validateTable`), and the model hands rows back as raw `Record<string, string>` (`src/core/model.ts` `tableView`). A consumer that needs a *typed* value re-parses the string the contract already validated.
- This milestone delivers the recommended **A1 + B1 + C1** shape, additively and opt-in: (A1) a cell transform's output is **kept** at the existing validate-time `safeParse`; (B1) it flows to a typed `TableView<z.output<cells>>` read-back through `read()` / `validate().doc`; (C1) the projection additively preserves per-cell `col` and inline-code byte spans for position-precise consumers. Per the [scope decision](#scope), the same "keep the transform output" mechanism is **also** extended to `list({ everyItem })` items (symmetric to the table change), and the **paragraph** generalization is captured as its own design record rather than implemented here.
- Strictly backward-compatible within `mcVersion: 1`: raw `rows: string[][]`, the `TableView<Record<string, string>>` default, the `content/table/cell` finding shape, and the D-0014 A3 line remap are all unchanged — no existing fixture golden moves. A contract that declares no transforming cells gets byte-identical behavior.

^summary

## Outcome

A contract author can declare a transforming cell (e.g. `Location: z.string().regex(LOCATION_RE).transform(parseLocation)`) and a transforming list item, and read them back as typed data — `for (const r of doc.body.filesToTouch) r.Location.path` — with the parse living in one place (the contract) instead of duplicated in every consumer. A position-precise consumer can read per-cell character offsets and inline-code byte spans off the projection instead of re-scanning raw bytes. The typed value flows only through the **model** (`read` / `validate().doc`); the raw `tree` keeps strings, preserving the D-0005 `doc` vs `tree` boundary. The feature lands over the existing engine with no change to the finding stream, proven by a gated fixture corpus that greens slice-by-slice and dogfooded by at least one in-repo contract.

## Scope

**In**

- **Transform output capture** (axis A1 / B1 runtime): `validateTable` keeps `res.data` from the `safeParse` it already runs; the parsed output is cached on the projection's table `BlockNode` as a **sparse** `typed(row, col)` overlay beside the retained raw `rows`. A cell with no transform allocates nothing extra.
- **Typed row read-back** (axis B1 types): `TableView<Row>`'s `Row` becomes `z.output<cells>` for declared cells and `string` for undeclared columns; `table()` / `cells` carry the literal types through their generics to `read()` and `Infer` — the per-column literal inference `Infer`'s docstring named as deferred. The `TableView` **default** type parameter stays `Record<string, string>`.
- **List-item typed transforms**: the same "keep the output" change applied to `list({ everyItem: ZodType })` — `validateList` keeps `everyItem`'s `safeParse` output, threaded to a typed `ListView` read-back. Symmetric to the table change (the `safeParse` already runs in `src/core/content.ts` `validateList`).
- **Position preservation** (axis C1): an additive per-cell `cellPos(row, col): SourcePos` with `col` set, and an inline-code **span overlay** (`inlineSpans`) recording each cell's (and paragraph's) inline-code byte ranges, computed once in the `flattenInline` replacement (`src/core/projection.ts`). Ships independently of transforms — it is a projection enrichment, not a content-plane change.
- A **gated fixture corpus + peer unit tests** (the `IMPLEMENTED` greening pattern) proving typed table rows, typed list items, position preservation, and strict backward-compat, plus a dogfooded in-repo contract.

**Out**

- **Paragraph transforms.** There is no Zod content schema on a paragraph leaf today (only `maxWords`), so generalizing is not "keep an output that already exists" — it needs a new schema-bearing paragraph leaf and a read-back-shape decision. That design is captured by [[T-SCPA-paragraph-transform-adr]] as its own decision record + scoped follow-on tasks; it is **not implemented** in this milestone.
- **Downstream consumer migrations.** The D-0015 use cases (`parse-touchpoints` / `resolve-touchpoints` deleting their duplicate `parseLocation`; `scan-placeholders` consuming the span overlay) are the **driver this milestone unblocks** ([[DR-0002-typed-consumption]]), owned by the consumer — not part of this milestone, mirroring how [[M-0004-declarative-text-constraints]] treated its corpus driver.
- **IO-bearing transforms.** The core stays pure / no-IO. A transform is a Zod schema over the cell string; filesystem resolution (`resolve-touchpoints`) stays in the consumer — the contract transforms syntax, the consumer does semantics.
- **Declarative YAML exposure of transforms.** A Zod `.transform()` is a TS-API construct; the declarative `*.contract.yaml` front-end has a closed vocabulary and no code escape hatch (the `$ref` escape hatch was deferred by [[D-0011-declarative-text-constraints]]). Structured-cell transforms are therefore a **TS-API feature** in this milestone; exposing them in declarative YAML is a separate, later question. (Position preservation, being projection-level, applies to YAML-authored and TS-authored contracts alike.)
- **Cell character-`col` in *findings*.** D-0014 C3 deferred putting `col` on a `content/table/cell` finding. Position preservation here is the *model/projection* surface for consumers; whether findings also gain `col` remains C3's call.

## Workstreams

Decomposed into the task set below. Fixtures come **first**, gated off and greened slice-by-slice as each component lands — the T-9XB3 / `text-*` pattern — so every implementation task has a target to green. New gate components: `cell-typed`, `list-typed`, `cell-pos` in `tests/components.ts`.

1. **Fixture scaffold + enable gates** ([[T-SCFX-structured-cells-fixture-scaffold]]). Add the `cell-typed` / `list-typed` / `cell-pos` components to the `IMPLEMENTED` switch (seeded `false`), author the gated typed-row / typed-item / position fixtures up front (skipped-green), and stub the typed public surface so it type-checks.
2. **Transform output capture** ([[T-SCTC-table-cell-transform-capture]]). Keep `res.data` in `validateTable`; cache it on the table `BlockNode` as a sparse `typed(row, col)` overlay beside the retained raw `rows`; peer-unit-test the content plane and projection node. The runtime substrate B1 reads.
3. **Typed row read-back** ([[T-SCRB-typed-row-read-back]]). Thread `z.output<cells>` through `table()` → `section()` → `sections()` → `Infer`; `tableView` reads the cache; `TableView<Row>` carries the typed `Row` with the default unchanged. Flips `cell-typed`.
4. **List-item typed transforms** ([[T-SCLI-list-item-transforms]]). Apply the same capture + read-back to `list({ everyItem })`; typed `ListView`. Flips `list-typed`.
5. **Position preservation** ([[T-SCPP-cell-position-preservation]]). Additive `cellPos(row, col)` with `col` and an `inlineSpans` overlay computed in `flattenInline`'s replacement; independent of transforms. Flips `cell-pos`.
6. **Paragraph transform ADR** ([[T-SCPA-paragraph-transform-adr]]). Design-only: a decision record for a schema-bearing paragraph leaf (transformed-value semantics, `ParagraphView` read-back shape, `Infer` carry, whether to ship) plus scoped follow-on tasks. No source change.
7. **Dogfood + closeout** ([[T-SCDF-structured-cells-dogfood]]). Migrate at least one in-repo contract onto a transforming cell + transforming list item; confirm zero structured-cells fixtures remain skipped and no existing golden moved.

## Success criteria

- [ ] A `table({ cells: { Location: z.string().transform(parseLocation) } })` contract reads back `doc.body.<table>` rows whose `Location` is the **parsed object**, typed as `z.output<cells>` at compile time and carried at runtime; no consumer re-parse.
- [ ] The typed output is produced by the **existing** validate-time `safeParse` (no second Zod pass, no re-run on read); the model reads the cached overlay.
- [ ] The `TableView` **default** type parameter stays `Record<string, string>` — a `byAnchor` table or an undeclared table is still string-typed.
- [ ] A `list({ everyItem: ZodType })` with a transform reads back typed items through `ListView`, by the same mechanism as table cells.
- [ ] The projection exposes a per-cell `cellPos(row, col)` with `col` set and an `inlineSpans(row, col)` overlay carrying inline-code byte ranges; existing `pos` / `rowPos(i)` are untouched.
- [ ] A failed transform surfaces as the **existing** `content/table/cell` (or `content/list/item-kind`) finding at the offending row's line — same id, same A3 line remap; `validate()` reports it as data, `read()` throws `ContractError`.
- [ ] No existing fixture golden changes; a contract declaring no transforming cells is byte-identical. The structured-cells fixtures are authored up front and gated (`cell-typed` / `list-typed` / `cell-pos`), greening slice-by-slice, with zero left skipped at milestone close.
- [ ] The paragraph generalization is recorded as an accepted-or-rejected decision with scoped follow-on tasks ([[T-SCPA-paragraph-transform-adr]]); it is not implemented here.
- [ ] At least one realistic worked **TS** contract in the corpus dogfoods a transforming cell + transforming list item (transforms are TS-API; declarative-YAML transform exposure is out of scope). Imports stay one-way (`cli → runner → core`); the change is confined to `src/core`.

## Dependencies

- **[[D-0015-structured-cells]]** — the decision this milestone implements (`provenance/d0015/`, PR #49). Acceptance of that decision record is the prerequisite; this milestone is its scoped follow-on.
- The shipped validator and typed model this extends — [[D-0014-markdown-structure-validation]], [[D-0005-consumption-oom]] / [[C-0002-typed-consumption]] ([[T-6PV4-consumption-object-model]]) — and the projection substrate [[D-0002-projection-and-dialect]].

## References

- [[D-0015-structured-cells]] — the decision (`provenance/d0015/README.md` + `proposed-shape.md`): A1 + B1 + C1, the three motivating use cases, the options weighed per axis.
- [[D-0005-consumption-oom]] — the typed object model (`read` / `validate().doc`, `TableView`, `Infer`) this extends.
- [[D-0014-markdown-structure-validation]] — the validator and the `table()` / `cells` leaf the transform attaches to; the A3 line remap the finding shape preserves.
- [[D-0002-projection-and-dialect]] — the projection (`flattenInline`, `SourcePos`) the position overlay enriches.
- [[D-0001-finding-model]] — the `content/table/cell` / `content/list/item-kind` finding a failed transform emits.
- [[DR-0002-typed-consumption]] — the driver this milestone unblocks; the downstream consumers (`parse-touchpoints`, `resolve-touchpoints`, `scan-placeholders`) that delete their duplicate parsing once typed read-back and span preservation ship.
