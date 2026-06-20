> Question A3 for [[D-0014-markdown-structure-validation|D-0014]] — the Zod-issue → line remap (spike
> S7). Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# A3 · S7 Zod-issue → line remap scope

**Surfaced by:** [[07a-frontmatter-enum-and-unknown-key|07a]], [[11-typed-cells-enum-pattern|11]],
[[11a-cell-enum-violation|11a]], [[12a-non-checkbox-list-item|12a]],
[[20b-real-task-non-checkbox-acs|20b]].

## The question

A leaf is a Zod schema run over a *projected* object. When it fails, Zod reports an `issue` with a
`path` array indexing into that object — not a source line. To emit a `Finding` with a `pos`, the
engine must map that path back to the markdown position. The question: does this remap cover the
**leaf interior** — a table cell, a list item, a frontmatter key — or only section-level paths? And
do we **commit** the remap now, or keep it gated behind spike S7?

## What "remap" means

Zod validates a **value** and knows nothing about files or lines. On failure it reports a `ZodIssue`
with a `path` — an array of keys/indices locating the bad value *inside the object it was handed*.
Validating `[{Location, Kind}, …]`, a bad `Kind` in the second row yields `path: [1, "Kind"]`. That
path points into the **data structure**, not the document. **Remap** = translating that data-path
(`[1, "Kind"]`) into a **source position** (`line: 49`) — mapping *back* from "where in the value"
to "where in the file."

## Reaching "leaf interiors" (granularity)

A *leaf* is a block validated by Zod (a table, list, code block, the frontmatter object). Its
*interior* is the parts inside it — individual cells, list items, frontmatter keys. "Reach leaf
interiors" is about **granularity**: can a finding point at *row 2's Kind cell* (line 49), or only
at *the table as a whole* (line 46)? The former needs the remap to resolve interior paths.

## How it works — clean value + position lookup (not virtual text)

It does **not** validate over text. The projection is a *structured object* whose nodes also store
the source positions they came from. Zod validates the **clean data** (no positions in it); the
projection node separately carries the positions; the engine does the lookup *after* Zod returns
(the rejected alternative — baking `{value, pos}` into every cell and having Zod reach into `.value`
— pollutes the model). Worked example:

```text
Source (absolute file lines)        Projection node (data + positions)
44  ## Files                        { kind: "table",
45                                     columns: ["Location","Kind"],
46  | Location | Kind |               rows: [["a.ts","add"], ["b.ts","frob"]],
47  | -------- | ---- |               rowLines: [48, 49],   // ← absolute, one per data row
48  | a.ts | add  |                    pos: { line: 46 } }   // ← the table block's own line
49  | b.ts | frob |   ← bad Kind

Zod validates the CLEAN value:  [{Location:"a.ts",Kind:"add"}, {Location:"b.ts",Kind:"frob"}]
Zod issue:                      { path: [1, "Kind"], message: "invalid enum value" }
Engine remap:                   path head [1] → rowLines[1] → 49
Finding:                        { id: "content/table/cell", pos: { line: 49 }, … }
```

So: **Zod reports a path into the value → the engine looks up that path's source line on the
position-carrying projection node → the finding carries the line.**

Positions are **absolute and document-rooted** — `pos.line` is the real file line (49), 1-based from
the top of the document, straight from mdast's `position.start` (already absolute). Not
node-relative (that would be useless for `<file>:<line>` reporting). The projection just threads
mdast's absolute positions through; `rowLines[1] = 49` is the actual line. List items map the same
way (`path: [3] → items[3].pos`), and frontmatter keys via `keyLines["status"]` (E2).

## Present-but-wrong vs absent (the precision ceiling)

The remap can only land on a position that **exists in the source**. Zod failures split in two, and
this is where A3 meets A2:

| Failure kind | Zod issue | Source position? | Where the finding points |
|---|---|---|---|
| **Value present but invalid** | bad enum, wrong type, too long (`frob` in a Kind cell) | yes — the value is in the source | the exact interior line (row/item/key) — full precision |
| **Value absent / should-exist** | missing required key, missing declared column, too-few rows | no — there's nothing in the source to point at | the **nearest existing container** (the row, else the table/frontmatter block, else the section heading) — A2's rule |

So leaf localization is precise *exactly when the offending value exists*. An **absence inside a
leaf** has no interior position and inherits **A2's nearest-container fallback** — the message can
read "expected in `<container>`." A3 (remap) handles present-but-wrong; A2 handles absent; they
compose — the remap resolves a path to a node, and if that node doesn't exist *because the value is
absent*, it climbs to the parent that does. (Zod even labels the two: an `invalid_type` with
`received: "undefined"` / a `required`-style issue is the absent case.)

## Options

| Option | What's settled now | Risk |
|---|---|---|
| 1. Defer entirely to S7 | nothing; C1/C3/E2 stay blocked | the dependent items can't resolve |
| 2. **Commit the contract, gate the impl (rec)** | remap covers leaf interiors at **line** granularity; present-but-wrong → exact line, absent → A2 container; projection must carry per-row/item/key positions | S7 still proves the Zod-v4/Bun plumbing |
| 3. Commit fully (contract + cell-column precision) | also pins `SourcePos.col` per cell in v1 | over-commits a precision we may not need; couples to C3 |

## Recommended resolution

**Option 2.** Commit the *contract*; keep *implementation feasibility* as spike S7.

- The engine owns a remap: a leaf Zod issue's `path` head resolves to the projection node it indexes
  (table row → `rowPos`; list item → `ListItem.pos`; frontmatter key → `keyLines`); the finding
  takes that node's `pos`.
- **Granularity = line** (row / item / key) in v1. Cell-column (`SourcePos.col`) precision is
  deferred — that's C3's call.
- **Present-but-wrong** lands on the exact interior line; **absent / should-exist** falls back to
  the nearest existing container per A2 (so the two foundations compose, no new rule).
- The projection's per-row/item/key positions become a hard requirement (S6 builds table/list
  positions; E2 the frontmatter `keyLines`).
- **S7** narrows to one thing: prove Zod v4 under Bun exposes issue paths cleanly enough to drive
  this. The contract holds regardless of how the plumbing lands.

## Decision

**Resolved (2026-06-19): Option 2.** The engine owns a remap from a leaf Zod issue's `path` to a
`SourcePos`, resolving the path head to the projection node it indexes (table row → `rowPos`; list
item → `ListItem.pos`; frontmatter key → `keyLines`); the finding takes that node's `pos`. **Line**
granularity in v1; cell-column (`SourcePos.col`) precision deferred to C3. **Present-but-invalid**
values land on the exact interior line; **absent / should-exist** failures fall back to the nearest
existing container per A2 (message "expected in `<container>`"). The projection must carry
per-row/item/key positions (S6 + E2 implement it). Spike **S7** narrows to proving Zod v4 exposes
issue paths cleanly under Bun; the contract holds regardless. Fold into proposed-shape.md §4 at H1.
