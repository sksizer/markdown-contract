> Question B3 for [[D-0014-markdown-structure-validation|D-0014]] — the unpermitted-unknown-section
> finding. Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# B3 · unpermitted unknown section

**Surfaced by:** [[05-strict-prefix-gap-tail|05]], [[21b-fence-contains-heading-line|21b]].

## The question

When `allowUnknown: false` (or a section appears *before* a `gap()` in a strict, closed prefix), the
document carries a section the contract doesn't recognize and doesn't permit *here*. What finding —
its own id (`structure/unknown-section`), or folded into `structure/section-order`?

## Recommendation — distinct `structure/unknown-section`

Mint a distinct id (`error`), don't fold into `section-order`. They're different failures:

- `structure/section-order` — a *recognized* section is in the wrong place (an ordering problem).
- `structure/unknown-section` — a section that **shouldn't be here at all** (a presence/permission
  problem). Folding it into `section-order` would mislead ("reorder it" — but there's nowhere valid
  to put it).

Same reasoning as B2's `oneOf-ambiguous`: mint a clear id over overloading an ill-fitting one. It
covers both triggers — `allowUnknown: false` anywhere, and an unknown landing in a strict prefix
before the `gap()`.

- **id** `structure/unknown-section`, **level** `error`.
- **pos** the unknown section's heading (the node exists → precise).
- **message** `Unexpected section "X" — unknown sections are not permitted here`.

(Note: this only fires where unknowns are *disallowed*. Under the corpus default
`allowUnknown: true`, unknown sections are fine and produce nothing — that's the whole point of the
flag.)

## Decision

**Resolved (2026-06-19).** Distinct `structure/unknown-section` (error) — not folded into
`section-order`. Fires only where unknowns are disallowed (`allowUnknown: false`, or before a
`gap()` in a strict prefix); `pos` = the unknown section's heading; message
`Unexpected section "X" — unknown sections are not permitted here`. Fold into proposed-shape.md at
H1 (registry entry + template).
