> Example 14b for [[D-0014-markdown-structure-validation|D-0014]] — Content before the first
> sub-heading. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 14b · Content before the first sub-heading

## Capability

A layer-1 projection edge, not a new API knob. Builds on step 14
(`section({ children: sections(...) })`, recursive nested subsequence) by placing real content — a
lead paragraph and a table — under `## Decision` *before* its first `### Components` sub-heading.
The pin: per the layer-1 contract (proposed-shape.md §2), `SectionNode.blocks` is "non-heading
content in this section" and `SectionNode.sections` is "nested subsections, by heading depth". So
the pre-subheading blocks must attach to `Decision.blocks`, never leak into any child `SectionNode`,
and the `children` grammar must still resolve the H3s as if those blocks were not there. S6 calls
this out as a projection edge (§7 — "pre-heading content"); it should validate clean.

## Use case

A `## Decision` section that opens with a one-line verdict and a summary table, then breaks the
detail into `### Components` and other H3 subsections — a common house shape where the section lead
orients the reader before the structured children begin. The contract for `Decision` declares its
children grammar but says nothing about the lead blocks; they are free prose the engine carries on
the parent node and otherwise ignores.

## Sample document

```md
## Decision

We adopt a generic TypeScript contract library; the lead table summarises the split.

| Plane       | Owner   |
| ----------- | ------- |
| frontmatter | Zod     |
| structure   | grammar |

### Components

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | engine    | ship       |
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

export const DecisionContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Decision", {
      children: sections({ order: "strict", allowUnknown: true }, [
        section("Components", {
          content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
        }),
      ]),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample document above. `## Decision` projects to one `SectionNode`. The lead
paragraph and the two-row summary table sit in `Decision.blocks` (a `paragraph` BlockNode and a
`table` BlockNode); they do not become a child section because neither is a heading. The single
`### Components` heading is the only entry in `Decision.sections`, so the `children` grammar matches
its one declared `section("Components", …)` and the `table({ minRows: 1 })` leaf passes against the
Components table (one body row). The lead table is untouched by the contract:

```jsonc
// DecisionContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": {
      "decision": {
        // SectionView. .table is the lead summary table (the section's sole *direct* table);
        // .sections.components is the nested child SectionView holding the Components table.
        "sections": { "components": { "name": "Components" } }
      }
    }
  }
}
```

The consumer reads the child via `doc.body.decision.sections.components` (a `SectionView`), whose
sole table is `doc.body.decision.sections.components.table`. The lead prose stays reachable as
`doc.body.decision.text()` and the lead summary table as `doc.body.decision.table` (untyped
`TableView<Record<string,string>>`, the section's sole *direct* table). The pre-subheading blocks
attach to the parent and the children grammar resolves independently — the edge holds.

**FAIL** — move the lead content *into* a wrong shape: drop the `### Components` heading so the
Components table becomes just another block in `Decision.blocks`. Now `Decision.sections` is empty,
and the `children` grammar finds its required `section("Components")` absent:

```md
## Decision

We adopt a generic TypeScript contract library; the lead table summarises the split.

| Plane       | Owner   |
| ----------- | ------- |
| frontmatter | Zod     |
| structure   | grammar |

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | engine    | ship       |
```

```jsonc
// DecisionContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 1 },
    "message": "Decision is missing required subsection ‘Components’" }
]
```

Both tables are now `Decision.blocks` entries with no `### Components` heading to anchor the child,
so the child is reported missing. `pos.line` localizes to the `## Decision` parent heading — the
level whose `children` grammar failed to find the required subsection.

## Gaps & questions

The capability this edge pins — pre-subheading blocks attaching to the parent `SectionNode.blocks`
while the `children` grammar resolves the H3s — is fully expressible: §2 defines
`SectionNode.blocks` as "non-heading content in this section" and `SectionNode.sections` as nested
subsections by heading depth, which is exactly the PASS behaviour. The contract uses only documented
API. One residual gap sits in the FAIL findings list, inherited from 01a:

- **`structure/section-missing` finding id is not enumerated.** §5.3 names
  `structure/section-order`, `structure/anchor-missing`, and `structure/duplicate-section` but
  never a missing *required* section; the FAIL case here infers `structure/section-missing` for an
  absent required subsection. The id is consistent with the `structure/*` namespace but unstated.
  - Proposed delta: add a finding-id registry row pinning `structure/section-missing` (level
    `error`) as the canonical id for an absent required section.
- **Position of a missing subsection is not defined.** A missing child has no node, so the
  finding here points at the parent `## Decision` heading. The doc's findings always point at a
  present node; "parent heading whose `children` grammar failed" is a reasonable convention but
  unstated. Open question for human review: parent heading, or document line 1, for a missing
  nested section?
