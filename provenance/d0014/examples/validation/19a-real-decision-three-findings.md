> Example 19a for [[D-0014-markdown-structure-validation|D-0014]] — Real Decision with the
> §5.3 failure trio. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 19a · Real Decision with the §5.3 failure trio

## Capability

Edge case on **19** (the full Decision contract end-to-end). Where 19 validates a conforming
real Decision, 19a stresses the **combined-failure merge** that §5.3 walks through verbatim:
one real Decision document trips three independent assertions across both planes in a single
`validate()` pass —

- `frontmatter/enum` — `status: open/draft` is outside the declared status enum,
- `structure/anchor-missing` — `## Summary` carries no required `^summary` block-id,
- `structure/section-order` — `## Why` appears before `## Decision`, breaking
  `recognized-relative` order.

No new API surface — the same `DecisionContract` as 19 (mirroring §5.1). 19a is the §5.3
walkthrough grounded on a real Decision instance and held to *exactly* its three findings.

## Use case

A real SDLC Decision (the `docs/planning/decisions/` family) authored slightly wrong: the author
typed a status spelling that does not exist (`open/draft` rather than `open/proposed`), forgot the
`^summary` block-id the Summary section must anchor, and dragged the rationale (`## Why`) above the
`## Decision` it explains. A consumer wants one diagnostic list naming all three — frontmatter
plane and body plane together — from a single pass, the way `validate` is specified in §4.

## Sample document

```md
---
id: D-0099
status: open/draft
title: Adopt the widget protocol
related: []
---

# Adopt the widget protocol

## Summary

We will standardise inter-service messaging on the widget protocol.

## Context

Services hand-roll three incompatible message envelopes today.

## Why

A single envelope removes the per-pair translation shims.

## Decision

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | Envelope  | widget v2  |

^components

## Notes

Rollout tracked in the messaging milestone.
```

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, gap, table, maxWords,
} from "markdown-contract";

// Frontmatter Zod — the per-type schema that lives in schema.ts (inlined here, per §5.1).
const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

// Identical to the §5.1 / Example 19 DecisionContract — reused unchanged.
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

**PASS** — a conforming Decision: `status` in the enum, `## Summary` anchored with `^summary`,
`## Why` after `## Decision`. Same body sections in declared relative order:
`[Summary, Context, Decision, Why, Notes]`.

```ts
const { findings, value } = DecisionContract.validate(source, { path });
// findings === []
// value === {
//   frontmatter: { id: "D-0099", status: "open/proposed",
//                  title: "Adopt the widget protocol", related: [] },
//   body: {
//     summary: { /* SectionView, anchors: ["summary"] */ },
//     context: { /* SectionView */ },
//     decision: { components: { /* TableView<{ "#"; Component; Resolution }> */ } },
//     why: { /* SectionView */ },
//   },
// }
```

A consumer reads both planes off the one typed value:

```ts
value.frontmatter.status;                 // "open/proposed"  (narrowed enum)
value.body.summary.anchors;               // ["summary"]
value.body.decision.components.rowCount;  // 1
```

**FAIL** — the sample document above (`status: open/draft`; no `^summary`; `## Why` before
`## Decision`):

```ts
DecisionContract.validate(source, { path: "docs/.../D-0099/README.md" }).findings;
```

```jsonc
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../D-0099/README.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" },
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../D-0099/README.md", "pos": { "line": 10 },
    "message": "Summary section is missing required block-id ^summary" },
  { "id": "structure/section-order", "level": "error",
    "path": "docs/.../D-0099/README.md", "pos": { "line": 18 },
    "message": "‘Why’ appears before ‘Decision’; recognized sections must keep declared order" }
]
```

Exactly the §5.3 trio, from one `validate()` call, ordered by ascending `pos.line`: the frontmatter
`status:` line (3), the `## Summary` heading whose anchor is absent (10), then the misplaced
`## Why` heading (18). One finding per defect, none spurious — `## Context`, the `## Decision`
table, and `## Notes` all satisfy the contract, so no further findings appear.

## Gaps & questions

The contract is verbatim §5.1 / Example 19 and the failure list is the §5.3 walkthrough applied to a
real Decision, so the case is expressible. The same under-specified points carried by the §5.3
edges (08a, 09b, 04a) recur — under-specified by proposed-shape.md, not contradicted:

- **Merged-list ordering is shown, not specified.** §5.3 (and this trio) returns findings sorted by
  ascending `pos.line`, but §4 only says the pass "merges everything into one `Finding[]`" without
  naming the sort key.
  - Proposed delta: document the merge order — e.g. "findings are returned sorted by ascending
    `pos.line`, frontmatter before body on ties".
  - Open question for human review: do same-line ties break by plane (frontmatter first) or by
    emission order, and is the sort guaranteed stable across runs?
- **`pos.line` for `structure/section-order` is the offending heading, but which one is unstated.**
  §5.3 localises the order finding to the *earlier-than-allowed* section (`## Why`, line 18 here),
  not to the section it jumped ahead of (`## Decision`). The doc shows the value without stating the
  rule.
  - Proposed delta: pin in a finding-id registry that `structure/section-order` localizes to the
    out-of-order recognized section's own heading position.
  - Open question for human review: when several recognized sections are jointly out of order,
    is one finding emitted per displaced section, or a single finding for the first inversion?

```text
