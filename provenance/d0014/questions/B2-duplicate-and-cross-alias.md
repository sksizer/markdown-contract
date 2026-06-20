> Question B2 for [[D-0014-markdown-structure-validation|D-0014]] — duplicate sections and the
> cross-alias collision. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into proposed-shape.md at step H1.

# B2 · duplicate-section + cross-alias

**Surfaced by:** [[03a-duplicate-section|03a]], [[06b-oneof-two-members-present|06b]].

Two related "the same slot is filled twice" cases.

## Part 1 — `structure/duplicate-section` pos

A heading appears more than once (`## Summary` twice). The id is settled
(`structure/duplicate-section`, `error`); the open bit is **which occurrence carries `pos`**, and
whether a 3× repeat is one finding or several.

**Recommend: one finding per *extra* occurrence; `pos` = that occurrence's heading.** The first
occurrence is treated as canonical; each later one is the offending duplicate (the thing to delete
or rename), so it gets flagged at its own line. `## Summary` three times → two findings (at the 2nd
and 3rd). Message references the original:
`Duplicate section "Summary" (already defined at line N)`.

## Part 2 — two `oneOf` members both present

The contract has `oneOf(["Today", "Current state"])` and the document contains **both** `## Today`
*and* `## Current state` — the one slot is filled twice, but by *different* headings. Reuse
`structure/duplicate-section`, or mint a distinct id?

**Recommend: mint `structure/oneOf-ambiguous`** (`error`). The headings aren't identical, so
`duplicate-section` (which is about identical text) reads wrong; a distinct id gives a clearer
message and lets consumers handle it separately. One finding, `pos` = the *later* member's heading
(same "flag the second" logic as Part 1). Message:
`Section "Current state" fills the same slot as "Today" (already present) — use one`.

## Summary of the proposal

| Case | id | count | pos | message |
|---|---|---|---|---|
| identical heading repeated | `structure/duplicate-section` | one per extra occurrence | the extra occurrence's heading | `Duplicate section "X" (already defined at line N)` |
| two `oneOf` members present | `structure/oneOf-ambiguous` | one | the later member's heading | `Section "B" fills the same slot as "A" (already present) — use one` |

## Decision

**Resolved (2026-06-19).** Duplicate identical heading → `structure/duplicate-section` (error),
**one finding per extra occurrence**, `pos` = that occurrence's heading (the first is canonical);
message `Duplicate section "X" (already defined at line N)`. Two `oneOf` members both present →
distinct `structure/oneOf-ambiguous` (error), one finding at the later member; message
`Section "B" fills the same slot as "A" (already present) — use one`. Fold into proposed-shape.md at
H1 (both registry entries + templates).
