> Example 17 for [[D-0014-markdown-structure-validation|D-0014]] — Node-level custom rule.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 17 · Node-level custom rule

## Capability

`section(name, { rules: [rule(id, fn(node, ctx))] })` — a **node-local custom rule**. `rule()`
(proposed-shape.md §3) takes an id and a function `(node: SectionNode, ctx) => Finding[]`; attached
via `SectionOpts.rules`, it runs against that one section's projected `SectionNode` and emits
findings the closed leaf vocabulary (`table`/`list`/`code`/`maxWords`) cannot express. Here: the
Summary section must mention the token `outcome` somewhere in its prose.

## Use case

A doc class whose Summary paragraph must state the decision's *outcome* — a content predicate that
is neither a word-count budget nor a structural shape, so it needs a custom per-node assertion
rather than a leaf. The rule reads the section's flattened text and checks for the required token.

## Sample document

```md
## Summary

This decision adopts a combinator grammar over flat schema lists. The outcome is a single
validation pass that localizes findings to source lines.
```

## Proposed contract

```ts
import {
  contract, sections, section, rule,
} from "markdown-contract";

// Flatten a section's paragraph blocks to one lowercased string.
const sectionText = (node) =>
  node.blocks
    .filter((b) => b.kind === "paragraph")
    .map((b) => b.text)
    .join(" ")
    .toLowerCase();

export const SummaryContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", {
      rules: [
        rule("summary/mentions-outcome", (node) =>
          sectionText(node).includes("outcome")
            ? []
            : [{
                id: "summary/mentions-outcome",
                level: "error",
                message: "Summary must mention the decision outcome",
                pos: node.pos,
              }]),
      ],
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample document above. The Summary text contains `outcome`, so the node rule returns
`[]`. `validate` yields:

```jsonc
{ "findings": [],
  "value": { "frontmatter": {}, "body": { "summary": {} } } }
```

A consumer reading the OOM gets `doc.body.summary.text()` → the prose, and
`doc.body.summary.pos` → the heading position.

**FAIL** — mutate the Summary so it never says `outcome`:

```md
## Summary

This decision adopts a combinator grammar over flat schema lists. It runs in a single
validation pass that localizes findings to source lines.
```

The node rule fires, carrying the section node's own `SourcePos` (the `## Summary` heading, line 1):

```jsonc
[
  { "id": "summary/mentions-outcome", "level": "error",
    "path": "docs/.../doc.md", "pos": { "line": 1 },
    "message": "Summary must mention the decision outcome" }
]
```

## Gaps & questions

None — expressible with the API as documented.
