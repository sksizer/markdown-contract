> Example 04a for [[D-0014-markdown-structure-validation|D-0014]] — Recognized sections out of
> declared order. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 04a · Recognized sections out of declared order

## Capability

Builds on 04 (`LevelOpts.order: "recognized-relative"`, `allowUnknown: true`). Stresses the failure
that ordering mode is meant to catch: two *recognized* sections appearing in the wrong relative
order. Per the ordering table (§3), `recognized-relative` requires recognized sections to keep their
declared relative order even while unknowns interleave freely. The variant exercised is the
`structure/section-order` finding (§5.3) fired by a recognized-out-of-order pair.

## Use case

A document class with a fixed canonical section order but tolerant of extra, unrecognized sections
anywhere. The author wrote a recognized heading too early — e.g. led with `Overview` before the
declared-first `Title`. The contract must flag the inversion of the two recognized sections; it must
*not* complain about any interleaved unknowns.

## Sample document

```md
## Overview

A note that arrived before its title.

## Title

D-XXXX — some decision.

## Status

open/proposed
```

## Proposed contract

```ts
import {
  contract, sections, section,
} from "markdown-contract";

// Same recognized-relative body as example 04: three recognized sections, unknowns may interleave.
export const OrderedContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Title"),
    section("Overview"),
    section("Status"),
  ]),
});
```

## Expected findings

**PASS** — recognized sections in declared relative order; an unknown interleaves freely.

```md
## Title

D-XXXX — some decision.

## Notes

An unrecognized section between recognized ones — fine under recognized-relative.

## Overview

A note.

## Status

open/proposed
```

```jsonc
// OrderedContract.validate(source, { path: "docs/.../sample.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {}, "status": {},
                       "unknown": [ /* Notes */ ] } } }
```

**FAIL** — the Sample document above: `Overview` (declared 2nd) precedes `Title` (declared 1st).

```jsonc
// OrderedContract.validate(source, { path: "docs/.../sample.md" }).findings
[
  { "id": "structure/section-order", "level": "error",
    "path": "docs/.../sample.md", "pos": { "line": 5 },
    "message": "‘Overview’ appears before ‘Title’; recognized sections must keep declared order" }
]
```

One finding, localized to the `Title` heading (line 5) — the recognized section found out of place
relative to the `Overview` that preceded it.

## Gaps & questions

None — expressible with the API as documented.
