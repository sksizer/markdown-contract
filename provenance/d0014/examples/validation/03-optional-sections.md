> Example 03 for [[D-0014-markdown-structure-validation|D-0014]] — Optional sections.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 03 · Optional sections

## Capability

`optional(section(...))` — sugar for `{ optional: true }` (§3). An optional section is valid whether
present or absent, contributing no finding either way. Builds on 02 (multiple required sections) by
mixing a non-required spec into the same level.

## Use case

A simple note document with two mandatory sections — a title and an overview — and a trailing
`Notes` section the author may or may not include. Both shapes are conforming.

## Sample document

```md
## Title

A short note on caching.

## Overview

We cache responses for 60s to cut load.

## Notes

Revisit the TTL after the next traffic spike.
```

A second instance omits `Notes` entirely:

```md
## Title

A short note on caching.

## Overview

We cache responses for 60s to cut load.
```

## Proposed contract

```ts
import { contract, sections, section, optional } from "markdown-contract";

export const NoteContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Title"),
    section("Overview"),
    optional(section("Notes")),
  ]),
});
```

## Expected findings

PASS — both documents conform; `findings` is empty for each. The optional section is reflected in
the typed model as a present-or-undefined view:

```jsonc
// with-Notes doc:  NoteContract.validate(source, { path }).value
{ "body": { "title": {}, "overview": {}, "notes": {} } }

// without-Notes doc: notes is simply absent
{ "body": { "title": {}, "overview": {} } }
```

A consumer reads it as `doc.body.notes?` (a `SectionView | undefined`), so absence is a normal,
finding-free state — not an error.

FAIL — drop a *required* section instead. Removing `## Overview` (keeping `## Title` only,
no `Notes`) violates the required spec; the optional `Notes` still contributes nothing:

```md
## Title

A short note on caching.
```

```jsonc
// findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/notes/cache.md", "pos": { "line": 1 },
    "message": "required section ‘Overview’ is missing" }
]
```

Exactly one finding: the missing required `Overview`. No finding is emitted for the absent
optional `Notes`, which is the property under test.

## Gaps & questions

None — expressible with the API as documented.
