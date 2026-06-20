> Example 01 for [[D-0014-markdown-structure-validation|D-0014]] — Single required section.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 01 · Single required section

## Capability

The base case: `contract({ body: sections([...]) })` with one required `section(name)`. A declared
required section resolves against a projected `SectionNode` by exact, case-sensitive heading text.
No ordering, nesting, content leaves, or frontmatter — just "this one H2 must be present."

## Use case

The smallest possible structural contract: a document class that mandates a single named section.
Think a note template whose only rule is "must have an `## Overview`." Anything else is allowed.

## Sample document

```md
## Overview

This document records the rollout plan for the cache layer. It covers scope,
sequencing, and the rollback path in plain prose.
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

export const OverviewContract = contract({
  body: sections({}, [
    section("Overview"),
  ]),
});
```

## Expected findings

**PASS** — the sample document above. The `## Overview` heading projects to a `SectionNode` whose
`name` is exactly `"Overview"`, satisfying the required spec.

```jsonc
// OverviewContract.validate(source, { path: "notes/rollout.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "overview": {} }   // SectionView, keyed by the declared name (camelCase)
  }
}
```

**FAIL** — mutate the heading text so the required section is absent (here, rename the only H2):

```md
## Summary

This document records the rollout plan for the cache layer. It covers scope,
sequencing, and the rollback path in plain prose.
```

`"Overview"` no longer resolves (`"Summary"` is an unknown section, admitted by the default
`allowUnknown: true`), so the required spec is unsatisfied:

```jsonc
// OverviewContract.validate(source, { path: "notes/rollout.md" }).findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "notes/rollout.md", "pos": { "line": 1 },
    "message": "required section ‘Overview’ is missing" }
]
```

## Gaps & questions

None — expressible with the API as documented.
