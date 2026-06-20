> Question E3 for [[D-0014-markdown-structure-validation|D-0014]] — finding merge/sort order. Part of
> the open-decision review (see ../review-checklist.md). Non-normative; records the decision, folded
> into proposed-shape.md at step H1.

# E3 · merge order

**Surfaced by:** [[08a-both-planes-fail-merged|08a]], [[19a-real-decision-three-findings|19a]].

## The question

`validate` merges findings from three sources (frontmatter Zod, the body grammar, leaf Zod) into one
`Finding[]`. The order was *implied* (ascending line) but never stated — and golden-pinning needs it
**deterministic**.

## Recommendation — document the sort in §4

`findings` is sorted by:

1. **Ascending `pos.line`** — document reading order (top to bottom).
2. **No-`pos` (document-level) findings sort first**, as if line 0 — an absence-class finding ("the
   doc is missing section X", A2) is about the whole document, so it reads before line-specific
   ones.
3. **Tie-break, same line:** `pos.col` ascending if present, then a fixed **plane order**
   (`frontmatter` → `structure` → `content` → `rule`), then stable emission order.
4. **Stable across runs** — a stable sort + deterministic tie-breaks (no `Set`/`Map`-iteration
   nondeterminism), so the same input always yields the same `Finding[]` order. This is what lets
   the parity goldens pin output.

Frontmatter lines (1..N) sort above body lines naturally, so "frontmatter before body" mostly falls
out of rule 1 — rule 3's plane order only matters on a genuine tie or for no-`pos` findings.

## Decision

**Resolved (2026-06-19, v1).** `findings` sorted deterministically: **(1)** ascending `pos.line`;
**(2)** no-`pos` (document-level) findings first (as line 0); **(3)** tie-break on the same line →
`pos.col` if present, then plane order (`frontmatter` → `structure` → `content` → `rule`), then
stable emission order; **(4)** stable across runs (stable sort + deterministic tie-breaks). Fold
into proposed-shape.md §4 at H1.
*(Accepted "for now" — revisitable if a different default reads better.)*
