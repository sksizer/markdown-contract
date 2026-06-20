> Example 08a for [[D-0014-markdown-structure-validation|D-0014]] — Both planes fail in one
> findings list. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 08a · Both planes fail in one findings list

## Capability

Edge case on **08** (unified frontmatter + body validated in one `validate()` call). Where 08
shows both planes passing, 08a stresses the **merge** path: one document fails *both* planes at
once — an invalid `status` enum in frontmatter and a missing required `## Context` in the body.
The single pass must return a `frontmatter/enum` finding *and* a `structure/section-missing`
finding in one `findings` array, ordered by `pos.line`. No new API surface — same contract as
08 — this is the cross-plane merge of §5.3 reduced to its two-finding core.

## Use case

A markdown class with two coupled planes: typed frontmatter (Zod) and a required body section.
The author ships a note whose `status` is outside the declared enum *and* whose body never
declares the mandatory `## Context` heading. A consumer wants one diagnostic list covering both
planes from a single call — not two passes it has to stitch together.

## Sample document

```md
---
id: D-0099
status: open/draft
title: Adopt the widget protocol
---

# Adopt the widget protocol

## Summary

We will adopt the widget protocol across all services.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section } from "markdown-contract";

// Unified contract — frontmatter (Zod) + body (grammar) validated in one pass.
const NoteFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
}).strict();

export const NoteContract = contract({
  frontmatter: NoteFrontmatter,
  body: sections({ order: "none", allowUnknown: true }, [
    section("Summary"),
    section("Context"),
  ]),
});
```

## Expected findings

**PASS** — a document satisfying both planes (`status` in enum, `## Context` present):

```md
---
id: D-0099
status: open/proposed
title: Adopt the widget protocol
---

# Adopt the widget protocol

## Summary

We will adopt the widget protocol across all services.

## Context

The protocol unifies inter-service messaging.
```

```ts
const { findings, value } = NoteContract.validate(source, { path });
// findings === []
// value === {
//   frontmatter: { id: "D-0099", status: "open/proposed", title: "Adopt the widget protocol" },
//   body: { summary: { /* SectionView */ }, context: { /* SectionView */ } },
// }
```

A consumer reads both planes off the one typed value:

```ts
value.frontmatter.status;            // "open/proposed"  (narrowed enum)
value.body.context.text();           // "The protocol unifies inter-service messaging."
```

**FAIL** — the sample document above (`status: open/draft` invalid; `## Context` absent):

```ts
NoteContract.validate(source, { path: "notes/widget-protocol.md" }).findings;
```

```jsonc
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "notes/widget-protocol.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" },
  { "id": "structure/section-missing", "level": "error",
    "path": "notes/widget-protocol.md", "pos": { "line": 9 },
    "message": "required section ‘Context’ is absent" }
]
```

Two findings from one `validate()` call — one per plane — ordered by `pos.line` (frontmatter
line 3 before body line 9), exactly as §5.3 demonstrates. The frontmatter finding localizes to
the offending `status:` line; the body finding localizes to the first body heading (`## Summary`,
line 9), the nearest concrete source location for an absent section.

## Gaps & questions

The contract and OOM access use only documented API; the merge-into-one-list behaviour is the
explicit subject of §4 and §5.3. The same two under-specified points from the single-plane edges
recur — under-specified by proposed-shape.md, not contradicted:

- **`structure/section-missing` finding id is not enumerated.** The doc names
  `structure/section-order`, `structure/anchor-missing`, and `structure/duplicate-section`; the
  §5.3 walkthrough exercises a missing *anchor* but not a missing *required section*. The id is
  consistent with the `structure/*` namespace but inferred.
  - Proposed delta: add one row to a finding-id registry pinning `structure/section-missing`
    (level `error`) as the canonical id for an absent required section.
- **Ordering key for merged findings is implied, not stated.** §5.3 shows findings sorted by
  ascending `pos.line`, but §4 only says the pass "merges everything into one `Finding[]`"
  without naming the sort. Whether the merged list is line-sorted, plane-grouped, or
  declaration-ordered is left open.
  - Proposed delta: document the merge order — e.g. "findings are returned sorted by ascending
    `pos.line`, frontmatter before body on ties".
  - Open question for human review: should ties (two findings on the same line) break by plane
    (frontmatter first) or by emission order, and is the sort guaranteed stable across runs?
