> Example 17a for [[D-0014-markdown-structure-validation|D-0014]] — Node rule violation
> localizes to the node. Exercises the proposed API (proposed-shape.md); non-normative; where
> they disagree, that doc wins.

# 17a · Node rule violation localizes to the node

## Capability

The localization half of a node-local custom `rule()`. Builds on step 17
(`section({ rules: [...] })` attaching `rule(id, fn(node, ctx) => Finding[])` to one section). Step
17 showed the rule passing; here the same rule *fires*. The point under test: a custom finding is
positioned like a built-in. The rule fn receives the section's `SectionNode`, so it sets
`pos: node.pos` — the `## Summary` heading line — and picks its own `level`. This confirms `pos` is
carried by the rule, exactly the way `structure/*` findings localize to a heading (§5.3), with no
engine privilege for built-ins.

## Use case

A `## Summary` that house-style requires to name the document's primary artifact, detected by a
token the prose must contain (here, the word "contract"). The check is prose-shaped, not structural,
so it is a node-local `rule` rather than a leaf: a summary that omits the token is structurally fine
but fails the rule, and the author needs the finding pinned to the offending section's heading.

## Sample document

```md
## Summary

This decision adopts a generic TypeScript library for validating the structure
of our markdown documents, keeping frontmatter in Zod and moving section
sequence into a combinator grammar.
```

## Proposed contract

```ts
import { contract, sections, section, rule } from "markdown-contract";

export const SummaryContract = contract({
  body: sections({}, [
    section("Summary", {
      rules: [
        rule("summary/names-contract", (node) =>
          node.blocks.some((b) => b.kind === "paragraph" && b.text.includes("contract"))
            ? []
            : [{ id: "summary/names-contract", level: "warn", pos: node.pos,
                 message: "Summary should name the contract it introduces" }]),
      ],
    }),
  ]),
});
```

## Expected findings

**PASS** — add the token to the prose (the only difference from the sample above):

```md
## Summary

This decision adopts a generic TypeScript contract library for validating the
structure of our markdown documents, keeping frontmatter in Zod and moving
section sequence into a combinator grammar.
```

The `## Summary` heading projects to a `SectionNode` whose lone `paragraph` block's `text` contains
"contract", so the rule returns `[]` and the findings list is empty.

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "summary": {} }   // SectionView
  }
}
```

**FAIL** — the sample document above, whose prose omits the token. The section is structurally valid
(present, correctly named), so only the custom rule fires, at the `level` the rule chose (`warn`):

```jsonc
// SummaryContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "summary/names-contract", "level": "warn",
    "path": "docs/.../README.md", "pos": { "line": 1 },
    "message": "Summary should name the contract it introduces" }
]
```

`pos.line` is `1` — the `## Summary` heading the rule read from `node.pos` — not a frontmatter or
document-root line. The rule supplied `id`, `level`, `pos`, and `message`; the engine filled `path`
(document-scoped, §4). A custom node finding is thus indistinguishable in shape and localization
from a built-in `structure/*` finding, which is the whole claim of step 17a.

## Gaps & questions

None — expressible with the API as documented.
