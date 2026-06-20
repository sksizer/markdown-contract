> Question U7 for [[D-0014-markdown-structure-validation|D-0014]] — the `doc` root surface. Part of
> the consumption-API review (Phase U in ../review-checklist.md). Non-normative; records the
> decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U7 · doc root surface

**Surfaced by:** [[02-validate-doc-and-tree|c02]], [[07-byanchor-declared-vs-dynamic|c07]].

## The question

Beyond `{ frontmatter, body }`, what does the typed `doc` expose? §6 mentions a doc-wide
`doc.byAnchor` but only types `byAnchor` on `SectionView`. Does `doc` also carry the tree /
positions / a top-level iterator?

## Recommendation — `{ frontmatter, body, byAnchor }`, and nothing heavier

```ts
type Doc = {
  frontmatter: F;                                  // the typed frontmatter
  body: /* dual-key sections + unknown[] */;       // the model
  byAnchor(id: string): BlockView | undefined;     // doc-wide anchor lookup (F2, U2)
};
```

- **`doc.byAnchor`** is the doc-wide door (F2: "searches the whole document"); `section.byAnchor` is
  the scoped one. Both return `BlockView | undefined` (U2); missing → `undefined`.
- **No `doc.tree` / `doc.mdast`.** The projection + raw AST live on `validate().tree` (the analysis
  door, U9); `doc` stays the *typed-reads* door. Keeping them separate is the additive-OOM boundary.
- **No separate doc-level positions** — positions live on the views (`SectionView.pos`, `rowPos`,
  …).
- **No bespoke top-level iterator** — `doc.body` already exposes the declared sections (keys) and
  `doc.body.unknown[]`; that's enough. (Add one later only if a real need appears.)

## Decision

**Resolved (2026-06-20).** `doc = { frontmatter, body, byAnchor }` — doc-wide
`byAnchor(id): BlockView | undefined` (F2). **Nothing heavier for now** until needs emerge: no
`doc.tree`/`mdast` (those live on `validate().tree`, U9), no doc-level positions (they live on the
views), no bespoke top-level iterator (`doc.body` keys + `unknown[]` suffice). Folds into
proposed-shape.md §6.
