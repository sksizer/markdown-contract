> Example 19 for [[D-0014-markdown-structure-validation|D-0014]] — Real Decision contract
> end-to-end. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 19 · Real Decision contract end-to-end

## Capability

No single new combinator — this is the integration step. It composes every feature introduced so
far on one real document class: a Zod frontmatter plane, a `recognized-relative` body, a nested
`children` subsequence, an anchored `table` content leaf, and a `maxWords` leaf. The contract is
the §5.1 `DecisionContract` run against a real SDLC Decision README. The claim under test: a
well-formed Decision validates with **zero findings across both planes** in one `validate` call.

## Use case

An SDLC Decision README (an ADR). Frontmatter carries `id` (`D-####`), a lifecycle `status` enum,
and `title`. The body is a `recognized-relative` sequence: required `Summary` (anchored `^summary`,
word-budgeted), `Context`, `Decision` (with a nested `Components` table subsection), then a tail of
optional sections (`Why`, `Options considered`, `Consequences`, `Out of scope`, `Notes`). This
mirrors `decision/body-schema.yaml`. The contract gates that the whole document is well-formed in
one pass, so a consumer can read a typed Decision model with confidence.

## Sample document

```md
---
id: D-0042
status: open/accepted
title: Adopt the projection layer as the validator substrate
related: []
---
# Adopt the projection layer as the validator substrate

## Summary

- The position-carrying section tree (projection) is the one substrate both the
  grammar and the Zod leaves read, so findings localize to a source line.

^summary

## Context

Raw mdast is flat siblings with inline-subtree cells — hostile for direct rule
authoring. We need a stable intermediate form.

## Decision

We adopt a single projection pass between mdast and the typed model.

### Components

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | projection | one parse → positioned section tree |

## Consequences

Rules read the projection, not mdast; positions survive into findings.
```

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, gap, table, maxWords,
} from "markdown-contract";

// Per-type Zod (mirrors decision/schema.ts; inlined and abbreviated for the example).
const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded", "closed/deprecated"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

export const DecisionContract = contract({
  frontmatter: DecisionFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
    section("Context"),
    section("Decision", {
      children: sections({ order: "strict", allowUnknown: true }, [
        section("Components", {
          content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
        }),
      ]),
    }),
    optional(section("Why")),
    optional(section("Options considered", {
      children: sections({ order: "none", allowUnknown: true }, [gap()]),
    })),
    optional(section("Consequences")),
    optional(section("Out of scope")),
    optional(section("Notes")),
  ]),
});
```

## Expected findings

### PASS

The sample document conforms on both planes: frontmatter parses, every required section is present
in declared relative order, `Summary` carries `^summary` and is under 120 words, the nested
`Components` table has its three columns and one data row, and the optional `Consequences` tail is
recognized.

```jsonc
// DecisionContract.validate(source, { path: "docs/.../D-0042/README.md" })
{ "findings": [],
  "value": {
    "frontmatter": { "id": "D-0042", "status": "open/accepted",
                     "title": "Adopt the projection layer as the validator substrate", "related": [] },
    "body": {
      "summary": { /* SectionView */ },
      "context": { /* SectionView */ },
      "decision": { "components": { /* TableView<{ "#": string; Component: string; Resolution: string }> */ } },
      "consequences": { /* SectionView */ }
    }
  } }
```

A consumer reads the typed model: `doc.body.decision.components.rowCount === 1`;
`doc.body.decision.components.column("Component") === ["projection"]`;
`doc.body.summary.anchors.includes("summary") === true`.

### FAIL

Mutate three things at once: frontmatter `status: open/draft` (not in the enum), drop the
`^summary` block-id, and move `## Consequences` above `## Context` (recognized sections out of
declared relative order). One `validate` call merges all three, ordered by `pos.line`:

```jsonc
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../D-0042/README.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded | closed/deprecated" },
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../D-0042/README.md", "pos": { "line": 8 },
    "message": "Summary section is missing required block-id ^summary" },
  { "id": "structure/section-order", "level": "error",
    "path": "docs/.../D-0042/README.md", "pos": { "line": 14 },
    "message": "‘Consequences’ appears before ‘Context’; recognized sections must keep declared order" }
]
```

This is the §5.3 failure trio on a real document (the dedicated edge is 19a); here it confirms the
PASS case is non-trivial — each plane has a live check that the conforming document satisfies.

## Gaps & questions

None — expressible with the API as documented.
