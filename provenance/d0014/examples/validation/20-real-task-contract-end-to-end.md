> Example 20 for [[D-0014-markdown-structure-validation|D-0014]] — Real Task contract
> end-to-end. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 20 · Real Task contract end-to-end

## Capability

The full §5.2 `TaskContract` on a real SDLC Task, end-to-end. Nothing new in
isolation — this is the integration step: one `contract({ frontmatter, body,
rules })` exercises every leaf introduced earlier on a real document at once:
`oneOf` alias sets (06), a typed `table` with a `Kind` enum cell (10/11), a
`list({ everyItem: "checkbox", minItems })` leaf (12), and a cross-plane
`docRule` (16). The cross-plane rule is present but dormant: an *open* task
must pass, so `task/post-mortem-when-worked` does not fire. The pass case proves
the contract is satisfiable by a real, well-formed open task.

## Use case

An SDLC Task file: `TaskFrontmatter` (reused from `entities/task/schema.ts`),
then a `Goal`, an optional typed `Files to touch` table, an `Acceptance
criteria` checkbox list, and an `Out of scope` tail. The `Goal` section accepts
divergent code-side spellings via `oneOf`. A worked task would additionally need
a `Post-mortem` section (three ordered H3s) — gated by the `docRule` — but an
open task is complete without one.

## Sample document

```md
---
id: T-AB12
type: task
status: open/ready
title: Pin remark-gfm and project table nodes
tags: [markdown, tooling]
impact: medium
complexity: small
---

# Pin remark-gfm and project table nodes

## Goal

Today the projection sees pipe tables as a single paragraph because the parser
omits `remark-gfm`. Pin it so `table`/`list` leaves have real nodes to read.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/ts/markdown-contract/package.json` | modify | add remark-gfm dep |
| `packages/ts/markdown-contract/src/projection.ts` | modify | wire gfm extension |

## Acceptance criteria

- [ ] AC-1: a pipe table parses to a `table` BlockNode, not a paragraph
- [ ] AC-2: the projection test fixture for tables passes

## Out of scope

- none
```

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, list, table, docRule,
} from "markdown-contract";
import { TaskFrontmatter } from "./schema.ts";              // reuse the existing per-type Zod

export const TaskContract = contract({
  frontmatter: TaskFrontmatter,                            // already encodes closed/* ⇒ completion_note (G3)
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),            // alias set, required
    optional(section("Today")),                            // G2 — optional; "Current state" was a phantom alias
    section("Files to touch", {
      optional: true,
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Kind: z.enum(["new", "modify", "delete"]) },  // G1 — matches the live VALID_KINDS
      }),
    }),
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }), // the "24 non-checkbox ACs" rule
    }),
    optional(section("Post-mortem", {                      // G3 — structure declared here; presence gated below
      children: sections({ order: "strict", allowUnknown: false }, [
        section("Acceptance criteria coverage"),
        section("What worked"),
        section("Friction and automation gaps"),
      ]),
    })),
  ]),
  rules: [
    // Cross-plane (G3): frontmatter status gates a body section — the real example (PR 464's post-mortem).
    // Completion is frontmatter-only (TaskFrontmatter's closed/* ⇒ completion_note), so it is *not* a docRule.
    docRule("task/post-mortem-when-worked", (doc, ctx) =>
      isWorked(doc.frontmatter.status) && !doc.body.section("Post-mortem")
        ? [ctx.finding({ id: "task/post-mortem-when-worked",
              message: "a worked task must include a ## Post-mortem section" })]   // ctx fills path/level/pos (A4)
        : []),
  ],
});
```

The optional `Today` section above is in the §5.2 contract; the sample omits it
because it is not required (G2 — `Current state` was a phantom alias, so the
`oneOf` collapsed to a plain optional `section`). `recognized-relative` +
`allowUnknown: true` lets the real-world `Proposed` / `Approach` /
`Dependencies` sections interleave freely.

## Expected findings

PASS — the open task above conforms. `validate` returns `findings: []`; the
cross-plane `docRule` sees `status: "open/ready"`, so its `isWorked(...)`
guard is false and it emits nothing. The typed OOM value a consumer gets:

```jsonc
{ "findings": [],
  "value": {
    "frontmatter": { "id": "T-AB12", "status": "open/ready",
                     "title": "Pin remark-gfm and project table nodes" },
    "body": {
      "goal": {},                                  // oneOf member that matched
      "filesToTouch": {                            // TableView<{ Location; Kind; Change }>
        "rows": [
          { "Location": "packages/ts/markdown-contract/package.json",
            "Kind": "modify", "Change": "add remark-gfm dep" },
          { "Location": "packages/ts/markdown-contract/src/projection.ts",
            "Kind": "modify", "Change": "wire gfm extension" }
        ] },
      "acceptanceCriteria": {},
      "outOfScope": {}
    } } }
```

A consumer then iterates typed rows: `for (const r of doc.body.filesToTouch)
r.Kind` is `"add" | "modify" | "delete"`.

FAIL — minimally mutate two things: change `AC-1` from `- [ ]` to a plain `-`
bullet (non-checkbox), and drop the only `Files to touch` row so the table is
header-only. Findings:

```jsonc
[
  { "id": "list/every-item", "level": "error",
    "path": "docs/planning/tasks/T-AB12.md", "pos": { "line": 27 },
    "message": "Acceptance criteria: every item must be a checkbox" },
  { "id": "table/min-rows", "level": "error",
    "path": "docs/planning/tasks/T-AB12.md", "pos": { "line": 17 },
    "message": "Files to touch: table needs at least 1 row, found 0" }
]
```

(The `table` leaf's `minRows` default is the open question in the gap below; if
unset, the header-only-table finding does not fire and only the `list` finding
remains.)

## Gaps & questions

The contract uses only documented API. G1/G2/G3 resolved the modelling-fidelity
seams (Kind enum, optional `Today`, completion-via-frontmatter); one
contract-authoring choice remains:

1. `table(...)` has no `minRows` in the §5.2 contract, so a header-only `Files
   to touch` table is admitted. The `table` leaf *supports* `minRows`
   (documented in §3), so this is a contract-authoring choice, not an API gap.

This is expressible with the documented API — a spec-fidelity choice, not
missing surface.

- Proposed delta: if a `Files to touch` table must be non-empty when present,
  add `minRows: 1` to the §5.2 `table(...)` call.

Resolved (folded into §5.2): the `Kind` enum is `["new", "modify", "delete"]`
to match the live `VALID_KINDS` (G1); `Today` is `optional(section("Today"))`
with no `Current state` alias, which was a phantom heading (G2); completion is
frontmatter-only (`closed/* ⇒ completion_note` in `schema.ts`), so the real
cross-plane `docRule` gates a `Post-mortem` section on a worked status (G3).
