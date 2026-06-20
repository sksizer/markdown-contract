> Example 12 for [[D-0014-markdown-structure-validation|D-0014]] — List leaf: checkbox items +
> minItems. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 12 · List leaf: checkbox items + minItems

## Capability

The `list()` content leaf — the third of the `leaves.ts` helpers, after `maxWords` (step 09) and
`table` (step 10). `content: list({ everyItem: "checkbox", minItems: 1 })` compiles to a Zod schema
over the section's sole projected `list` BlockNode: `everyItem: "checkbox"` asserts every list item
is a markdown task item (`- [ ]` / `- [x]`); `minItems` floors the item count. This is the engine
form of the "every acceptance criterion is a checkbox" rule (proposed-shape §5.2).

## Use case

A section whose body must be a task list, not free-form bullets — the canonical case is
`## Acceptance criteria` on a Task, where each line is a tickable, trackable item. The contract
enforces both that the list is non-empty and that nothing slips in as a plain bullet.

## Sample document

```md
## Acceptance criteria

- [ ] `validate()` returns an empty findings array for a conforming document
- [ ] a non-checkbox acceptance item produces a `list/every-item` finding
- [ ] the finding's `pos.line` points at the offending list item
```

## Proposed contract

```ts
import { contract, sections, section, list } from "markdown-contract";

export const AcceptanceContract = contract({
  body: sections({}, [
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. The `## Acceptance criteria` heading projects to a `SectionNode` whose
sole `BlockNode` is `{ kind: "list", ordered: false, items: [...3...] }`. All three items are
checkboxes and the count (3) clears `minItems: 1`, so the list leaf is satisfied.

```jsonc
// AcceptanceContract.validate(source, { path: "docs/.../task.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "acceptanceCriteria": {} }   // SectionView; .lists[0] is the checkbox ListView
  }
}
```

**FAIL** — mutate the third item to a plain bullet (drop its `[ ]`); the list still clears
`minItems`:

```md
## Acceptance criteria

- [ ] `validate()` returns an empty findings array for a conforming document
- [ ] a non-checkbox acceptance item produces a `list/every-item` finding
- the finding's `pos.line` points at the offending list item
```

Item three is no longer a checkbox, so `everyItem: "checkbox"` is violated. The count (3) still
clears `minItems: 1`, so only the every-item finding fires, localized to the offending item:

```jsonc
// AcceptanceContract.validate(source, { path: "docs/.../task.md" }).findings
[
  { "id": "list/every-item", "level": "error",
    "path": "docs/.../task.md", "pos": { "line": 5 },
    "message": "every item in ‘Acceptance criteria’ must be a checkbox (- [ ]); item 3 is a plain bullet" }
]
```

## Gaps & questions

None — expressible with the API as documented.
