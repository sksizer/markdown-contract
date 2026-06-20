> Example 20a for [[D-0014-markdown-structure-validation|D-0014]] — Closed task missing
> Completion note. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 20a · Closed task missing Completion note

## Capability

Edge case on **20** (the full real Task contract: alias `oneOf`, a typed Files-to-touch table, and a
checkbox Acceptance-criteria list). 20 runs the whole contract against a *conforming* closed task;
20a stresses the *frontmatter conditional* that gates completion — `closed/* ⇒ completion_note` — on
a **real** Task document. Completion is recorded in *frontmatter* (the `completion_note` key), not a
body section, so this rule lives in the per-type Zod (`schema.ts`) and surfaces as a
`frontmatter/*` finding (E1/E2) localized to the `completion_note` line — *not* a cross-plane
docRule. The real cross-plane docRule example is the post-mortem (see **20**). No new API surface;
this is the frontmatter Zod refine firing on a real corpus Task with the §5.2 contract intact.

## Use case

A real SDLC Task that has been closed (`status: closed/done`) but whose frontmatter carries no
`completion_note` key. The coupling rule "a closed task must record how it closed" is a conditional
*within the frontmatter* — `status` gates a sibling key — so the per-type Zod expresses it with a
`.refine`, and it surfaces as a `frontmatter/*` finding. It is *not* a cross-plane check: completion
lives wholly in frontmatter, so no body plane is involved.

## Sample document

```md
---
type: task
schema_version: "5"
id: T-0006
status: closed/done
created: 2026-05-30
last_reviewed: 2026-06-04
impact: medium
complexity: small
tags:
  - markdown
  - standard
prs:
  - https://github.com/sksizer/dev/pull/275
---
# Research and declare a markdown standard (ADR + Standard)

## Goal

Settle the markdown formatting choices via an ADR and a Standard, with Obsidian
compatibility as a primary constraint.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/planning/decisions/markdown-standard.md` | add | ADR with options + recommendation |
| `docs/planning/standards/S-0007-markdown-formatting.md` | add | Standard codifying the rules |

## Acceptance criteria

- [x] AC-1: ADR exists with the required Decision body sections.
- [x] AC-2: ADR enumerates each formatting axis with a recommendation.
- [x] AC-3: Standard exists with `applies_to.paths` scoped, status `proposed`.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section, optional, oneOf, list, table } from "markdown-contract";

// Frontmatter schema — the per-type Zod (inlined here; production reuses schema.ts).
// The closed/* ⇒ completion_note coupling lives *here*, as a frontmatter refine — completion is a
// frontmatter key, not a body section, so this is a frontmatter/* finding, not a cross-plane docRule.
const TaskFrontmatter = z.object({
  id: z.string().regex(/^T-[0-9A-Z]{4}$/),
  status: z.enum([
    "planning/draft", "open/ready", "in-progress/active", "closed/done", "closed/superseded",
  ]),
  completion_note: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
}).strict().refine(
  (fm) => !fm.status.startsWith("closed/") || fm.completion_note !== undefined,
  { path: ["completion_note"], message: "a closed task must record a completion_note" },
);

export const TaskContract = contract({
  frontmatter: TaskFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),            // alias set, required
    section("Files to touch", {
      optional: true,
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Kind: z.enum(["add", "modify", "delete"]) },
      }),
    }),
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }),
    }),
  ]),
  // No cross-plane rule here: completion is frontmatter-only. The real cross-plane docRule example
  // is the post-mortem (status gates the body ## Post-mortem section) — see example 20.
});
```

## Expected findings

**PASS** — the same real Task, closed, but now carrying its `completion_note` *frontmatter key* (the
refine's quiescent path); add it to the frontmatter block:

```md
completion_note: Shipped via #275. Declared the markdown standard as an ADR plus a Standard.
```

```ts
const { findings, doc } = TaskContract.validate(source, { path });
// findings === []
// doc === {
//   frontmatter: { id: "T-0006", status: "closed/done", completion_note: "Shipped via #275. …" },
//   body: { goal: { /* SectionView */ },
//           filesToTouch: { /* TableView<{ Location; Kind: "add"|"modify"|"delete"; Change }> */ },
//           acceptanceCriteria: { /* SectionView */ } },
// }
```

A closed task with `completion_note`, or any non-closed task without it, leaves the refine
quiescent. The frontmatter rule fires only on the closed × absent combination.

**FAIL** — the sample document above (`status: closed/done`; no `completion_note` frontmatter key,
valid otherwise):

```ts
TaskContract.validate(source, { path: "docs/planning/tasks/T-0006.md" }).findings;
```

```jsonc
[
  { "id": "frontmatter/refine", "level": "error",
    "path": "docs/planning/tasks/T-0006.md", "pos": { "line": 5 },
    "message": "a closed task must record a completion_note" }
]
```

One finding, from the frontmatter Zod alone — a `frontmatter/refine` (E1). The body plane passes
(Goal present, Files-to-touch table conforms, the AC list is all checkboxes), and the body never
needs to mention completion. The refine reads `status` and the absent `completion_note`; its issue
`path: ["completion_note"]` maps through `lineForPath` (E2) to the field's line — and when the key
is absent, A2 localizes to the frontmatter container (here the `status:` line the refine read,
`line: 5`).

## Gaps & questions

The contract uses only documented API (the per-type Zod with a `.refine`, the §5.2 task body
verbatim). Both points this case surfaced are now resolved decisions, recorded here for trail:

- **Completion is recorded in *frontmatter* (`completion_note`), not a body section (G3).** The
  on-disk Task schema enforces `closed/* ⇒ completion_note` (a frontmatter key) via Zod refine, and
  real closed tasks (e.g. T-0006) carry a `## Post-mortem`, not a `## Completion note`. So this is a
  `frontmatter/*` finding from the per-type Zod (`schema.ts`), *not* a cross-plane docRule. The real
  cross-plane docRule example is the post-mortem — body grammar declares `## Post-mortem` (three
  ordered H3s) and a `docRule` gates its presence on `status` — see example **20**.
- **Where a frontmatter-refine finding localizes (E1/E2/A2).** The refine's issue
  `path: ["completion_note"]` maps through `lineForPath` (E2) to the key's line; when the key is
  absent, A2 localizes to the frontmatter container (the `status:` line the refine read). This is
  the frontmatter plane's own resolved positioning — no docRule positioning question arises, since
  the rule is not cross-plane.
