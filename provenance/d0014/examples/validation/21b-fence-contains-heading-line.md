> Example 21b for [[D-0014-markdown-structure-validation|D-0014]] — Code fence containing a ##
> line. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 21b · Code fence containing a ## line

## Capability

Builds on 21 (a third real entity / house-style doc). Stresses the **fence-awareness** of the
layer-1 projection: a line beginning `##` *inside* a fenced code block is body content, not a
heading. The projection derives from the mdast parse (proposed-shape.md §2), where a fenced block
is a single `code` node — its `value` is opaque text, never re-scanned for `#` headings. So the
in-fence `## Decision` must not produce a spurious `SectionNode`, and must raise no false
`structure/section-order` or `structure/duplicate-section` finding. This is exactly the
"`##` inside a fenced code block" edge §7 flags for spike S6.

## Use case

A real D-0014 example page — like this one — whose `## Sample document` section embeds a ` ```md `
fence showing a *sample* Decision body, including its own `## Decision` heading. The doc-class
contract recognizes the page's real H2s (`Capability`, `Use case`, `Sample document`, …). The
sample's `## Decision` is illustrative text, not a section of the page. The validator must treat the
fence body as opaque so the page validates against its own contract, undisturbed by the sample.

## Sample document

```md
## Capability

What this introduces.

## Sample document

​```md
## Decision

We will adopt the projection.
​```
```

(The inner fence is shown with a zero-width marker before its backticks so this outer fence stays
balanced; in a real file both are bare ` ``` `.)

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

// The example-page house style: a fixed pair of H2s, in declared order, no unknowns.
export const ExamplePageContract = contract({
  body: sections({ order: "strict", allowUnknown: false }, [
    section("Capability"),
    section("Sample document"),
  ]),
});
```

## Expected findings

**PASS** — the sample above. The ` ```md ` fence projects to one `code` BlockNode under the
`Sample document` section; its `value` (including the `## Decision` line) is never re-scanned for
headings. So `root.sections` holds exactly `[Capability, Sample document]`, matching the strict
contract. The in-fence `## Decision` contributes no `SectionNode`.

```jsonc
// ExamplePageContract.validate(source, { path: "docs/.../21b.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    // two SectionViews; the fence is a code BlockNode under sampleDocument.blocks, not a section
    "body": { "capability": {}, "sampleDocument": {} }
  }
}
```

A consumer sees no `decision` key: `doc.body.section("Decision")` is `undefined`, and
`doc.body.sampleDocument.text()` returns the fence's prose with the literal `## Decision` line
intact.

**FAIL (the bug this guards against)** — if the projection were *not* fence-aware and re-scanned the
fence body, it would mint a third top-level section `Decision` after `Sample document`. Against the
strict, no-unknown contract that surfaces as an unknown-section error (and, were the page to embed a
second sample, a spurious duplicate). The findings a fence-blind projection would wrongly emit:

```jsonc
// what a fence-BLIND projection would (wrongly) report
[
  { "id": "structure/unknown-section", "level": "error",
    "path": "docs/.../21b.md", "pos": { "line": 9 },
    "message": "unknown section ‘Decision’; not declared and unknowns are not permitted here" }
]
```

The correct, fence-aware behaviour is the PASS case: empty findings. This example asserts the
projection produces no such finding — the `## Decision` line is opaque fence content.

## Gaps & questions

The contract uses only documented API (`contract`, `sections`, `section`, `order: "strict"`,
`allowUnknown: false`). Fence-awareness is a property of the layer-1 projection, which §2 derives
from the mdast `code` node (opaque `value`), so the *expected* behaviour is documented. Two gaps:

- §7 (S6) explicitly defers "`##` inside a fenced code block" as an open projection edge — so the
  guarantee that the projection is fence-aware is **proposed but not yet committed**. Smallest
  delta: one sentence in §2 (Layer 1) stating that fenced `code` node values are never re-scanned
  for headings — promoting this from an S6 question to a projection invariant.
- The FAIL block names `structure/unknown-section`, an id implied by `allowUnknown:false` but not
  listed in §5.3 (only `section-missing`/`section-order`/`duplicate-section`/`anchor-missing`
  appear). The exact id and message for an unpermitted unknown section are unstated. Open question:
  is an unpermitted unknown its own id (`structure/unknown-section`) or folded into `section-order`?
