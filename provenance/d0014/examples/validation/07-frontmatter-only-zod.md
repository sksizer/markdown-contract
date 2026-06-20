> Example 07 for [[D-0014-markdown-structure-validation|D-0014]] — Frontmatter only (Zod).
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 07 · Frontmatter only (Zod)

## Capability

`contract({ frontmatter: ZodType })` — the frontmatter plane on its own, with no `body`. The YAML
frontmatter is parsed once and validated against a plain Zod `z.object(...).strict()`; the body is
unconstrained. This isolates the Zod leaf-validation half of the engine from the body grammar: all
of §3's `frontmatter?` slot, none of `body?`.

## Use case

A document class whose only rule is its metadata: the prose body is free-form, but the frontmatter
must carry a well-formed `id`, a `status` from a fixed set, and a non-empty `title`, and no stray
keys. Think the minimal stamp every entity file in this repo opens with, before any section grammar
is layered on.

## Sample document

```md
---
id: D-0014
status: open/proposed
title: Markdown structure validation
---

# Markdown structure validation

Free-form body. No section grammar applies, so any headings and prose are fine.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract } from "markdown-contract";

const Frontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
}).strict();

export const StampContract = contract({
  frontmatter: Frontmatter,
});
```

## Expected findings

**PASS** — the sample document above. The frontmatter parses to an object matching every field, and
`.strict()` finds no unknown keys. With no `body` declared, the body plane contributes nothing.

```jsonc
// StampContract.validate(source, { path: "docs/.../D-0014/README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": {
      "id": "D-0014",
      "status": "open/proposed",
      "title": "Markdown structure validation"
    },
    "body": {}   // no body grammar; nothing projected as required
  }
}
```

**FAIL** — mutate the frontmatter so `status` falls outside the enum (here `open/draft`):

```md
---
id: D-0014
status: open/draft
title: Markdown structure validation
---

# Markdown structure validation

Free-form body.
```

`status` no longer matches the enum; the other fields and `.strict()` still pass:

```jsonc
// StampContract.validate(source, { path: "docs/.../D-0014/README.md" }).findings
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" }
]
```

## Gaps & questions

None — expressible with the API as documented.
