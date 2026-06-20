> Question U4 for [[D-0014-markdown-structure-validation|D-0014]] — what `SectionView.text()`
> flattens. Part of the consumption-API review (Phase U in ../review-checklist.md). Non-normative;
> records the decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U4 · text() flattening

**Surfaced by:** [[04-sectionview-content|c04]].

## The question

`SectionView.text()` returns "flattened prose" — but what's in scope: prose only, or table/list/code
text too? This section only, or its nested subsections as well?

## Recommendation — parametrize `text(scope)`, default `"prose"`

Make the scope a parameter rather than a fixed choice:

```ts
text(scope: "prose" | "all" = "prose"): string;
```

- **`"prose"` (default)** — this section's own `paragraph` blocks only (the blurb): excludes
  structured blocks (tables/lists/code have their own views) and nested subsections (reached via
  `.sections`, U3). Predictable, no double-counting.
- **`"all"`** — the full flattened text of the section *subtree*: every block's text (table cells,
  list items, code values) plus all nested subsections, recursively. The full-text / search /
  indexing escape hatch.

Default **`"prose"`** because it's the common "section blurb" case and avoids surprising
double-counts when a consumer also reads `.tables`/`.lists`; `"all"` is the explicit opt-in. (This
folds the would-be `allText()` in as `text("all")`.)

## Decision

**Resolved (2026-06-20).** `text(scope: "prose" | "all" = "prose")`. **`"prose"` (default)** = this
section's own `paragraph` blocks (blurb; no structured blocks, no nested subsections). **`"all"`** =
the full flattened subtree text (all blocks + nested subsections, recursively) for search/indexing.
Default is `"prose"` (predictable, no double-count); `"all"` is the opt-in. Folds into
proposed-shape.md §6.
