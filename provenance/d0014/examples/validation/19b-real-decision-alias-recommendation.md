> Example 19b for [[D-0014-markdown-structure-validation|D-0014]] — Decision body alias
> (Recommendation for Decision). Exercises the proposed API (proposed-shape.md);
> non-normative; where they disagree, that doc wins.

# 19b · Decision body alias (Recommendation for Decision)

## Capability

The variant that `oneOf` (06) plays on the *real* Decision contract (19): the required core section
is a single slot satisfied by any of four interchangeable spellings —
`oneOf(["Decision", "Recommendation", "Conclusion", "Resolution"])`. `body-schema.yaml` declares
these as `aliases: [Recommendation, Conclusion, Resolution]` on the required `Decision` section; the
contract collapses that legacy alias-table into one `oneOf` slot. This case stresses an
option-comparison Decision that names its core section `## Recommendation` rather than
`## Decision`, proving the alias satisfies the required slot — retiring the body validator's
alias-table scanner.

## Use case

A real, recommendation-style Decision: it weighs options, then states the chosen course under
`## Recommendation` instead of `## Decision`. The frontmatter carries the usual Decision fields; the
body leads with a `^summary`-anchored Summary, gives Context and Options considered, and lands the
core slot under its alias spelling. The contract must accept the alias as the required core section.

## Sample document

```md
---
id: D-0099
status: open/proposed
title: Adopt rumdl for markdown formatting
related: []
---

## Summary

- Adopt rumdl as the markdown formatter over the prettier plugin.

^summary

## Context

Two formatters were trialled across the docs corpus over one milestone.

## Options considered

### prettier-plugin-markdown

Familiar, but reflows wikilinks and breaks Obsidian transclusion.

### rumdl

Obsidian-safe; reflow-only diffs; configurable per repo.

## Recommendation

Adopt rumdl. It produces Obsidian-safe, reflow-only diffs and is configurable per repo.
```

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, maxWords,
} from "markdown-contract";

const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

export const DecisionContract = contract({
  frontmatter: DecisionFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
    optional(section("Context")),
    optional(section("Options considered", {
      children: sections({ order: "none", allowUnknown: true }, [ gap() ]),
    })),
    // The required core slot — four interchangeable spellings, one position.
    oneOf(["Decision", "Recommendation", "Conclusion", "Resolution"]),
    optional(section("Consequences")),
    optional(section("Notes")),
  ]),
});
```

The contract above also needs `gap` in the import list:

```ts
import {
  contract, sections, section, optional, oneOf, gap, maxWords,
} from "markdown-contract";
```

## Expected findings

PASS — the document conforms; `findings` is empty. `## Recommendation` fills the required `oneOf`
slot, so no `structure/section-missing` fires. The matched member resolves to one slot in the typed
model, keyed by the spelling the document used:

```jsonc
// DecisionContract.validate(source, { path }).value
{ "frontmatter": { "id": "D-0099", "status": "open/proposed",
                   "title": "Adopt rumdl for markdown formatting", "related": [] },
  "body": { "summary": {}, "context": {},
            "optionsConsidered": {}, "recommendation": {} } }
```

A consumer reaches the core slot by its present heading (`doc.body.recommendation` or
`doc.body["Recommendation"]`), or via `doc.body.section(name)` for dynamic access — the same slot a
`## Decision`-headed instance would expose as `doc.body.decision`.

FAIL — rename the core heading to a name outside the alias set. Here `## Verdict` matches no `oneOf`
member, so the required slot is unfilled:

```md
## Verdict

Adopt rumdl. It produces Obsidian-safe, reflow-only diffs and is configurable per repo.
```

```jsonc
// findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/planning/decisions/D-0099-adopt-rumdl/README.md", "pos": { "line": 9 },
    "message": "required section ‘Decision | Recommendation | Conclusion | Resolution’ is missing" }
]
```

Exactly one finding: the unfilled `oneOf` slot. `## Verdict` is admitted as an unknown section
(`allowUnknown: true`), contributing no finding of its own. The `pos.line` points at the Summary
heading — the start of the recognized body where the missing slot was expected; the prototype (S6)
confirms the exact anchor line for a missing-slot finding.

## Gaps & questions

None — expressible with the API as documented.
