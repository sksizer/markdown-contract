> Question B4 for [[D-0014-markdown-structure-validation|D-0014]] — `gap({min,max})` count bounds.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# B4 · gap-count

**Surfaced by:** [[05b-gap-bounds|05b]].

## The question

`gap({ min, max })` bounds how many unknown sections the window may admit. Two open bits: **(1)**
the finding when the admitted count is out of range (id / message / pos), and **(2)** what happens
when a contract author writes a *malformed* bound (`min > max`).

## Part 1 — count out of range (a document finding)

`structure/gap-count` (`error`). The window admitted N sections, but the contract said
`min`/`max`.

- **pos** — the first unknown section in the window if any exist (precise); else (a too-few/empty
  window) the preceding recognized section's heading, per A2's nearest-container rule.
- **message** — names the count and the violated bound: `Gap admits 4 sections; at most 2 allowed`
  / `Gap admits 0 sections; at least 1 required`.

## Part 2 — malformed `min > max` (a build finding)

This is a *contract* bug, not a document problem — the author wrote an unsatisfiable bound. So it's
a **build-time** finding: `contract/malformed` (the `contract` area from A1, build-time), raised
when the contract is constructed, before any document is parsed. Not a per-document finding.

## Proposal

| Case | id | when | pos |
|---|---|---|---|
| admitted count out of `[min,max]` | `structure/gap-count` | per-document | first unknown in window, else preceding anchor (A2) |
| `min > max` in the contract | `contract/malformed` | build-time | n/a (no document) |

## Decision

**Resolved (2026-06-19) — ids accepted; the feature is in question.** The ids are good:
`structure/gap-count` (error, per-document) for an admitted count out of `[min,max]`, and
`contract/malformed` (build-time) for an unsatisfiable bound. **Caveat:** whether `gap()` carries
`{min,max}` count bounds *at all* is uncertain — it may ship as a bare window marker. If bounds are
dropped, `structure/gap-count` simply goes unused; `contract/malformed` is general-purpose (any
malformed contract spec) and stays regardless. Revisit when `gap()`'s final surface is fixed (near
the S4 ordering spike). Fold both ids into proposed-shape.md at H1; gate `structure/gap-count` on
the bounds feature actually landing.
