> Example 03a for [[D-0014-markdown-structure-validation|D-0014]] — Duplicate section heading.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 03a · Duplicate section heading

## Capability

Builds on 03 (optional sections). Stresses the `structure/duplicate-section` finding: when two
sibling sections share the same heading text, the second one is an error. A document is not
expected to repeat a heading — that is what keeps the generated OOM keys (`doc.body.overview`)
unambiguous by construction (proposed-shape.md §6, "Dual access").

## Use case

A short note with a required `Title` and an optional `Overview`. An author accidentally writes
`## Overview` twice. The contract is the same one from 03; the only change is the document, which
now repeats a heading. The validator must reject the repeat rather than silently pick one.

## Sample document

```md
## Title
## Overview
## Overview
```

## Proposed contract

```ts
import { contract, sections, section, optional } from "markdown-contract";

// Same contract as 03: a required section and an optional one.
export const NoteContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Title"),
    optional(section("Overview")),
  ]),
});
```

## Expected findings

PASS — `## Title` then a single `## Overview`:

```jsonc
// NoteContract.validate(source, { path: "note.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {} } } }
```

A consumer reads each section by either key: `doc.body.overview` and `doc.body["Overview"]`
resolve to the same `SectionView`; the dual key is well-defined because the heading appears once.

FAIL — the sample document above, where `## Overview` appears on lines 2 and 3:

```jsonc
// NoteContract.validate(source, { path: "note.md" }).findings
[
  { "id": "structure/duplicate-section", "level": "error",
    "path": "note.md", "pos": { "line": 3 },
    "message": "duplicate section ‘Overview’; a heading must not repeat at one level" }
]
```

The finding localizes to line 3 (the second occurrence); the first `## Overview` is the binding
one. No `value` is returned alongside an error-level finding, so the ambiguous `overview` key is
never generated.

## Gaps & questions

The `structure/duplicate-section` finding id is named in proposed-shape.md §6, and `SourcePos`
carries the line, so the finding shape is expressible. Two details are under-specified:

- The exact `message` string is invented; the doc names only the id and level.
- Which occurrence carries the `pos` (first vs second) is not stated. This example assumes the
  second — the offending repeat — but the doc does not commit. Smallest delta: one sentence in
  §6 fixing duplicate-section `pos` to the second (later) heading. Open question for human
  review: should the *first* occurrence instead carry the finding, or should both?
