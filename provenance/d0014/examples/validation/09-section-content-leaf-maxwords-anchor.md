> Example 09 for [[D-0014-markdown-structure-validation|D-0014]] — Section content leaf:
> maxWords + required anchor. Exercises the proposed API (proposed-shape.md); non-normative;
> where they disagree, that doc wins.

# 09 · Section content leaf: maxWords + required anchor

## Capability

Two new `SectionOpts` knobs on a single `section()`: a **content leaf** and a **required anchor**.
`content: maxWords(120)` compiles to a Zod schema over the section's projected prose — a word-budget
assertion on a leaf, the simplest of the `leaves.ts` helpers. `anchor: "summary"` requires the
section to carry a `^summary` block-id (projected onto `SectionNode.anchors`). Together they pin
both *how much* a section may say and *that it is addressable* — beyond mere presence (steps 01–08).

## Use case

A document class whose lead section is a capped, citable abstract: an `## Summary` that must stay
under a word budget and end in a stable `^summary` anchor so other documents can transclude it.
Decision and RFC families want exactly this — a short, linkable précis at the top.

## Sample document

```md
## Summary

This decision adopts a generic TypeScript contract library for validating the
structure of our markdown documents. Frontmatter stays in Zod; section sequence
and nesting move to a combinator grammar; content leaves reuse Zod. The engine is
SDLC-agnostic and consumed as data per entity type.
^summary
```

## Proposed contract

```ts
import { contract, sections, section, maxWords } from "markdown-contract";

export const SummaryContract = contract({
  body: sections({}, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. The `## Summary` heading projects to a `SectionNode` named `"Summary"`
whose prose is ~55 words (≤ 120) and whose `anchors` includes `"summary"`. Both the content leaf and
the anchor requirement are satisfied.

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "summary": {} }   // SectionView; .text() prose, .anchors === ["summary"]
  }
}
```

**FAIL** — mutate the document so the anchor is dropped (the prose still fits the budget):

```md
## Summary

This decision adopts a generic TypeScript contract library for validating the
structure of our markdown documents. Frontmatter stays in Zod; section sequence
and nesting move to a combinator grammar; content leaves reuse Zod. The engine is
SDLC-agnostic and consumed as data per entity type.
```

`"summary"` is no longer in the section's `anchors`, so the `anchor: "summary"` requirement is
unmet. The content leaf still passes (prose is under budget), so only the anchor finding fires:

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 1 },
    "message": "Summary section is missing required block-id ^summary" }
]
```

## Gaps & questions

None — expressible with the API as documented.
