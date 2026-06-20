> Example 18 for [[D-0014-markdown-structure-validation|D-0014]] — OOM consumption: typed
> rows, byAnchor, dual-key. Exercises the proposed API (proposed-shape.md); non-normative;
> where they disagree, that doc wins.

# 18 · OOM consumption: typed rows, byAnchor, dual-key

## Capability

The §6 object model (`Infer<Contract>`) as a *consumer* surface, not a validation surface. Earlier
steps produced typed values incidentally; this step exercises them deliberately. Four documented
affordances at once:

- `Contract.read(source, { path })` — the model-only door, throwing on error-level findings (§6).
- `TableView<Row>` iteration — `for (const row of view)` yields rows with cells narrowed by the
  `cells` Zod (here `Kind` is the enum union, not `string`); `.column(name)` returns one whole
  column; `.find(p)` returns a typed row (§6 "TableView").
- Dual-key + accessor — `doc.body["Files to touch"]`, `doc.body.filesToTouch`, and
  `doc.body.section("Files to touch")` all resolve to the **same** `SectionView` (§6 "Dual access").

It builds on step 11 (typed `cells`) and step 10 (the `table()` leaf): the same contract that drives
validation drives this model, with no second parse.

## Use case

A consumer — a report op, an MCP tool, a lint summary — that has *already* validated a document and
now wants to *read* it as data: iterate the change manifest, pull one column, look up a row, reach a
section by whichever key the call site has in hand. The point is that the contract author writes the
shape once and the consumer gets a typed, navigable view for free; this example is the consumer
code, asserting the §6 access paths resolve and carry the declared types.

## Sample document

```md
---
id: T-0042
status: open/ready
---

## Files to touch

| Location              | Kind   | Change                         |
| --------------------- | ------ | ------------------------------ |
| src/grammar.ts        | new    | new sections/section grammar   |
| src/leaves.ts         | modify | add table() cell typing        |
| plugin/lib/legacy.ts  | delete | retire validateBody            |
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

const TaskFrontmatter = z.object({
  id: z.string().regex(/^T-[0-9A-Z]{4}$/),
  status: z.enum(["open/ready", "in-progress/active", "closed/done"]),
}).strict();

export const FilesContract = contract({
  frontmatter: TaskFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Files to touch", {
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Kind: z.enum(["new", "modify", "delete"]) },
      }),
    }),
  ]),
});
```

## Expected findings

**PASS** — the sample above. Frontmatter matches, and the `## Files to touch` section's sole
`content: table(...)` promotes the table to the `doc.body.filesToTouch` field (§6 "Naming a table as
a field", first row), typed `TableView<{ Location: string; Kind: "new"|"modify"|"delete"; Change:
string }>` from the column + cell declaration.

```jsonc
// FilesContract.validate(source, { path: "docs/.../tasks/T-0042.md" })
{
  "findings": [],
  "doc": {
    "frontmatter": { "id": "T-0042", "status": "open/ready" },
    "body": { "filesToTouch": {} }   // TableView<Row>, rowCount 3
  }
}
```

The §6 consumer code — every line uses a documented affordance:

```ts
const doc = FilesContract.read(source, { path });   // model-only door (§6)

// 1 — iterate typed rows; Kind narrowed to the enum union, not string
for (const row of doc.body.filesToTouch) {
  const k: "new" | "modify" | "delete" = row.Kind;
}

// 2 — column() returns a whole column as string[]
const locs: string[] = doc.body.filesToTouch.column("Location");
// ["src/grammar.ts", "src/leaves.ts", "plugin/lib/legacy.ts"]

// 3 — find() returns a typed row (or undefined)
const del = doc.body.filesToTouch.find((r) => r.Kind === "delete");
del?.Location;   // "plugin/lib/legacy.ts"

// 4 — dual-key + accessor all resolve to the SAME SectionView
const a = doc.body["Files to touch"];        // exact heading text
const b = doc.body.filesToTouch;             // lowerCamelCase
const c = doc.body.section("Files to touch"); // explicit accessor
a === b && b === c;   // true
```

**FAIL** — `read()` is the error door, so the model is unavailable when validation fails. Mutate one
row's `Kind` outside the enum (`rename`) and leave the rest:

```md
## Files to touch

| Location              | Kind   | Change                       |
| --------------------- | ------ | ---------------------------- |
| src/grammar.ts        | rename | new sections/section grammar |
```

Row 1's `Kind` fails `z.enum([...])`, producing one error-level finding. `read()` therefore throws
rather than returning a model; a consumer wanting the findings calls `validate()` instead:

```jsonc
// FilesContract.validate(source, { path: "docs/.../tasks/T-0042.md" }).findings
[
  { "id": "table/cell", "level": "error",
    "path": "docs/.../tasks/T-0042.md", "pos": { "line": 5 },
    "message": "Files to touch: column ‘Kind’ row 1: expected new | modify | delete, got ‘rename’" }
]
```

```ts
FilesContract.read(source, { path });   // throws — error-level finding present (§6)
```

## Gaps & questions

The contract and the access paths use only documented API: `read()`, `TableView` iteration,
`.column()`, `.find()`, bracket / dotted / `section()` keys, and the table-as-field promotion are
all in §6. The one remaining open point is a §7 spike question, not specific to OOM:

- **Resolved (F1).** `Contract.read`'s throw shape is pinned:
  `class ContractError extends Error { findings: Finding[] }`, carrying the error-level findings.
  `read()` throws on `error`-level findings only — `warn`-level findings do not throw — so the
  model is available whenever no error-level finding exists.
- The `table/cell` finding `id`, message wording, and row-precise `pos.line` carry the unresolved S7
  Zod-`issues[].path` → projection-line remap (§7), as in step 11 — used here only to show the
  `read()` error door, not core to the OOM access paths.
