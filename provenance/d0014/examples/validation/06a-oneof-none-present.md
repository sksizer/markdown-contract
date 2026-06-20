> Example 06a for [[D-0014-markdown-structure-validation|D-0014]] — No alias spelling present.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 06a · No alias spelling present

## Capability

Edge case on **06** (alias sets via `oneOf([names])`). Where 06 shows one of the interchangeable
spellings present and satisfying the requirement, 06a stresses the **none-present** path: the
document carries some other heading, so *no* member of the alias set appears. A required `oneOf`
must then emit a single `structure/section-missing` naming the whole alias set — not one finding
per member. No new API surface — same `oneOf` contract as 06 — just the absence variant.

## Use case

A markdown class that mandates one section reachable under several interchangeable spellings
(here `Goal` / `Goal / Problem statement` / `Objective statement`). The author ships a document
with an unrelated heading (`## Objective`, which is *not* a declared spelling). The contract must
recognise that the required group is unsatisfied and localize one diagnostic to a sensible line.

## Sample document

```md
# Task: tidy the widget cache

## Objective

Reclaim stale cache entries so the widget index stays under the memory budget.
```

## Proposed contract

```ts
import { contract, sections, oneOf } from "markdown-contract";

// One required section reachable under several spellings — body grammar only, no frontmatter.
export const GoalContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement", "Objective statement"]),  // required alias set
  ]),
});
```

## Expected findings

**PASS** — a document carrying any one of the declared spellings satisfies the group:

```md
# Task: tidy the widget cache

## Goal / Problem statement

Reclaim stale cache entries so the widget index stays under the memory budget.
```

```ts
const { findings, value } = GoalContract.validate(source, { path });
// findings === []
// value === { frontmatter: undefined, body: { goal: { /* SectionView */ } } }
```

A consumer reads the matched section through the typed OOM facade, keyed by the canonical
(first-declared) spelling regardless of which alias appeared:

```ts
value.body.goal.text();                       // "Reclaim stale cache entries. …"
value.body.section("Goal / Problem statement"); // same SectionView (exact key, any declared alias)
```

**FAIL** — the sample document above (`## Objective`, no declared spelling present):

```ts
GoalContract.validate(source, { path: "tasks/tidy-cache.md" }).findings;
```

```jsonc
[
  { "id": "structure/section-missing", "level": "error",
    "path": "tasks/tidy-cache.md", "pos": { "line": 3 },
    "message": "required section ‘Goal | Goal / Problem statement | Objective statement’ is absent" }
]
```

Exactly **one** finding for the whole group, not one per member. `pos.line` points at line 3 —
the first body heading (`## Objective`), the nearest concrete location for an absence, since the
missing group has no position of its own. Level is `error`: contract data, not a call-site choice.

## Gaps & questions

The contract and OOM access use only documented API. The same two under-specified points carried
by 01a apply, plus one specific to alias-group absence:

- **`structure/section-missing` finding id is not enumerated.** proposed-shape.md names
  `structure/section-order`, `structure/anchor-missing`, and `structure/duplicate-section`, but
  never the missing-required-section id; it is inferred from the `structure/*` namespace.
  - Proposed delta: add a finding-id registry row pinning `structure/section-missing` (level
    `error`) as the canonical id for an absent required section or alias group.
- **One finding for a group vs one per member is unspecified.** The doc shows `oneOf` accepting
  interchangeable spellings but never the all-absent case, so whether a missing `oneOf` emits a
  single group finding (assumed here) or fans out per member is undocumented.
  - Proposed delta: state that a required `oneOf` whose members are all absent emits exactly one
    `structure/section-missing`, with a `message` enumerating the alias set.
  - Open question for human review: should the `message` list all spellings (as here) or only the
    canonical first-declared one, and is the `|`-joined rendering the intended convention?
- **Position of an absence is not defined** (same as 01a): a missing group has no `SourcePos`, so
  "first body heading, falling back to document start" is a reasonable but unstated convention.
