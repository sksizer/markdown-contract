> Example 06 for [[D-0014-markdown-structure-validation|D-0014]] — Alias sets via oneOf.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 06 · Alias sets via oneOf

## Capability

`oneOf(names, opts?)` — a single required slot satisfied by any one of several interchangeable
heading spellings (§3). It is the structural answer to "the same section, spelled two ways across a
corpus": one declared slot, N admissible names. Required by default (no `optional:`), so exactly one
member must appear. Builds on 02's required-section sequencing by collapsing a set of synonyms into
one position.

## Use case

A task-style note whose first section is a goal statement. Older docs head it `## Goal`; newer ones
spell it `## Goal / Problem statement`. Both are the same slot. A trailing `Notes` section is
optional. The contract should accept either spelling without complaint.

## Sample document

```md
## Goal

Ship the alias-set matcher so old and new headings both validate.

## Notes

Migrate stragglers to the long spelling once the validator lands.
```

A second instance uses the long spelling and omits the optional `Notes`:

```md
## Goal / Problem statement

Ship the alias-set matcher so old and new headings both validate.
```

## Proposed contract

```ts
import { contract, sections, section, optional, oneOf } from "markdown-contract";

export const GoalNoteContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),   // one required slot, two spellings
    optional(section("Notes")),
  ]),
});
```

## Expected findings

PASS — both documents conform; `findings` is empty for each. The matched member resolves to one
slot in the typed model, keyed by whichever spelling the document used:

```jsonc
// short-spelling doc:  GoalNoteContract.validate(source, { path }).value
{ "body": { "goal": {}, "notes": {} } }

// long-spelling doc:  the same slot, keyed by its heading text
{ "body": { "goalProblemStatement": {} } }
```

Either spelling satisfies the required slot — that interchangeability is the property under test.
A consumer reaches the slot by its present heading (`doc.body.goal` or
`doc.body["Goal / Problem statement"]`), or via `doc.body.section(name)` for dynamic access.

FAIL — replace the goal heading with a name that is *not* a member of the alias set. Here `## Aim`
matches no `oneOf` spelling, so the required slot is unfilled:

```md
## Aim

Ship the alias-set matcher so old and new headings both validate.
```

```jsonc
// findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/notes/goal.md", "pos": { "line": 1 },
    "message": "required section ‘Goal | Goal / Problem statement’ is missing" }
]
```

Exactly one finding: the unfilled `oneOf` slot. `## Aim` is admitted as an unknown section
(`allowUnknown: true`), so it contributes no finding of its own.

## Gaps & questions

None — expressible with the API as documented.
