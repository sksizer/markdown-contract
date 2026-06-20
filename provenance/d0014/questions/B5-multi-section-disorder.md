> Question B5 for [[D-0014-markdown-structure-validation|D-0014]] — reporting multi-section disorder.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# B5 · multi-section disorder

**Surfaced by:** [[04a-recognized-relative-out-of-order|04a]], [[19a-real-decision-three-findings|19a]].

## The question

`structure/section-order` is settled (id + error). The open bit: when *several* recognized sections
are out of declared order, do we emit **one finding per out-of-order section**, or **one finding for
the first inversion** only?

## Recommendation — one finding per out-of-order section

The matcher walks the expected sections as a subsequence; each recognized section that appears
*before* one it should follow is flagged once, at its own heading.

- For the common case — a single swap (`[Decision, Context]` where `Context` should precede) — this
  is **one** finding (at `Decision`).
- For a worse scramble, several — each clickable, each independently fixable.

This beats "first inversion only," which reports one problem, hides the rest, and forces
fix-and-rerun iteration. It doesn't over-count: a clean swap yields exactly one finding, not two.

- **id** `structure/section-order`, **level** `error`.
- **pos** the out-of-order section's heading.
- **message** names the expected relation: `Section "Decision" appears before "Context"; expected
  order: Context then Decision`.

(Note: this is the `order: strict` / `recognized-relative` path; under `order: none` there is no
declared order, so it never fires. The exact "out of order" determination for the heterogeneous
recognized-relative case is the S4 spike — B5 fixes the *reporting shape*, S4 the *detection*.)

## Decision

**Resolved (2026-06-19).** `structure/section-order` (error), **one finding per out-of-order
section**, each at its heading — a clean swap yields exactly one, a worse scramble several (each
fixable); not first-inversion-only. Message names the expected relation. Only fires under
`strict`/`recognized-relative`; the heterogeneous out-of-order *detection* is the S4 spike, B5 fixes
the *reporting shape*. Fold into proposed-shape.md at H1.
