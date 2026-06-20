> Question A1 for [[D-0014-markdown-structure-validation|D-0014]] — finding-id namespace + registry.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the decision
> once made, which is then folded into proposed-shape.md at step H1.

# A1 · Finding-id namespace + registry

**Surfaced by:** the finding ids used across the whole suite — representative:
[[01a-single-section-missing|01a]], [[10a-table-empty-and-minrows|10a]], [[13a-code-wrong-lang|13a]].

## The question

Every finding the validator emits carries an `id` (e.g. `structure/section-missing`). Two things are
unspecified: **(1)** the *shape* of that id, and **(2)** whether ids are managed in a **central
registry** or coined ad-hoc in rule code. A1 sets the convention that Phase B/C/E/F then populate —
so it goes first.

## Why it matters

- **Filtering & golden-pinning** — the ADR (Component 5) already commits to namespaced ids "for
  filtering and golden-pinning." A consumer disables `content/*` or asserts a fixture emits exactly
  `[structure/section-order]`. That needs a stable, structured id space.
- **On-thesis** — D-0014 exists to kill duplicated, divergent validation logic. Ad-hoc id strings
  scattered across rule code are the same failure mode in miniature (typos, two spellings of one
  concept, no single place to see the catalogue).
- **Severity is contract data** (Component 5) — a registry is the natural home for each id's
  *default* `level`, overridable per contract.

## Evidence from the example suite

The 54 cases coined finding ids freely, and they already drifted into **three different shapes**:

| Shape seen | Example | Cases |
|---|---|---|
| `structure/<name>` | `structure/section-missing`, `structure/section-order` | 01a, 04a, 09b, … |
| `<leaftype>/<name>` | `table/min-rows`, `code/lang` | 10a, 13a |
| `content/<name>` | `content/max-words` | 09a |

No id is enumerated anywhere — they exist only as strings inside example findings. That divergence
across one authored suite is the argument for pinning the scheme now.

## What to decide

### 1. Format — slash-delimited path (`area/…/name`)

Recommend a **slash-delimited path**: the first segment is the area, and ids are prefix-filterable
at *any* depth. Most are two segments (`structure/section-order`, `frontmatter/enum`); `content`
carries a leaf-type segment so it sub-categorizes (`content/table/min-rows`), letting a consumer
filter `content/*` (all leaf findings) or `content/table/*` (just tables). Rejected: nested object
keys (can't print in a flat `Finding`, awkward to filter), bare unprefixed strings (no grouping).

### 2. Areas — how many, and where do leaf findings live?

The real sub-choice. The suite drifted between two schemes:

| | Top-level areas | Leaf id example | Filter leaf findings |
|---|---|---|---|
| **5-area (recommended)** | `structure` · `content` · `frontmatter` · `rule` · `contract` | `content/table/min-rows` | `content/*`, `content/table/*` |
| Per-leaf-type | `structure` · `table` · `list` · `code` · `frontmatter` · `rule` · `contract` | `table/min-rows` | `table/*` + `list/*` + `code/*` |

The 5-area scheme keeps the top-level count small while still sub-categorizing: `content` carries a
leaf-type segment (`content/table/min-rows`, `content/list/every-item`), so `content/*` filters all
leaf findings and `content/table/*` just the table ones — the broader categorization without minting
top-level areas. Per-leaf-type instead promotes `table`/`list`/`code` to top-level areas,
multiplying them and splitting "leaf findings" across three.

**The five areas, defined.** The first three plus `contract` are engine-reserved; `rule` is the open
space contract authors emit into. Only `contract/*` fires at build time — the rest are per-document.

| Area | Findings about… | Raised by | When | Example ids |
|---|---|---|---|---|
| `structure` | the section grammar — presence, order, nesting, and identity of headings | the content-model matcher | per-document | `structure/section-missing`, `structure/section-order`, `structure/duplicate-section`, `structure/anchor-missing` |
| `content` | leaf content *inside* a matched section or block — sub-segmented by leaf type (`table` / `list` / `code` / `prose`) | the Zod leaf schemas | per-document | `content/table/min-rows`, `content/table/column-missing`, `content/list/every-item`, `content/code/lang`, `content/prose/max-words` |
| `frontmatter` | the YAML frontmatter plane — field types, enums, required, unknown keys | the frontmatter Zod schema | per-document | `frontmatter/enum`, `frontmatter/unknown-key`, `frontmatter/required` |
| `rule` | custom `rule()` / `docRule()` callbacks, including cross-plane checks | author-supplied functions | per-document | author-chosen — commonly domain-namespaced (`task/completion-note-when-closed`) rather than a literal `rule/…` prefix |
| `contract` | the contract *itself* — raised while building it, before any document is parsed | contract construction | build-time | `contract/key-collision`, `contract/malformed` |

`rule` is deliberately open: the engine reserves the other four namespaces and never mints ids
there, so a contract author's domain ids (e.g. `task/*`, `skill/*`) can't collide with engine
findings. Depth is allowed but not required — `structure`/`frontmatter` stay two-segment today; the
scheme permits `structure/order/…` later if a category ever needs it.

### 3. Registry — central, enumerated

Recommend a **single registry module** (`finding-ids.ts`, a `FINDINGS` const) mapping each id →
`{ area, level, message }`. Rules emit by registry key, never an inline string. `level` is the
default, overridable per contract. The parity goldens and any docs page generate from this one
table.

## Recommended resolution

- Slash-delimited path ids, prefix-filterable at any depth.
- Five top-level areas: **`structure`, `content`, `frontmatter`, `rule`, `contract`**. `content` is
  sub-segmented by leaf type — `content/<leaf>/<check>` (e.g. `content/table/min-rows`) — so both
  `content/*` and `content/table/*` filter.
- One central registry; rules emit by key; registry carries default `level` + message template.

Illustrative starter registry (the full set is filled in as B/C/E/F resolve):

```ts
const FINDINGS = {
  "structure/section-missing":     { area: "structure",   level: "error", message: "…" },
  "structure/section-order":       { area: "structure",   level: "error", message: "…" },
  "structure/duplicate-section":   { area: "structure",   level: "error", message: "…" },
  "structure/anchor-missing":      { area: "structure",   level: "error", message: "…" },
  "content/prose/max-words":       { area: "content",     level: "warn",  message: "…" },
  "content/table/min-rows":        { area: "content",     level: "error", message: "…" },
  "content/table/column-missing": { area: "content",     level: "error", message: "…" },
  "content/list/every-item":       { area: "content",     level: "error", message: "…" },
  "content/code/lang":             { area: "content",     level: "error", message: "…" },
  "frontmatter/enum":              { area: "frontmatter", level: "error", message: "…" },
  "contract/key-collision":        { area: "contract",    level: "error", message: "…" }, // build-time
} as const;
```

## Decision

**Resolved (2026-06-19):** slash-delimited path ids, prefix-filterable at any depth; one central
`FINDINGS` registry (id → `{ area, level, message }`), rules emit by key, `level` overridable per
contract. Five top-level areas — `structure`, `content`, `frontmatter`, `rule`, `contract` (first
three + `contract` engine-reserved; `rule` the open author space; `contract/*` the only build-time
area). **`content` sub-segments by leaf type**: `content/<leaf>/<check>` (`content/table/min-rows`,
`content/table/column-missing`, `content/list/every-item`, `content/code/lang`,
`content/prose/max-words`) so `content/*` and `content/table/*` both filter. Depth allowed, not
required, elsewhere. Fold into proposed-shape.md at H1 (§4 `Finding`, plus a registry note).
