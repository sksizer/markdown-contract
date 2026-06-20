> Example 07a for [[D-0014-markdown-structure-validation|D-0014]] — Frontmatter enum violation
>
> - extra key. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 07a · Frontmatter enum violation + extra key

## Capability

Builds on **07** (frontmatter-only contract — `contract({ frontmatter: ZodType })`). 07 validates
the frontmatter plane alone with a `.strict()` Zod object. This edge stresses two failures from that
same contract at once: a value outside an `z.enum(...)` and an undeclared key rejected by
`.strict()`. Both are Zod issues, but the contract must surface them as `Finding`s whose `pos.line`
points at the offending *frontmatter source line* — Zod's `issues[].path` (a key path into the
parsed data) remapped onto a `SourcePos` via `DocTree.frontmatter.pos`.

## Use case

A document class governed only by frontmatter — say a decision stub keyed by `id`, `status`, and
`title`, with `status` drawn from a closed enum and no stray keys allowed. An author sets
`status: open/draft` (a spelling not in the enum) and leaves a `foo: bar` key behind from an earlier
template. Each mistake must localize to its own line so the author can jump straight to it, rather
than to a single generic "frontmatter invalid" report at line 1.

## Sample document

```md
---
id: D-0099
status: open/proposed
title: Adopt the widget pipeline
---

## Context

Why the pipeline.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract } from "markdown-contract";

// Same strict frontmatter contract as Example 07 — frontmatter plane only.
const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
}).strict();

export const DecisionStubContract = contract({
  frontmatter: DecisionFrontmatter,
});
```

## Expected findings

**PASS** — the sample document above (valid `status`, no stray keys):

```jsonc
// DecisionStubContract.validate(source, { path: "docs/.../D-0099/README.md" })
{ "findings": [],
  "value": { "frontmatter": { "id": "D-0099", "status": "open/proposed",
                              "title": "Adopt the widget pipeline" },
             "body": {} } }
```

A consumer reads `doc.value.frontmatter.status` as the narrowed union type
`"open/proposed" | "open/accepted" | "closed/superseded"`, and the unknown-key door is closed —
no `frontmatter.foo` exists on the inferred type.

**FAIL** — mutate the frontmatter: bad enum value plus an undeclared `foo` key:

```md
---
id: D-0099
status: open/draft
title: Adopt the widget pipeline
foo: bar
---

## Context

Why the pipeline.
```

`status` (line 3) is outside the enum; `foo` (line 5) is rejected by `.strict()`. Both Zod issues
remap onto their frontmatter source line. Expected findings (ordered by `pos.line`):

```jsonc
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" },
  { "id": "frontmatter/unknown-key", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 5 },
    "message": "unrecognized key ‘foo’; frontmatter object is strict" }
]
```

## Gaps & questions

The contract surface is fully expressible: `contract({ frontmatter })` with a `.strict()`
`z.enum(...)` object is documented (§3, §5.1), and the two-finding example mirrors §5.3's
`frontmatter/enum` shape. The gap is in the *finding ids* and the *path-to-line remap*, both flagged
as open in proposed-shape.md but not pinned down enough to assert the FAIL output verbatim:

- **Finding-id namespace for frontmatter.** §5.3 shows `frontmatter/enum`, but no id is documented
  for a `.strict()` unknown-key rejection; this example invents `frontmatter/unknown-key`. The id
  string is load-bearing for consumers that branch on it.
- **`issues[].path` → `SourcePos.line` remap.** §7 (S7) lists exactly this as undecided: "how do Zod
  `issues[].path` entries remap onto the projection node's `line`?". `DocTree.frontmatter.pos` is a
  *single* `SourcePos` for the whole block (§2), so per-key line resolution (`status` → 3, `foo` →
  5) needs a key→line index the documented projection does not yet carry.

Smallest concrete delta closing both: (1) reserve a documented frontmatter id set —
`frontmatter/enum`, `frontmatter/unknown-key`, `frontmatter/type`, `frontmatter/required` — in the
finding-id table; (2) extend `DocTree.frontmatter` with `lineForPath(path: (string|number)[]):
number` (or a `keyLines: Record<string, number>` map) so the validator can remap each Zod
`issue.path` to its source line instead of collapsing to the block's start.

Open question for human review: should per-key frontmatter line mapping ship in v1, or is a
block-level `pos` (every frontmatter finding at the `---` opening line) acceptable for v1 with
per-key precision deferred? §5.3's `pos: { line: 5 }` for a single enum finding implies per-key
precision is the intended target.
