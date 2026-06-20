> Question C1 for [[D-0014-markdown-structure-validation|D-0014]] — the `content/*` leaf-finding
> registry + default levels. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into proposed-shape.md at step H1.

# C1 · content/* namespace + levels

**Surfaced by:** [[09a-maxwords-exceeded|09a]], [[10a-table-empty-and-minrows|10a]],
[[10b-table-missing-column|10b]], [[11-typed-cells-enum-pattern|11]],
[[11a-cell-enum-violation|11a]], [[12a-non-checkbox-list-item|12a]], [[13a-code-wrong-lang|13a]],
[[20b-real-task-non-checkbox-acs|20b]].

## The question

A1 settled the shape (`content/<leaf>/<check>`, central registry, line `level` overridable per
contract). C1 just **enumerates the concrete leaf ids** and sets each one's **default level**.

## Default-level principle

Content assertions default `error` — the contract declared them, so a violation is a real failure.
The one exception is an **advisory budget** (`max-words`), which defaults `warn`. All overridable
per contract (severity is contract data, A1).

## Proposed registry (the `content/*` block)

| id | default level | fires when |
|---|---|---|
| `content/prose/max-words` | `warn` | a section's prose exceeds its word budget |
| `content/table/min-rows` | `error` | a table has fewer than `minRows` data rows |
| `content/table/column-missing` | `error` | a declared column is missing / header doesn't match |
| `content/table/cell` | `error` | a cell fails its `cells:` Zod schema (enum, pattern, …) |
| `content/list/every-item` | `error` | an item fails `everyItem` (e.g. not a checkbox) |
| `content/list/min-items` | `error` | a list has fewer than `minItems` |
| `content/code/lang` | `error` | a fenced code block's language doesn't match |

## Deferred to sibling items (noted, not decided here)

- `content/table/column-extra` (an *extra* undeclared column) — C2 (needs the `extraColumns` knob
  first; likely `warn`).
- `content/code/lang` absent-info-string vs wrong-tag nuance (one id? `warn` for absent?) — C4.
- `content/anchor-not-found` (a content-record anchor that resolves to nothing) — F3.

## Decision

**Resolved (2026-06-19).** The `content/*` registry block as proposed. Default-level principle:
`error` for content assertions, `warn` for the advisory `content/prose/max-words` budget; all
overridable per contract. Ids: `content/prose/max-words` (warn); `content/table/min-rows`,
`content/table/column-missing`, `content/table/cell`, `content/list/every-item`,
`content/list/min-items`, `content/code/lang` (all error). Deferred: `content/table/column-extra` →
C2, code-lang absent-vs-wrong nuance → C4, `content/anchor-not-found` → F3. Fold into
proposed-shape.md at H1 (the `content/*` registry block).
