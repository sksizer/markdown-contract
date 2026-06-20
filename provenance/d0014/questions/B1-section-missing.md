> Question B1 for [[D-0014-markdown-structure-validation|D-0014]] — the `section-missing` finding.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# B1 · `section-missing`

**Surfaced by:** [[01a-single-section-missing|01a]], [[02a-one-of-several-missing|02a]],
[[06a-oneof-none-present|06a]], [[08a-both-planes-fail-merged|08a]].

A required `section(...)` (or `oneOf(...)` slot) that the document doesn't contain. _Surfaced: 01a,
02a, 06a, 08a._ Most of this is now mechanical given Phase A — B1 just sets the registry entry and
the one real sub-question (how a missing `oneOf` reports).

## Settled by Phase A (inherited)

- **id** — `structure/section-missing` (A1: `structure/*`, slash path).
- **level** — `error` default in the registry (A1), overridable per contract.
- **pos** — A2: a missing top-level section → document-level (no container); a missing *subsection*
  → the parent section's heading.

## The one open sub-question — a missing `oneOf`

A `oneOf(["Today", "Current state"])` slot is one logical section with several accepted spellings.
When none appears, do we emit **one finding or one per member**, and does the message **list all
spellings or just the first**?

**Recommend: one finding, message lists all accepted spellings.** A missing slot is a single problem
— one-per-member would emit N findings for one absence (noise, and misleading: you don't want "add
Today" *and* "add Current state", you want "add one of them"). The message names the alternatives so
the author knows their options.

## Proposed messages

| Case | Message |
|---|---|
| plain required section | `Missing required section: "Summary"` |
| missing `oneOf` slot | `Missing required section: expected one of "Today", "Current state"` |

(Message templates live in the registry, A1.)

## Decision

**Resolved (2026-06-19).** id `structure/section-missing` (level `error`).
**One finding per missing slot** — including a missing `oneOf`, whose single message
**lists all accepted spellings** ("expected one of …"), not one finding per member. `pos` per A2
(top-level → document-level; subsection → parent heading). Messages: plain →
`Missing required section: "Summary"`; oneOf →
`Missing required section: expected one of "Today", "Current state"`. Fold into proposed-shape.md at
H1 (the `structure/section-missing` registry entry + message templates).
