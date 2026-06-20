> Example 04 for [[D-0014-markdown-structure-validation|D-0014]] — Ordering:
> recognized-relative. Exercises the proposed API (proposed-shape.md); non-normative; where
> they disagree, that doc wins.

# 04 · Ordering: recognized-relative

## Capability

`LevelOpts.order: "recognized-relative"` with `allowUnknown: true`. Recognized sections must keep
their declared *relative* order; unknown sections interleave freely via an implicit `gap()` between
every position (§3 ordering table). Builds on step 01 (a level of required `section()` specs) by
adding the order knob — the first step where section sequence, not just presence, is checked.

## Use case

A document class with a few backbone sections that must stay in a fixed relative order, but where
authors are free to add their own extra sections anywhere between them. A README or note where
`Title → Overview → Status` always reads in that order, yet an interleaved `Extra` aside is fine.

## Sample document

```md
## Title

A short heading section.

## Extra

An author-added aside the contract never names.

## Overview

What this document covers.

## Status

open
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

export const NoteContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Title"),
    section("Overview"),
    section("Status"),
  ]),
});
```

## Expected findings

PASS — the sample above. `Title, Extra, Overview, Status`: the three recognized sections appear in
declared relative order; `Extra` lands in an implicit gap. Empty findings; the OOM value a consumer
reads:

```jsonc
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {}, "status": {},
                       "unknown": [ { "name": "Extra" } ] } } }
```

`doc.body.title`, `doc.body.overview`, `doc.body.status` resolve to `SectionView`s; the unnamed
`Extra` is reached via `doc.body.unknown[0]` (admitted by `allowUnknown`).

FAIL — swap the recognized sections out of relative order: `Overview, Extra, Title, Status`
(`Overview` now precedes `Title`). `Extra` is still fine, but the recognized pair is reversed:

```jsonc
[
  { "id": "structure/section-order", "level": "error",
    "path": "docs/note.md", "pos": { "line": 5 },
    "message": "‘Overview’ appears before ‘Title’; recognized sections must keep declared order" }
]
```

(`pos.line` is the offending `Overview` heading; one finding for the inverted pair.)

## Gaps & questions

None — expressible with the API as documented.
