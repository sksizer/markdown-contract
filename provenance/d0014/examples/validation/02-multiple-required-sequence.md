> Example 02 for [[D-0014-markdown-structure-validation|D-0014]] — Multiple required sections.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc wins.

# 02 · Multiple required sections

## Capability

A `sections()` level can hold a *sequence* of several `section(name)` specs, each required by
default. This step introduces the multi-spec level: presence is checked per section, independently,
with no ordering constraint (`order: "none"`, the default). It builds on step 01's single required
section by repeating `section()` three times in one level.

## Use case

A document class that mandates a fixed set of top-level headings — here a minimal note with a
title, an overview, and a status line — but does not care in what order an author writes them.
Only "all three are present" matters.

## Sample document

```md
## Title

Adopt the markdown-contract engine.

## Overview

A generic combinator grammar over a positioned section tree.

## Status

Proposed.
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

export const NoteContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Title"),
    section("Overview"),
    section("Status"),
  ]),
});
```

## Expected findings

**PASS** — the sample document above declares all three required sections, so `findings` is empty.
The typed OOM value a consumer reads:

```jsonc
{ "findings": [],
  "value": { "body": { "title": {}, "overview": {}, "status": {} } } }
```

```ts
const { findings, value } = NoteContract.validate(source, { path });
// findings.length === 0
value.body.title.text();     // "Adopt the markdown-contract engine."
value.body.overview.name;    // "Overview"
value.body["Status"].text(); // "Proposed."  — exact-key access also resolves
```

**FAIL** — drop the `## Overview` section (and its prose), leaving only `## Title` and `## Status`.
Order is unconstrained, so the two present sections still pass; only the absent one is flagged:

```jsonc
// NoteContract.validate(source, { path }).findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "note.md", "pos": { "line": 1 },
    "message": "required section ‘Overview’ is missing" }
]
```

One finding, not three: `Title` and `Status` are present regardless of order, isolating the
multi-section presence check from any ordering concern. (`pos` localizes to the document start,
the natural anchor for an absent section — exact line is engine-defined.)

## Gaps & questions

None — expressible with the API as documented.
