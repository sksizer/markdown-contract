> Question U8 for [[D-0014-markdown-structure-validation|D-0014]] — the dynamic `TableView`. Part of
> the consumption-API review (Phase U in ../review-checklist.md). Non-normative; records the
> decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U8 · Dynamic TableView

**Surfaced by:** [[07-byanchor-declared-vs-dynamic|c07]], [[05-tableview-typed-rows|c05]].

## The question

An undeclared/lone table is `TableView<Record<string, string>>`. Same interface as a typed table,
just `string` cells? Do `column()` / `find()` stay `string`-typed?

## Recommendation — yes; one interface, `Row` at its default

A dynamic table is just `TableView` with `Row = Record<string, string>` (the default, U2). Same
methods, no separate type:

- `columns` read from the document; every cell is `string`.
- `column("X")` → `string[]`; `find(p)` → `Record<string, string> | undefined`; iteration yields
  `Record<string, string>`; `rowPos`/`rowCount`/`pos` unchanged.

So the *only* difference from a typed table is the `Row` type parameter — typed cells (from the
contract's `cells` Zod) vs `string`. The contract is the sole source of cell types (§6); no
declaration ⇒ `string`.

## Decision

**Resolved (2026-06-20).** A dynamic/undeclared table is the **same `TableView` interface** with
`Row = Record<string, string>` (the default): `string` cells, `column()`/`find()` typed `string`, all
other members unchanged. Typed cells come only from a contract's `cells` Zod; no declaration ⇒
`string`. Folds into proposed-shape.md §6.
