> Question C2 for [[D-0014-markdown-structure-validation|D-0014]] — extra/undeclared table columns.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# C2 · table extra columns

**Surfaced by:** [[10b-table-missing-column|10b]], [[10c-table-extra-column|10c]].

## The question

`table({ columns })` asserts a *lower bound* — the declared columns must be present. A table with an
**extra, undeclared** column currently can't be reported (the OOM tolerates it and types it as
`string`), so case 10c's failure is unreachable. Two bits: **(1)** add a knob to opt into rejecting
extras, with what default; **(2)** is "missing column" the same id as "extra column", or two.

## Part 1 — the knob + default

Add `extraColumns?: "ignore" | "error"` to `table()`, **default `"ignore"`**. Most tables carry
columns the contract doesn't constrain (and the OOM already exposes them as `string`); silently
accepting extras is the right default. A contract that wants a *closed* column set opts into
`"error"`.

When `extraColumns: "error"`, an undeclared column emits `content/table/column-extra` — `error`
level (the author explicitly asked for strictness), `pos` = the extra column's header cell, message
names the column: `Unexpected column "Notes" — table columns are closed`.

## What `ignore` means — validation only, not the model

`extraColumns` governs **validation**, not the OOM. In *both* modes the extra column's data is
retained in the projection and reachable from the model; the flag only decides whether an undeclared
column emits `content/table/column-extra`.

Exposure, identical in both modes:

- `table.columns` lists **all** columns in the document (declared + extra) — runtime data.
- The **inferred** `Row` type (`Infer<Contract>` — TypeScript's own inference over the contract
  literal, the same mechanism as Zod's `z.infer`, compile-time only and erased at runtime) carries
  **only the contract-declared columns**, since it's computed from the contract, not from any given
  document. `row.Kind` is in the inferred type; `row.Notes` (undeclared) is not.
- Extra columns are read **dynamically**: `row.cell("Notes") → string | undefined`. The data is
  there at runtime; it's just not in the inferred type, so you reach it by name rather than as a
  field. (An index signature `Row & Record<string, string>` was rejected — it would put *every*
  string key into the inferred type, so `row.kindTypo` would infer as `string`, killing
  typo-detection on the declared columns.)

So `"ignore"` = extras are allowed *and still readable*, just not flagged; `"error"` = same data, a
finding fires. Ignoring never loses the column — which is why it's the safe default.

## Part 2 — one id or two

**Two distinct ids.** They're opposite, independently-configured problems:

| id | fires | default behaviour |
|---|---|---|
| `content/table/column-missing` | a *declared* column is missing / header doesn't match (C1) | always on (`error`) |
| `content/table/column-extra` | an *undeclared* column appears | only under `extraColumns: "error"` |

Two ids read directionally ("missing X" vs "unexpected Y") and let a consumer filter/treat them
separately. One shared id would need the message to carry the direction anyway, and couples two
different toggles.

## Decision

**Resolved (2026-06-19).** Add `extraColumns?: "ignore" | "error"` to `table()`, default `"ignore"`
— extras are allowed and still readable via `row.cell(name)` (not in the inferred type); `"error"`
opts into rejecting them. **Two directional ids:** `content/table/column-missing` (a declared column
absent / header wrong — always-on `error`; **renamed from `column-mismatch`** to mirror
`section-missing`) and `content/table/column-extra` (an undeclared column — fires only under
`extraColumns: "error"`, `error` level). A wrong header decomposes into `column-missing` +
`column-extra` (no separate "mismatch" concept). **Columns stay flat** — no column-order / alias /
duplicate validation (that vocabulary belongs to the section grammar; a table is one leaf).
`extraColumns` governs *validation* only; the OOM retains all columns either way. Fold into
proposed-shape.md at H1 (`table()` gains `extraColumns?`; the two registry entries).
