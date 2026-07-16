---
title: Findings & rule IDs
description: The finding data model and the complete catalog of engine-emitted rule IDs, with each rule's plane, default severity, and trigger.
---

Every problem `markdown-contract` reports is a **finding** — a small, uniform record carrying a
stable rule id, a severity, a location, and a human message. A validation run produces a
`Finding[]`; the CLI and the data helpers are just different renderings of that array.

This page is the reference for the finding shape and the full rule-id catalog. For how findings
flow through a run see [How it works](/how-it-works/); for the typed model they annotate see the
[Model reference](/reference/model/).

## Finding shape

A finding is a plain object with this shape (`Finding`, from the core `types`):

```ts
interface Finding {
  id: string;              // namespaced "area/.../name", e.g. "structure/section-missing"
  level: "error" | "warn" | "report";
  path: string;            // the source document's file path (for "<path>:<line>")
  pos?: SourcePos;         // omitted for whole-document / absence findings
  message: string;
  hint?: string;           // the nearest authored description in scope (D-0020)
  fix?: { description: string; edit?: TextEdit };
}
```

| Field | Meaning |
| --- | --- |
| `id` | The rule id — a namespaced `area/.../name` string. Stable across runs; safe to filter and route on. See the [catalog](#rule-id-catalog) below. |
| `level` | Severity: `error`, `warn`, or `report`. Contract data, not a call-site choice — see [Levels](#levels). |
| `path` | The document's file path, as stamped from `ctx.path`. This is a filesystem path for the `<path>:<line>` rendering, **not** a structural path into the document. |
| `pos` | The source position when the finding is position-pinned; **omitted** for whole-document and absence findings (e.g. a missing required section that has no line to point at). |
| `message` | A ready-to-print human sentence. |
| `hint` | Authored guidance — see [Hints](#hints) below. **Absent** (not `undefined`) when no description is in scope, so a description-free contract's findings are byte-identical to a pre-D-0020 build's. |
| `fix` | Optional, **provisional**. It only *describes* a remedy — the engine never edits documents. |

`pos` is a `SourcePos`: a 1-based `line` and an optional 1-based `col`.

```ts
interface SourcePos {
  line: number;
  col?: number;
}
```

:::caution[Planned]
`fix` is forward-looking. A `Finding` may describe a repair, but this engine never applies one —
applying edits is a separate repair pass that is not yet built. Treat `fix` as advisory metadata.
:::

## Hints

A [declarative contract](/reference/yaml/) may carry a `description` at (almost) every level:
the contract root, the body root, section/oneOf nodes, content leaves, and schema nodes. A
finding's `hint` is the **nearest enclosing description in scope at the mint site** (D-0020),
resolved outward:

1. the failing **schema node**'s own `description` (a frontmatter field, table cell, list item);
2. the **content leaf**'s `description` (`table` / `list` / `code`);
3. the enclosing **section** node's `description` (then ancestor sections);
4. the **body root** level's `description`;
5. the **contract root**'s `description`.

A finding minted where none of these is authored carries **no `hint` key at all** — a
description-free contract's findings are unchanged. The TS combinators carry the same
descriptions (`description` on `ContractDef`, level opts, section opts, and `.describe()` on
Zod schemas), so YAML/TS parity holds hint-for-hint.

## Levels

There are three severities:

| Level | Meaning |
| --- | --- |
| `error` | A contract violation. Blocks the strict door and drives a non-zero exit. |
| `warn` | A concern worth surfacing that does not fail the contract. |
| `report` | Informational — carried in the findings array, never fails anything. |

The crucial property: **severity is contract data, resolved from the rule id — not chosen where the
finding is raised.** A rule body names the *problem* (the id); the engine fills the default `level`
from the id → level registry. So `structure/section-missing` is `error` wherever it fires, and
`structure/heading-depth-jump` is `warn` wherever it fires. (A rule may still override its own level
where the surface allows it — see the [text plane](#text-plane) note.)

Two helpers key off `level`:

- `hasErrors(findings)` — true iff any finding is `error`-level. This is the strict-door gate and
  the exit-code gate.
- `countByLevel(findings)` — returns `{ error, warn, report }` counts. The CLI's human summary line
  reports the same breakdown.

Because only `error` findings gate, the CLI exits `1` exactly when `hasErrors` is true. See
[Exit codes](#output-formats) below and the [CLI reference](/reference/cli/).

:::note
`report` is a valid level, but **no built-in engine rule defaults to it** — every engine-emitted id
in the catalog below defaults to `error` or `warn`. `report` exists for custom `rule` / `docRule`
findings that opt into informational severity by supplying their own `level`.
:::

## Output formats

The CLI renders the same `Finding[]` three ways. Keep these brief; the flags live in the
[CLI reference](/reference/cli/).

| Format | Shape |
| --- | --- |
| `human` | One line per finding: `path:line level id — message`, grouped by file (first-seen order), then a blank line and a summary count line. A finding carrying a [`hint`](#hints) adds an indented `  hint: <text>` line beneath its own. A finding with no `pos` prints as just `path`. An empty corpus prints `No findings.` |
| `json` | The raw `Finding[]`, serialized with two-space indent. Round-trips through `JSON.parse`. |
| `sarif` | A valid SARIF 2.1.0 log — one run whose `tool.driver` is `markdown-contract`, `driver.rules` listing every distinct id seen, one `result` per finding, with a `region.startLine` when the finding has a `pos` (region omitted for whole-document findings). A finding's `hint` rides in the result's `properties: { hint }` bag. |

SARIF maps the three levels onto SARIF's vocabulary:

| Finding level | SARIF level |
| --- | --- |
| `error` | `error` |
| `warn` | `warning` |
| `report` | `note` |

**Exit codes:** `0` clean, `1` when any `error`-level finding is present, `2` for a usage or
config error.

## Rule-ID catalog

Every id below is emitted by the engine. Ids are grouped by **plane** — the stage that produces
them. Unless noted, the default level is `error`; the one exception is `structure/heading-depth-jump`
(`warn`).

### Structure plane

Presence, order, kind, and anchors of sections and blocks (the tree grammar). See
the [contract-authoring examples](/appendix/examples/author/).

| id | Default level | Fires when |
| --- | --- | --- |
| `structure/section-missing` | error | A required (non-`optional`) declared section has no matching heading at its level. |
| `structure/section-order` | error | Sections break declared order (`recognized-relative` or `strict`), or an unknown section appears where unknowns aren't admitted (no `gap()`; `allowUnknown: false` in TS, `additionalSections: false` in YAML). |
| `structure/duplicate-section` | error | A non-repeatable heading repeats at one level, or a second spelling fills an alias / `oneOf` slot already filled. |
| `structure/key-collision` | error | Two distinct headings at one level collapse to the same lowerCamelCase key. |
| `structure/gap-count` | error | The count of unknown sections admitted at a `gap()` falls outside the gap's `min` / `max`. |
| `structure/block-missing` | error | A section with a declared `content` leaf has no block (or none at the required `^anchor`). |
| `structure/block-kind` | error | The block filling a `content` slot is the wrong kind (e.g. a `list` where a `table` was declared). |
| `structure/anchor-missing` | error | A section's declared `^anchor` resolves to no block-bound or section-level anchor. |
| `structure/repeat-count` | error | A repeatable section's occurrence count is outside its declared `min` / `max`. |
| `structure/heading-depth-jump` | **warn** | A sub-heading nests more than one level below its parent (e.g. an H2 immediately followed by an H4). Scanned over the whole outline, contract or not. |

### Content plane

Data shape *inside* a block, once structure has confirmed the block is present and of the right
kind. (Presence and kind are structure's job; this plane never re-reports them.)

| id | Default level | Fires when |
| --- | --- | --- |
| `content/table/column-missing` | error | A declared table column is absent from the table's header. |
| `content/table/column-extra` | error | `extraColumns: "error"` and the table carries an undeclared column. |
| `content/table/min-rows` | error | The table has fewer rows than `minRows`. |
| `content/table/cell` | error | A declared per-cell schema (`cells`) rejects a cell value; pinned to the offending row. |
| `content/list/item-kind` | error | A list item fails the per-item check (`everyItem` in TS, `items` in YAML) — not a checkbox, or rejected by the item schema. |
| `content/list/min-items` | error | The list has fewer items than `minItems`. |
| `content/code/lang` | error | A code block's language does not match the declared `lang`. |
| `content/max-words` | error | A paragraph runs longer than `maxWords`. |

### Frontmatter plane

The frontmatter Zod schema, run over the parsed YAML. These ids are produced by **mapping each Zod
issue** to a frontmatter id (in the content plane's frontmatter matcher, `content.ts`), then
rewriting the message to lead with the offending key.

| id | Default level | Fires when (Zod issue) |
| --- | --- | --- |
| `frontmatter/required` | error | A required key is missing — an `invalid_type` issue whose value is `undefined`. |
| `frontmatter/type` | error | A key has the wrong type (`invalid_type` with a present value). Also the fallback for any unmapped Zod code. |
| `frontmatter/enum` | error | A value is outside the allowed enum / literal set (`invalid_enum_value` / `invalid_value`). |
| `frontmatter/unknown-key` | error | A strict object rejects an undeclared key (`unrecognized_keys`) — one finding per offending key, at that key's line. |
| `frontmatter/refine` | error | A `.refine()` / `.superRefine()` cross-field predicate fails (a Zod `custom` issue). |

:::note
The `frontmatter/*` ids are a *mapping* over Zod, not a fixed enumeration Zod emits. Other Zod codes
(`too_small`, `too_big`, `invalid_format`, …) are still reported — they fold into `frontmatter/type`
by default, while keeping Zod's own detail in the message.
:::

### Text plane

Declarative required / forbidden phrase checks (`requires` / `forbids` / `textRule`). All default to
`error`, and each entry may override its own level to `warn` via the spec's `level` (the spec permits
only `error` or `warn`).

| id family | Default level | Fires when |
| --- | --- | --- |
| `text/requires` | error (overridable) | A required phrase is absent from the bound scope (its `min: 1` shortfall). |
| `text/forbids` | error (overridable) | A forbidden phrase is present — one finding per hit, at the offending line. |
| `text/count` | error (overridable) | A `min` / `max` occurrence bound is violated (a shortfall or an overflow). |

:::note[Synthesized ids]
The `text/*` ids above are the finding **families** the registry keys off — not the exact strings
you'll see. The concrete id an entry emits is synthesized as
`text/<kind>/<scopeKey>/<patternHash>` (kind ∈ `requires` / `forbids` / `count`; `patternHash` is a
short FNV-1a hash of the normalized pattern), so it is stable across entry reordering and unique per
scope. An entry that sets an explicit `id` gets exactly that id back. The registry defaults key off
the bare `text/requires` / `text/forbids` / `text/count`; a synthesized id falls back to the same
`error` default. (`text/doc` is the whole-document `DocRule`'s own identity, not a finding id — its
findings still surface as synthesized `text/requires` / `text/forbids` / `text/count` under the
`doc` scope key.)
:::

### Custom rule ids

Beyond the engine ids above, findings raised through `rule(...)` / `docRule(...)` carry whatever id
their author minted, in an author-chosen namespace (e.g. `task/...`, `summary/...`). Their default
level is `error` unless the finding supplies its own `level`, or the id has a registered default.
These ids are contract-specific, not part of the fixed engine catalog.

## Filtering & selecting

`filterFindings(findings, { area?, ids? })` selects a subset:

- `area` keeps findings whose id is in that area — `{ area: "frontmatter" }` keeps every
  `frontmatter/*` finding (matching `id === area` or `id.startsWith(area + "/")`).
- `ids` keeps findings whose id is a member of the given set (any `Iterable<string>`).
- Given both, both must hold (intersection).

`formatFinding(f)` renders one finding as a single line — `[<id>] (<location>): <message>`, where
`<location>` is `findingLocation(f)`. Pass `{ style: "line" }` for the `[<id>] (line <n>): <message>`
form (the ` (line <n>)` is dropped when the finding has no `pos`).

`findingLocation(f, opts?)` returns just the location token:

- `<path>:<line>` (or the bare `<path>` when unpinned) under `{ withPath: true }`;
- else `line <n>` when the finding has a `pos`;
- else the `opts.root` fallback (default `<root>`).

These are the pure building blocks the model-facing renderers reuse. The CLI's `human` formatter
does **not** call them — it composes its own `path:line level id — message` lines directly (see
[Output formats](#output-formats)).

## See also

- [Model reference](/reference/model/) — the typed data a clean document projects to.
- [CLI reference](/reference/cli/) — flags, formats, and exit codes.
- [Author](/appendix/examples/author/) and [validate](/appendix/examples/validate/) example groups.
