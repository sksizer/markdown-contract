> Example 02a for [[D-0014-markdown-structure-validation|D-0014]] — One of several required
> missing. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 02a · One of several required missing

## Capability

Edge case branching from 02 (multiple required sections). Stresses that
`section-missing` findings are **per-section**, not all-or-nothing: when one of
several required `section()` specs is absent, the contract emits exactly one
`structure/section-missing` for that section and none for the ones present.

## Use case

A document class that requires three top-level H2s — `Title`, `Overview`,
`Status`. An author drafts the doc but forgets the middle section. Validation
should pinpoint only the missing one, not penalize the two that are present.

## Sample document

```md
## Title

A short working title for the note.

## Status

open/draft
```

`Title` and `Status` are present; `Overview` is omitted.

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

export const ThreeSectionContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Title"),
    section("Overview"),
    section("Status"),
  ]),
});
```

## Expected findings

**PASS** — all three sections present:

```md
## Title

A short working title.

## Overview

What this note is about.

## Status

open/draft
```

```jsonc
// ThreeSectionContract.validate(source, { path: "docs/note.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {}, "status": {} } } }
```

A consumer reads typed views: `doc.body.title`, `doc.body.overview`,
`doc.body.status` — each a `SectionView`.

**FAIL** — the sample document above, with `Overview` omitted:

```jsonc
// ThreeSectionContract.validate(source, { path: "docs/note.md" }).findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/note.md", "pos": { "line": 1 },
    "message": "required section ‘Overview’ is missing" }
]
```

Exactly one finding. `Title` (line 1) and `Status` (line 5) are present and
emit nothing — the absence is scoped to the one unmatched spec.

## Gaps & questions

The `pos` for a missing section is the open question. There is no offending
node — the section does not exist — so the proposed `SourcePos` has no natural
line to point at. The §5.3 walkthrough localizes findings to a node's
position, but a `section-missing` finding has none. The contract is otherwise
fully expressible with the documented API; only the position semantics are
under-specified.

- Gap: `Finding.pos` is required (`SourcePos`, not optional) but a
  `structure/section-missing` finding has no offending node to position.
- Question: where should a missing-section finding point — document line 1, the
  end of the body, or should `pos` become optional for absence-class findings?
