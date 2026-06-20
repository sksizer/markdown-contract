> Example 21 for [[D-0014-markdown-structure-validation|D-0014]] — Real Milestone / SKILL.md
> doc-type. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 21 · Real Milestone / SKILL.md doc-type

## Capability

No new combinator — a third real entity contract, proving the engine generalizes across SDLC
doc-types (after the Decision of 19 and the Task of 20). It composes a Zod frontmatter plane, a
`lenient` body (`order: "none"`, `allowUnknown: true`, matching `milestone/body-schema.yaml`), a
required `Deliverables` section whose `children` are free-named H3 category subsections — each
carrying a checkbox-`list` content leaf — plus the `Tasks` alias via `oneOf`. The claim under test:
a well-formed Milestone validates with **zero findings** in one `validate` call.

## Use case

An SDLC Milestone. Frontmatter carries `id` (`M-####`), a lifecycle `status`, and `title`. The body
is lenient (sections in any order, unknowns allowed): required `Goal`, `Success criteria`, and
`Deliverables` (or its `Tasks` alias), then optional `Out of scope` and `Risks / open questions`.
`Deliverables` nests free-named H3 category subsections (`Wave 1 …`, `Decisions`, etc.), each a
checkbox list of entries. This mirrors `milestone/body-schema.yaml`. The contract gates that the
document is well-formed so a consumer reads a typed Milestone model.

## Sample document

```md
---
id: M-0042
status: open/draft
title: Stand up the markdown-contract package
related: []
---
# Stand up the markdown-contract package

## Goal

Ship the generic markdown-contract engine and wire one SDLC entity contract through it.

## Success criteria

- [ ] The engine validates fixture markdown with zero SDLC dependencies.
- [ ] One entity contract (Decision) runs end-to-end through the op substrate.

## Deliverables

### Wave 1 — engine

- [ ] [[T-AAAA-projection-pass]] — mdast → positioned section tree
- [ ] [[T-BBBB-grammar-combinators]] — sections/section/optional/oneOf/gap

### Wave 2 — integration

- [ ] [[T-CCCC-decision-contract]] — first entity contract end-to-end

## Risks / open questions

- remark-gfm is the prerequisite for table/list leaves; pin it in the spike.
```

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, gap, list,
} from "markdown-contract";

// Per-type Zod (mirrors milestone/schema.ts; inlined and abbreviated for the example).
const MilestoneFrontmatter = z.object({
  id: z.string().regex(/^M-[0-9A-Z]{4}$/),
  status: z.enum(["open/draft", "open/active", "closed/done", "closed/abandoned"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

export const MilestoneContract = contract({
  frontmatter: MilestoneFrontmatter,
  body: sections({ order: "none", allowUnknown: true }, [
    section("Goal"),
    section("Success criteria"),
    oneOf(["Deliverables", "Tasks"], {        // alias from body-schema.yaml; required
      children: sections({ order: "none", allowUnknown: true }, [
        gap(),                                 // free-named H3 category subsections
      ]),
    }),
    optional(section("Out of scope")),
    optional(section("Risks / open questions")),
  ]),
});
```

## Expected findings

### PASS

The sample conforms on both planes: frontmatter parses; `Goal`, `Success criteria`, and
`Deliverables` are all present (order irrelevant under `order: "none"`); the two H3 category
subsections are admitted by the nested `gap()`; the optional `Risks / open questions` tail is
recognized.

```jsonc
// MilestoneContract.validate(source, { path: "docs/.../milestones/M-0042.md" })
{ "findings": [],
  "value": {
    "frontmatter": { "id": "M-0042", "status": "open/draft",
                     "title": "Stand up the markdown-contract package", "related": [] },
    "body": {
      "goal": { /* SectionView */ },
      "successCriteria": { /* SectionView */ },
      "deliverables": { /* SectionView; .sections holds the H3 subsections */ },
      "risksOpenQuestions": { /* SectionView */ }
    }
  } }
```

A consumer reads the typed model: the H3 categories are nested subsections, e.g.
`Object.keys(doc.body.deliverables.sections).length === 2`;
`doc.body.deliverables.sections["Wave 1 — engine"].lists[0]` is the checkbox list of entries.

### FAIL

Mutate two things: frontmatter `status: open/wip` (not in the enum) and drop the required
`## Deliverables` heading (its H3 subsections then become orphaned top-level content / unknowns).
One `validate` call merges both, ordered by `pos.line`:

```jsonc
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../milestones/M-0042.md", "pos": { "line": 3 },
    "message": "status: expected open/draft | open/active | closed/done | closed/abandoned" },
  { "id": "structure/section-missing", "level": "error",
    "path": "docs/.../milestones/M-0042.md", "pos": { "line": 1 },
    "message": "required section ‘Deliverables’ (or alias ‘Tasks’) is missing" }
]
```

## Gaps & questions

The contract is fully expressible with the documented API. One modelling note worth a human check,
not a gap: the milestone schema wants every `Deliverables` H3 entry to be a checkbox list, but the
H3 categories are **free-named** (`Wave 1 …`, `Decisions`, …), so they fall under `gap()`, which
admits *unknown* subsections without attaching a `content` leaf. There is therefore no documented
way to say "every subsection admitted by this `gap()` must carry `list({ everyItem: "checkbox" })`."
The §5.1 Decision contract hits the same shape (`Options considered` → `gap()` for `### <option>`
subs) and likewise asserts nothing about those subsections' content.

- **Proposed delta:** let `gap()` take a per-admitted-section spec, e.g.
  `gap({ each: section("*", { content: list({ everyItem: "checkbox", minItems: 1 }) }) })`,
  applying that content leaf to every section the window admits.
- **Open question:** is per-entry content enforcement on free-named subsections in scope for v1, or
  is it a custom `rule(id, fn)` on the parent (`Deliverables`) walking `node.sections` — keeping
  `gap()` purely structural? The spike (S6) should decide before this delta is committed.
