> Example 12b for [[D-0014-markdown-structure-validation|D-0014]] — List below minItems.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 12b · List below minItems

## Capability

The `minItems` floor on the `list()` content leaf (proposed-shape §3, `leaves.ts`), the count side
of step 12's list leaf — the complement of 12a, which stresses `everyItem`. Where 12 floored at
`minItems: 1`, this raises the floor to `minItems: 2` and feeds a list that falls short, so the
count assertion — not the per-item kind assertion — is the one that fires.

## Use case

The same `## Acceptance criteria` task-list section as step 12, but with a contract that demands at
least two criteria: a task with a single (or empty) checklist is under-specified, and the count
floor catches it even when every present item is a well-formed checkbox.

## Sample document

```md
## Acceptance criteria

- [ ] `validate()` returns an empty findings array for a conforming document
- [ ] the list leaf emits a `list/min-items` finding when the count falls below the floor
```

## Proposed contract

```ts
import { contract, sections, section, list } from "markdown-contract";

export const AcceptanceContract = contract({
  body: sections({}, [
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 2 }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. The `## Acceptance criteria` heading projects to a `SectionNode` whose
sole `BlockNode` is `{ kind: "list", ordered: false, items: [...2...] }`. Both items are checkboxes
and the count (2) meets `minItems: 2`, so the list leaf is satisfied.

```jsonc
// AcceptanceContract.validate(source, { path: "docs/.../task.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "acceptanceCriteria": {} }   // SectionView; .lists[0] is the 2-item checkbox ListView
  }
}
```

**FAIL** — drop the second item, leaving a single-element list that still passes `everyItem`:

```md
## Acceptance criteria

- [ ] `validate()` returns an empty findings array for a conforming document
```

The sole item is a checkbox, so `everyItem: "checkbox"` holds; but the count (1) falls below
`minItems: 2`, so only the count finding fires, localized to the list block:

```jsonc
// AcceptanceContract.validate(source, { path: "docs/.../task.md" }).findings
[
  { "id": "list/min-items", "level": "error",
    "path": "docs/.../task.md", "pos": { "line": 3 },
    "message": "‘Acceptance criteria’ requires at least 2 items; found 1" }
]
```

An empty list (heading with no bullets) projects to a section with no `list` BlockNode, so the leaf
sees zero items and emits the same `list/min-items` finding (found 0) at the heading position.

## Gaps & questions

None — expressible with the API as documented.
