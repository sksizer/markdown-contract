> Example 05a for [[D-0014-markdown-structure-validation|D-0014]] — Unknown inside the strict
> prefix. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 05a · Unknown inside the strict prefix

## Capability

Builds on **05** (strict order + `gap()` tail). 05 locks a contiguous prefix in declared order with
`order: "strict", allowUnknown: false`, then opens a tail with `gap()`. This edge stresses the
failure mode: an unknown section landing *inside* the strict prefix, before the `gap()` position.
With `allowUnknown: false` no unknown is admitted before the gap, so the contract must emit a
`structure/section-order` error on the intruding section rather than silently absorbing it.

## Use case

A document class with a definitive opening sequence — `Title`, then `Overview`, then `Status` —
followed by an open tail of author-chosen extras. An author drops an unsanctioned `Risks` heading
between `Title` and `Overview`, inside the locked region. The strict prefix is violated: extras are
only legal once the `gap()` window opens.

## Sample document

```md
## Title

The widget pipeline.

## Overview

What the pipeline does and why.

## Status

Shipped.
```

## Proposed contract

```ts
import {
  contract, sections, section, optional, gap,
} from "markdown-contract";

// Same contract as Example 05: a strict, contiguous prefix, then a gap()-opened tail.
export const StrictPrefixContract = contract({
  body: sections({ order: "strict", allowUnknown: false }, [
    section("Title"),
    section("Overview"),
    section("Status"),
    gap(),                       // ← unknown/extra sections permitted only from here onward
    optional(section("Appendix")),
  ]),
});
```

## Expected findings

**PASS** — the sample document above, sections `[Title, Overview, Status]`:

```jsonc
// StrictPrefixContract.validate(source, { path: "docs/.../sample.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {}, "status": {}, "unknown": [] } } }
```

A consumer reads the locked prefix by its generated keys — `doc.body.title`, `doc.body.overview`,
`doc.body.status` — and finds `doc.body.unknown` empty (no gap-admitted extras).

**FAIL** — mutate the document so an unknown `Risks` heading sits inside the strict prefix:

```md
## Title

The widget pipeline.

## Risks

Things that could go wrong.

## Overview

What the pipeline does and why.

## Status

Shipped.
```

Sections are now `[Title, Risks, Overview, Status]`. `Risks` is unknown and falls before the
`gap()` position, where `allowUnknown: false` forbids unknowns. Expected findings:

```jsonc
[
  { "id": "structure/section-order", "level": "error",
    "path": "docs/.../sample.md", "pos": { "line": 5 },
    "message": "unexpected section ‘Risks’ in the strict prefix; extras are only permitted after the gap" }
]
```

## Gaps & questions

None — expressible with the API as documented.
