> Example 16a for [[D-0014-markdown-structure-validation|D-0014]] — docRule violation fires.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 16a · docRule violation fires

## Capability

Edge case on **16** (`docRule(id, fn(doc))` — a cross-plane rule that sees both planes). Where 16
shows the rule's *quiescent* path (a worked task that does carry its `## Post-mortem`, so the
rule returns `[]`), 16a stresses the *firing* path: the document satisfies both planes in
isolation — the frontmatter validates, every required body section is present — yet the
combination is illegal. The `task/post-mortem-when-worked` docRule reads
`doc.frontmatter.status` and `doc.body.section("Post-mortem")` together and emits one finding
no single-plane validator could produce. No new API surface — same contract as 16 (the §5.2 task
contract); this isolates the cross-plane finding to its core.

## Use case

A task document whose frontmatter `status` is worked (`closed/done`) but whose body omits the
`## Post-mortem` section. Neither plane is wrong alone: `closed/done` is a valid enum member,
and Post-mortem is declared `optional` in the body grammar — so the structure layer permits
its absence. The coupling rule "a worked task must record its post-mortem" lives only across the
two planes, which is exactly what `docRule` exists to express.

## Sample document

```md
---
id: T-AB12
status: closed/done
title: Wire up the export button
---

# Wire up the export button

## Goal

Let users export the current view as CSV.

## Acceptance criteria

- [x] Export button appears in the toolbar
- [x] Clicking it downloads a CSV of the current rows
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section, optional, oneOf, list, docRule } from "markdown-contract";

// Frontmatter schema — the per-type Zod (inlined here; production reuses schema.ts).
const TaskFrontmatter = z.object({
  id: z.string().regex(/^T-[0-9A-Z]{4}$/),
  status: z.enum(["open/ready", "in-progress/active", "closed/done", "closed/dropped"]),
  title: z.string().min(1),
}).strict();

const isWorked = (status: string) => status === "closed/done";   // worked = reached done

export const TaskContract = contract({
  frontmatter: TaskFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }),
    }),
    optional(section("Post-mortem", {                          // structure declared; presence gated below
      children: sections({ order: "strict", allowUnknown: false }, [
        section("Acceptance criteria coverage"),
        section("What worked"),
        section("Friction and automation gaps"),
      ]),
    })),
  ]),
  rules: [
    // Cross-plane: a frontmatter field gates a body section — only the unified contract says this.
    docRule("task/post-mortem-when-worked", (doc, ctx) =>
      isWorked(doc.frontmatter.status) && !doc.body.section("Post-mortem")
        ? [ctx.finding({ id: "task/post-mortem-when-worked",
              message: "a worked task must include a ## Post-mortem section" })]   // ctx fills path/level/pos
        : []),
  ],
});
```

## Expected findings

**PASS** — a worked task that does carry its `## Post-mortem` (the rule's quiescent path):

```md
---
id: T-AB12
status: closed/done
title: Wire up the export button
---

# Wire up the export button

## Goal

Let users export the current view as CSV.

## Acceptance criteria

- [x] Export button appears in the toolbar
- [x] Clicking it downloads a CSV of the current rows

## Post-mortem

### Acceptance criteria coverage

Both criteria verified against the staging dataset.

### What worked

The existing CSV serializer dropped in cleanly.

### Friction and automation gaps

None of note.
```

```ts
const { findings, doc } = TaskContract.validate(source, { path });
// findings === []
// doc === {
//   frontmatter: { id: "T-AB12", status: "closed/done", title: "Wire up the export button" },
//   body: { goal: { /* SectionView */ },
//           acceptanceCriteria: { /* SectionView */ },
//           postMortem: { /* SectionView */ } },
// }
```

The docRule also returns `[]` when `status` is *not* worked and the section is absent — an open task
with no Post-mortem is fine. The rule fires only on the worked × absent combination.

**FAIL** — the sample document above (`status: closed/done`; `## Post-mortem` absent):

```ts
TaskContract.validate(source, { path: "docs/planning/tasks/wire-up-export.md" }).findings;
```

```jsonc
[
  { "id": "task/post-mortem-when-worked", "level": "error",
    "path": "docs/planning/tasks/wire-up-export.md", "pos": { "line": 3 },
    "message": "a worked task must include a ## Post-mortem section" }
]
```

One finding, from the docRule alone — the frontmatter plane passes (`closed/done` is in the enum)
and the body plane passes (Post-mortem is `optional`, so its absence is legal structure). Only
the cross-plane rule, reading both `doc.frontmatter.status` and the absent
`doc.body.section("Post-mortem")`, can produce it.

## Gaps & questions

The docRule in the contract uses only documented API (`docRule`, `doc.frontmatter`,
`doc.body.section()`, `ctx.finding()`). The mechanism is exactly §5.2. Two points the resolved
review (A4) settled, where the values still need pinning:

- **The rule body emits via `ctx.finding({ id, message })`; the engine backfills `path`, `level`,
  and `pos`.** §4's `Finding` declares `path: string` non-optional and `pos?: SourcePos` optional,
  and §5.2's `Ctx.finding` lets a rule name only `{ id, message }` (plus optional `level`/`pos`).
  The engine fills `path` (it owns the one parse), the id's registered default `level`, and `pos`.
  Which line a *whole-document* rule localizes to is what's left open — above it is shown at
  `line 3` (the `status:` line, the field that triggered the rule), but the doc never says so.
  - Proposed delta: document the default — e.g. "a docRule finding with no `pos` localizes to the
    frontmatter field the rule's predicate read, else line 1".
- **`Ctx` is now specified (A4) but its `pos` default is not.** The signature is
  `fn: (doc: Doc<F>, ctx: Ctx) => Finding[]`, and §3 defines `Ctx` as the finding factory
  `{ path; finding({ id, message, level?, pos? }) }`. A rule that omits `pos` (as here) leaves the
  line to the engine.
  - Open question for human review: when a docRule omits `pos`, should the engine default it to the
    frontmatter field the predicate read (here the `status:` line), so worked × absent localizes
    consistently across all status-gated rules?
