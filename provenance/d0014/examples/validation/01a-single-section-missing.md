> Example 01a for [[D-0014-markdown-structure-validation|D-0014]] — Required section absent.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 01a · Required section absent

## Capability

Edge case on **01** (single required `section(name)`). Where 01 shows the section present
and passing, 01a stresses the **absence** path: the one required H2 is missing, so the body
grammar must emit a `structure/section-missing` finding rather than silently passing. No new
API surface — same one-section contract — just the failure variant of the same combinator.

## Use case

A markdown class that mandates exactly one named section (here `## Overview`). The author
ships a document that has a heading, but the wrong one (`## Background`). The contract must
detect that the required section never appears and localize the diagnostic to a sensible
source line.

## Sample document

```md
# Widget notes

## Background

Widgets are small. This document collects loose notes about them.
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

// One required section — body grammar only, no frontmatter plane.
export const OverviewContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Overview"),
  ]),
});
```

## Expected findings

**PASS** — the conforming document carries the required heading:

```md
# Widget notes

## Overview

Widgets are small. This document collects loose notes about them.
```

```ts
const { findings, value } = OverviewContract.validate(source, { path });
// findings === []
// value === { frontmatter: undefined, body: { overview: { /* SectionView */ } } }
```

A consumer reads the section through the typed OOM facade:

```ts
value.body.overview.text();          // "Widgets are small. …"
value.body["Overview"];              // same SectionView (exact key)
```

**FAIL** — the sample document above (`## Background` present, `## Overview` absent):

```ts
OverviewContract.validate(source, { path: "notes/widget.md" }).findings;
```

```jsonc
[
  { "id": "structure/section-missing", "level": "error",
    "path": "notes/widget.md", "pos": { "line": 3 },
    "message": "required section ‘Overview’ is absent" }
]
```

Exactly one finding. `pos.line` points at line 3 — the first body heading (`## Background`),
the nearest concrete source location for an absence — since the missing section has no
position of its own. Level is `error`: contract data, not a call-site choice.

## Gaps & questions

The contract and OOM access use only documented API. Two points are under-specified by
proposed-shape.md rather than contradicted, so they read as open questions:

- **`structure/section-missing` finding id is not enumerated.** The doc names
  `structure/section-order`, `structure/anchor-missing`, and `structure/duplicate-section`,
  and the §5.3 walkthrough never exercises a *missing required section*. The id is consistent
  with the `structure/*` namespace and the `frontmatter/enum` shape, but is inferred, not
  documented.
  - Proposed delta: add one row to a finding-id registry pinning
    `structure/section-missing` (level `error`) as the canonical id for an absent required
    section, alongside the already-named `structure/*` ids.
- **Position of an absence is not defined.** `SourcePos` attaches to a node that exists; a
  missing section has none. The doc's findings always point at a present node, so "first
  heading" (or `{ line: 1 }` for an empty body) is a reasonable convention but unstated.
  - Proposed delta: document the fallback `pos` for absence-class findings — e.g. the first
    body heading, falling back to the document start when the body is empty.
  - Open question for human review: should an absent section point at the first heading, the
    document root (line 1), or the position where the section was *expected* in declared
    order? The third needs ordering context that `order: "none"` does not provide.
