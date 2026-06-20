> Question U9 for [[D-0014-markdown-structure-validation|D-0014]] — the `tree` vs `doc` boundary.
> Part of the consumption-API review (Phase U in ../review-checklist.md). Non-normative; records the
> decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U9 · tree vs doc for analysis

**Surfaced by:** [[02-validate-doc-and-tree|c02]].

## The question

`validate()` returns both `tree` (projection + `mdast`) and `doc` (typed views). Both can give,
e.g., a section's line. When does a consumer reach for which? Pin the boundary so power-consumers
don't re-parse.

## Recommendation — `doc` for typed reads; `tree` for raw / structural / always-available

| Reach for `doc` | Reach for `tree` |
|---|---|
| the contract-typed model — section fields, typed rows, `byAnchor` | the **raw mdast** (`tree.mdast`) for AST-level work |
| the 99% consumer case (report ops, summaries) | data the contract **didn't model** (arbitrary blocks, unmapped nodes, `lineForPath`) |
| only available when the doc is **valid** (no error finding) | **always returned** — even when `doc` is absent (errors present) |

Rule of thumb: **`doc` = contract-shaped and typed; `tree` = raw, structural, and always there.** A
consumer that has a valid doc and wants typed data uses `doc`; a linter/analyzer that must work on
*invalid* documents, or needs the AST / unmodelled structure, uses `tree`. State this in §6 so the
two doors aren't confused. (`read()` returns only `doc`, never `tree` — the lean door.)

## Decision

**Resolved (2026-06-20).** Boundary stated in §6: **`doc` = contract-typed reads** (section fields,
typed rows, `byAnchor`; available only on a valid doc); **`tree` = raw mdast + unmodelled structure +
`lineForPath`, always returned** (even when `doc` is absent due to errors). `read()` returns only
`doc`. Folds into proposed-shape.md §6.
