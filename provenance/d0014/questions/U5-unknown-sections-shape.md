> Question U5 for [[D-0014-markdown-structure-validation|D-0014]] — the `body.unknown[]` shape. Part
> of the consumption-API review (Phase U in ../review-checklist.md). Non-normative; records the
> decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U5 · body.unknown[] element shape

**Surfaced by:** [[09-unknown-sections|c09]].

## The question

Sections admitted by `gap()` / `allowUnknown` have no contract name to camelCase, so they can't be
typed fields. §6 shows `body.unknown: SectionView[]`. Confirm: element type, keying, and whether
`unknown` is always present.

## Recommendation — `SectionView[]`, positional, always an array

- **`body.unknown: SectionView[]`** — each element is a *full* `SectionView` (`name`, `pos`,
  `text()`, `.tables`, `.lists`, `.sections`, `byAnchor`); the only string handle is `.name`
  (there's no contract key). Read by iteration or index, in document order.
- **Always present as `[]`** when there are none — never `undefined` — so consumers iterate
  unconditionally (`for (const s of doc.body.unknown)`).
- **Holds every un-named section** — both `gap()`-window admissions and `allowUnknown:true`
  interlopers land here; "unknown" = "not a declared section," regardless of which knob admitted it.

A consumer that wants one by heading does `doc.body.unknown.find((s) => s.name === "Notes")` — or,
if it expects it, the contract should *declare* it instead of leaving it unknown.

## Decision

**Resolved (2026-06-20).** `body.unknown: SectionView[]` — positional, in document order, each a full
`SectionView` (`.name` the only string handle). **Always present as `[]`** (never `undefined`) so
consumers iterate unconditionally; holds **both** `gap()` and `allowUnknown` admissions. Folds into
proposed-shape.md §6.
