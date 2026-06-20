> Example 20b for [[D-0014-markdown-structure-validation|D-0014]] — Real task with
> non-checkbox acceptance criteria. Exercises the proposed API (proposed-shape.md);
> non-normative; where they disagree, that doc wins.

# 20b · Real task with non-checkbox acceptance criteria

## Capability

Edge case on **20** (the full Task contract end-to-end: aliased `oneOf` body sections, a typed
`## Files to touch` table with `cells: { Kind: z.enum([...]) }`, a `## Acceptance criteria`
checkbox list, and the `completion-note-when-closed` `docRule`). 20 runs the contract over a
conforming real task. 20b stresses **two real-world content-leaf failures firing together on one
real task**, the concrete bugs that motivated the contract: a `## Acceptance criteria` written as
plain `-` bullets (no checkboxes) and a `Files to touch` row whose `Kind` cell reads `new` instead
of the declared `add`. Same `TaskContract` (§5.2) — no new API. It builds on 11a (cell enum) and
12a (`everyItem: "checkbox"`), but grounds both on a real `docs/planning/tasks/` document rather
than a synthetic fixture, and shows the two findings co-occurring in one `validate` pass.

## Use case

A real SDLC task file. The body must carry a checkbox `## Acceptance criteria` list (so each
criterion is individually trackable to done) and a `## Files to touch` table whose `Kind` column is
one of `add` / `modify` / `delete`. Two failure modes recur in practice: an author types `new`
where the declared verb is `add`, and an author writes acceptance criteria as ordinary prose
bullets that no one can ever check off. The contract must flag both — the bad cell at its row line
and each non-checkbox bullet at its line — in a single pass over the real document.

## Sample document

```md
---
type: task
id: T-132J
status: planning/backlog
impact: low
complexity: small
---
# Document or auto-create destination parent dir for git worktree move

## Goal

`git worktree move <src> <dst>` fails if `<dst>`'s parent dir is missing.

## Files to touch

| Location                        | Kind   | Change                 |
| ------------------------------- | ------ | ---------------------- |
| `plugin/conventions/worktree.md`| modify | note the prerequisite  |
| `plugin/scripts/relocate.sh`    | new    | parent-creating wrapper|

## Acceptance criteria

- Every `git worktree move` in `plugin/` prose creates its parent dir first
- A grep for raw `git worktree move` returns zero un-annotated invocations
```

`Kind: new` (should be `add`) on the wrapper row; the two acceptance criteria are plain `-`
bullets, not `- [ ]` checkboxes.

## Proposed contract

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, list, table, docRule,
} from "markdown-contract";
import { TaskFrontmatter } from "./schema.ts";              // reuse the existing per-type Zod

// The full Task contract from proposed-shape.md §5.2 — unchanged.
export const TaskContract = contract({
  frontmatter: TaskFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),
    oneOf(["Today", "Current state"]),
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
    optional(section("Completion note")),
  ]),
  rules: [
    docRule("task/completion-note-when-closed", (doc) =>
      doc.frontmatter.status.startsWith("closed/") && !doc.body.section("Completion note")
        ? [{ id: "task/completion-note-when-closed", level: "error",
              message: "a closed task must include a Completion note section" }]
        : []),
  ],
});
```

## Expected findings

**PASS** — fix both bugs: `Kind: new` → `Kind: add`, and the two ACs become `- [ ]` checkbox
items. Every `Kind` cell is in the enum, every AC bullet is a checkbox, and the `Files to touch`
table clears its declaration. The task is `planning/backlog` (not `closed/`), so the `docRule`
stays quiet.

```jsonc
// TaskContract.validate(source, { path: "docs/planning/tasks/T-132J.md" })
{
  "findings": [],
  "value": {
    "frontmatter": { "id": "T-132J", "status": "planning/backlog" },
    // filesToTouch: TableView<{ Location: string;
    //   Kind: "add" | "modify" | "delete"; Change: string }>
    "body": { "filesToTouch": { "rowCount": 2 },
              "acceptanceCriteria": { /* SectionView, two checkbox items */ } }
  }
}
```

A consumer iterates typed rows and reads the checkbox list off the same model:

```ts
for (const r of doc.body.filesToTouch) r.Kind;        // each narrowed to the enum union
doc.body.acceptanceCriteria.lists[0];                 // ListView over the two checkbox items
```

**FAIL** — the sample document above (`Kind: new` on row 2; both ACs plain `-` bullets). The two
failures fire in one pass, ordered by `pos.line`: the cell-enum finding on the wrapper row
(`filesToTouch.rowPos(1)` → line 19), then one `everyItem` finding per non-checkbox AC (lines 23
and 24). The first `Files to touch` row (`modify`) and `minItems: 1` (two items present) both pass.

```jsonc
// TaskContract.validate(source, { path: "docs/planning/tasks/T-132J.md" }).findings
[
  { "id": "content/enum", "level": "error",
    "path": "docs/planning/tasks/T-132J.md", "pos": { "line": 19 },
    "message": "Kind: expected add | modify | delete, received ‘new’" },
  { "id": "content/every-item", "level": "error",
    "path": "docs/planning/tasks/T-132J.md", "pos": { "line": 23 },
    "message": "Acceptance criteria item is not a checkbox (everyItem: \"checkbox\")" },
  { "id": "content/every-item", "level": "error",
    "path": "docs/planning/tasks/T-132J.md", "pos": { "line": 24 },
    "message": "Acceptance criteria item is not a checkbox (everyItem: \"checkbox\")" }
]
```

Both planes' structure is otherwise sound — the `Goal` alias, the recognized-relative order, and
the optional `Completion note`'s absence all pass — so the only findings are the two motivating
content bugs, each localized to its line.

## Gaps & questions

The contract is verbatim §5.2 and the OOM access is documented; the gaps are the same
content-leaf-finding under-specifications surfaced by 11a and 12a, inherited unchanged:

- **Leaf-failure finding ids are not enumerated.** §3 defines the `table`/`list` leaves and says
  each compiles to a Zod schema, but the only enumerated leaf id is `frontmatter/enum` (§5.3). This
  example uses `content/enum` (cell) and `content/every-item` (list item) as the natural siblings;
  both are inferred, not documented.
  - Proposed delta: add a finding-id row to §3/§4 pinning leaf-failure ids — e.g.
    `content/enum` for a cell enum, `content/every-item` and `content/min-items` for the list
    predicates — or a single umbrella `content/<zod-issue-code>` parallel to `frontmatter/<code>`.
  - Open question: per-predicate ids for machine-routable diagnostics, or one `content/zod`
    deferring wording to the Zod issue? Couples to S7's `issues[].path` → `line` remap.

- **Per-item / per-row `pos` localization is the deferred S7 question.** Both the cell finding
  (line 19) and the per-item findings (lines 23, 24) assume a leaf Zod issue's `path` head remaps
  to the offending row's `rowPos(i)` or the offending item's line. §7 explicitly defers how
  `issues[].path` entries map onto a projection node's `line`, and the `ListItem` shape in §2
  (`items: ListItem[]`) does not state whether each item carries its own `SourcePos`.
  - Proposed delta: specify `ListItem` as `{ checkbox: boolean | null; text: string; pos:
    SourcePos }`, and document that a leaf Zod issue whose `path` head indexes a projected row or
    item carries `pos` = that row's `rowPos(i)` / that item's `pos`.
  - Open question: does a list leaf emit one finding *per* failing item (as shown, two findings),
    or one finding for the list pointing at its `pos` and naming the offenders in the message?
