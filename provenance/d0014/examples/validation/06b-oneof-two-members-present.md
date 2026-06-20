> Example 06b for [[D-0014-markdown-structure-validation|D-0014]] — Two alias members both
> present. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 06b · Two alias members both present

## Capability

Builds on 06 (alias sets via `oneOf`). Stresses the failure where a document supplies *two* of an
`oneOf` set's interchangeable spellings at once. `oneOf(["Goal", "Goal / Problem statement"])`
declares one logical slot fillable by either heading; exactly one should appear. When both do, the
slot is ambiguous — which heading binds the generated `doc.body.goal` key? — and the contract must
reject rather than silently pick one.

## Use case

A task note whose first body section is the goal, declared as an alias set so either the short
spelling (`## Goal`) or the long one (`## Goal / Problem statement`) is accepted. An author migrates
from the long form to the short form but leaves both headings in place. The contract is the same one
from 06; only the document changes, now carrying both alias members.

## Sample document

```md
## Goal
Ship the validator.

## Goal / Problem statement
Authors hand-format docs and drift from the house structure.
```

## Proposed contract

```ts
import { contract, sections, section, oneOf } from "markdown-contract";

// Same contract as 06: a single required goal slot, fillable by either spelling.
export const NoteContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),
  ]),
});
```

## Expected findings

PASS — exactly one alias member present (`## Goal` alone, or `## Goal / Problem statement` alone):

```jsonc
// NoteContract.validate(source, { path: "note.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "goal": {} } } }
```

The slot binds to whichever spelling appears; `doc.body.goal`, `doc.body["Goal"]` (or the long
spelling's key), and `doc.body.section("Goal")` all resolve to the same `SectionView`.

FAIL — the sample document above, where both members appear (lines 1 and 4):

```jsonc
// NoteContract.validate(source, { path: "note.md" }).findings
[
  { "id": "structure/duplicate-section", "level": "error",
    "path": "note.md", "pos": { "line": 4 },
    "message": "‘Goal / Problem statement’ is a second spelling of an alias set already filled by ‘Goal’; supply exactly one" }
]
```

The finding localizes to line 4 (the second member); the first occurrence is the binding one. No
`value` is returned alongside an error-level finding, so the ambiguous `goal` key is never
generated.

## Gaps & questions

This case is *under-specified* by the API as documented. `oneOf` is defined as "interchangeable
spellings" (proposed-shape.md §3), but the doc never states what happens when two members of one
`oneOf` set both appear. §6 names `structure/duplicate-section` only for two sections sharing the
*same* heading text; here the two headings differ, so that id's documented trigger does not cleanly
cover the case. The finding above (id and message) is therefore invented.

- Gap: no documented finding id for "two distinct members of one alias set both present". The
  closest, `structure/duplicate-section`, is documented for identical-text repeats, not for
  cross-alias collision. Smallest delta: one sentence in §3 under `oneOf` stating that two or more
  members of one set both appearing emits a finding, naming its id — either reusing
  `structure/duplicate-section` (treating the alias set as one logical heading) or minting
  `structure/oneOf-ambiguous`.
- Open question for human review: reuse `structure/duplicate-section` or mint a dedicated id, and
  which member carries the `pos` (this example assumes the second/later one). A dedicated id lets a
  consumer distinguish "same heading twice" from "two interchangeable spellings, pick one".
