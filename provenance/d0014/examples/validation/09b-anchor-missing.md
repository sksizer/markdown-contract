> Example 09b for [[D-0014-markdown-structure-validation|D-0014]] — Required ^anchor absent.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 09b · Required ^anchor absent

## Capability

The failure mode `anchor:` is designed to catch, isolated. Builds on step 09 (`section()` with a
content leaf + required anchor) by holding the content leaf valid and removing only the `^summary`
block-id. The contract still declares `anchor: "summary"`, so the projection finds no matching id in
`SectionNode.anchors` and emits `structure/anchor-missing` (error) — the §5.3 anchor case in
isolation, with no frontmatter or ordering noise to share the findings list.

## Use case

The same capped, citable abstract as 09: an `## Summary` that other documents transclude by its
`^summary` block-id. Here the author wrote a conforming, in-budget Summary but forgot the trailing
anchor — the single most common way a section becomes structurally valid yet un-addressable.

## Sample document

```md
## Summary

This decision adopts a generic TypeScript contract library for validating the
structure of our markdown documents. Frontmatter stays in Zod; section sequence
and nesting move to a combinator grammar; content leaves reuse Zod.
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

**PASS** — add the anchor back (the only difference from the sample above):

```md
## Summary

This decision adopts a generic TypeScript contract library for validating the
structure of our markdown documents. Frontmatter stays in Zod; section sequence
and nesting move to a combinator grammar; content leaves reuse Zod.
^summary
```

The `## Summary` heading projects to a `SectionNode` whose prose is ~45 words (≤ 120) and whose
`anchors` includes `"summary"`. Both knobs are satisfied; the findings list is empty.

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "summary": {} }   // SectionView; .anchors === ["summary"]
  }
}
```

**FAIL** — the sample document above, with no `^summary` block-id. The prose is unchanged and still
under budget, so the `maxWords(120)` leaf passes; only the missing anchor fires:

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 1 },
    "message": "Summary section is missing required block-id ^summary" }
]
```

`pos.line` points at the `## Summary` heading — the section the anchor requirement is attached to —
matching the §5.3 walkthrough, where the anchor-missing finding localizes to the section heading
rather than the absent block-id (which has no source position).

## Gaps & questions

None — expressible with the API as documented.
