> Example 14 for [[D-0014-markdown-structure-validation|D-0014]] — Nested children
> (subsections). Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 14 · Nested children (subsections)

## Capability

`section(name, { children: sections(...) })` — the `children` knob in `SectionOpts`
(proposed-shape.md §3). It nests a full body grammar one level down: the H3 subsections under an H2
are projected as that section's `sections[]` by heading depth (layer 1, `SectionNode.sections`), and
the child `sections(...)` grammar runs over them with its own `LevelOpts`. The recursion is the same
combinator used at the top level, so ordering, unknowns, and leaves all apply unchanged inside.

## Use case

A document class whose top-level section has a fixed internal layout. Here a `Decision` section must
contain, in order, a `Components` subsection then a `Resolution` subsection — the kind of structured
body a decision record uses to separate "what changed" from "what we settled on". The outer level is
loose; the inner level is strict.

## Sample document

```md
## Decision

We split the engine from the SDLC integration.

### Components

The generic `markdown-contract` package and the per-entity `contract.ts`.

### Resolution

Ship the engine standalone; SDLC consumes it as data.
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

export const NestedContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Decision", {
      children: sections({ order: "strict", allowUnknown: true }, [
        section("Components"),
        section("Resolution"),
      ]),
    }),
  ]),
});
```

## Expected findings

PASS — the sample document above. The two H3s nest under `## Decision` by depth, and the child
grammar matches `[Components, Resolution]` in strict order.

```jsonc
// NestedContract.validate(source, { path: "decision.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "decision": { /* SectionView; .sections = { components, resolution } */ } } } }
```

A consumer walks into the nested subsections off the parent `SectionView.sections` (dual-key access,
proposed-shape.md §6 "SectionView"):

```ts
const doc = NestedContract.read(source, { path: "decision.md" });
doc.body.decision.sections.components.text();   // "The generic markdown-contract package…"
doc.body.decision.sections["Resolution"].text(); // exact-heading key, same SectionView
```

FAIL — swap the two H3s so the body is `### Resolution` then `### Components`. The child grammar is
`order: "strict"`, so the recognized subsections are out of declared order.

```jsonc
[
  { "id": "structure/section-order", "level": "error",
    "path": "decision.md", "pos": { "line": 5 },
    "message": "‘Resolution’ appears before ‘Components’; recognized sections must keep declared order" }
]
```

## Gaps & questions

None — expressible with the API as documented.
