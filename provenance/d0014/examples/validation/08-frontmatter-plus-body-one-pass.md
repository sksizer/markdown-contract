> Example 08 for [[D-0014-markdown-structure-validation|D-0014]] — Unified frontmatter + body
> in one pass. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 08 · Unified frontmatter + body in one pass

## Capability

This step introduces the *unified* contract: a single `contract({ frontmatter, body })` that carries
both a frontmatter Zod schema and a body `sections()` grammar. One `validate()` call parses both
planes in one pass and merges them into a single `Finding[]` and a single typed `value`. Step 07
exercised the frontmatter plane alone; this is the first step where both planes coexist in one
contract and one call. The 08a edge stresses the merge by failing both planes at once.

## Use case

A document class governed on both planes simultaneously: structured frontmatter (typed keys) *and* a
mandated body shape. Here a minimal decision-style note — frontmatter `id` / `status` / `title`,
plus a required `## Summary` and `## Context`. The author wants one command that checks the whole
document and returns one ordered list of problems, not one tool for the header and another for the
prose.

## Sample document

```md
---
id: D-0099
status: open/proposed
title: Adopt the markdown-contract engine
---

## Summary

Replace the bespoke body-schema scanners with a combinator grammar over a
positioned section tree.

## Context

The current validator hand-rolls heading extraction and frontmatter slicing in
several places, each with its own drift.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section } from "markdown-contract";

const Frontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
}).strict();

export const NoteContract = contract({
  frontmatter: Frontmatter,
  body: sections({ order: "none", allowUnknown: true }, [
    section("Summary"),
    section("Context"),
  ]),
});
```

## Expected findings

**PASS** — the sample document above. Frontmatter satisfies the Zod schema and both required
sections project, so the one-pass merge yields an empty `findings` and a value carrying both planes:

```jsonc
{ "findings": [],
  "value": {
    "frontmatter": { "id": "D-0099", "status": "open/proposed",
                     "title": "Adopt the markdown-contract engine" },
    "body": { "summary": {}, "context": {} }
  } }
```

```ts
const { findings, value } = NoteContract.validate(source, { path });
// findings.length === 0
value.frontmatter.status;      // "open/proposed" — typed by the enum
value.body.summary.text();     // "Replace the bespoke body-schema scanners …"
value.body["Context"].name;    // "Context" — exact-key access also resolves
```

**FAIL** — mutate one line on *each* plane: set `status: open/draft` (not in the enum) and drop the
`## Context` section. One `validate()` call returns both failures in a single list, ordered by `pos`
(frontmatter line precedes the body):

```jsonc
// NoteContract.validate(source, { path: "notes/note.md" }).findings
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "notes/note.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" },
  { "id": "structure/section-missing", "level": "error",
    "path": "notes/note.md", "pos": { "line": 1 },
    "message": "required section ‘Context’ is missing" }
]
```

Two findings from one pass — the single-pass merge of both planes is the whole point of this step.
(Frontmatter `pos.line` points at the offending key; the absent section anchors at the document
start. Exact lines are engine-defined; §5.3 of proposed-shape.md shows the same two-plane merge.)

## Gaps & questions

None — expressible with the API as documented.
