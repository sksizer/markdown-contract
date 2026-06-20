> Question C3 for [[D-0014-markdown-structure-validation|D-0014]] — per-row/item/cell finding
> granularity + aggregation. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into proposed-shape.md at step H1.

# C3 · per-row/item/cell pos + aggregation

**Surfaced by:** [[11-typed-cells-enum-pattern|11]], [[11a-cell-enum-violation|11a]],
[[12a-non-checkbox-list-item|12a]], [[20b-real-task-non-checkbox-acs|20b]].

## What A3 already settled

Line granularity; the projection carries per-row/item/key positions; present-but-wrong leaf failures
land on the exact interior line. C3 decides the **count** (one finding per failing element vs an
aggregate) and confirms two follow-ons.

## Part 1 — aggregation: one finding per failing element

**Recommend: one finding per failing cell / item**, each at its own row/item line. A whole-leaf Zod
schema already returns *one issue per failing element*, and the A3 remap turns each into one finding
— so this is also the natural mechanism. It matches the per-offending-node pattern used everywhere
else (B2 per duplicate, B5 per out-of-order section): precise, individually clickable.

- e.g. a checkbox list with 2 non-checkbox items → two `content/list/every-item` findings, at each
  item's line.
- **Separate, also-deferred idea (not Part 2):** if a pathological table had 20 rows all failing the
  same *table column*, one-per-element gives 20 findings. A future opt-in could aggregate
  **per table column** ("the `Kind` column has 20 invalid cells" → one finding). That's about the
  vertical column and a failure *count* — distinct from Part 2's character-column precision. Not v1.

## Part 2 — cell-column precision (the character `col`): deferred (confirms A3)

This is **`SourcePos.col` — the character position on a line** — *not* a table column.
`SourcePos = { line; col? }`: `line` is the file line, `col` is how far across it the cursor sits.

- **v1:** a cell finding carries `pos = { line: 49 }` → clicking lands on **row 49** (the row's
  line).
- **Full precision (deferred):** also set `col` → `{ line: 49, col: 23 }` → cursor lands exactly on
  the offending cell's text within the row.

Deferring it just means we don't compute the character offset yet; line granularity locates the fix,
and `col?` is already optional, so adding it later is non-breaking. Unrelated to row-failure counts
or aggregation (that's the per-table-column idea above).

## Part 3 — `ListItem` gains a `pos`

The projection's `ListItem` carries `pos: SourcePos` (and tables carry per-row lines), so a
list/cell finding can resolve to its element — the projection requirement A3 named, confirmed here.

## Decision

**Resolved (2026-06-19).** **One finding per failing cell/item** (each Zod issue → one finding at
its row/item line, via the A3 remap) — not aggregated. **Cell character-`col` precision deferred**
(findings carry the line; `SourcePos.col?` stays optional → non-breaking to add later).
**`ListItem` gains `pos: SourcePos`** (tables already carry per-row lines). Separately deferred, not
v1: a per-table-column aggregate for pathologically large failures. Fold into proposed-shape.md at
H1 (§2 `ListItem.pos`; §4 note that leaf findings are one-per-failing-element).
