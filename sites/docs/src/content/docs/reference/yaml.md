---
title: Declarative YAML reference
description: Author contracts and corpus config as data — the closed mcVersion 1 YAML vocabulary that compiles to the same Contract, and the same findings, as the combinators.
---

The `markdown-contract/declarative` entry point compiles YAML documents into the
same runtime objects the combinators build. A YAML-authored contract is
indistinguishable downstream: the [same typed model](/reference/model/) and the
[same findings](/reference/findings/) as the equivalent
[TypeScript contract](/reference/api/).

This page is the complete authoring vocabulary for `mcVersion: 1`. The
vocabulary is deliberately **closed** — every key documented here is compiled;
anything outside it is a `DeclarativeError` at load time, not a silently ignored
field.

```ts
import {
  loadContract,      // (yamlText)          => Contract
  loadContractFile,  // (path)              => Contract
  loadConfig,        // (yamlText, baseDir) => CorpusConfig
  loadConfigFile,    // (path)              => CorpusConfig
} from "markdown-contract/declarative";
```

See [the API reference](/reference/api/) for the runtime surface and
[getting started](/getting-started/) for building from source.

## Document envelope

Every declarative document is a YAML **mapping** with two required envelope keys.
They are validated once, before any kind-specific compilation.

| Key | Type | Meaning |
| --- | --- | --- |
| `mcVersion` | number | Format version. **`1` is the only supported value** in this build; any other value (or a non-number) throws. |
| `kind` | `contract` \| `config` | Which compiler the rest of the document is handed to. |

```yaml
mcVersion: 1
kind: contract
# … contract body …
```

:::note
`mcVersion` is the single version gate. A future `mcVersion: 2` would dispatch
here without touching the compilers. Invalid YAML, a non-mapping document, an
unsupported `mcVersion`, or a `kind` that is neither `contract` nor `config` is a
`DeclarativeError` — the format is never best-effort parsed.
:::

## Contract document

A `kind: contract` document has two optional planes: `frontmatter` (the YAML
frontmatter schema) and `body` (the section/structure grammar). Either or both
may be present.

```yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    title: { type: string, min: 1 }
    status: { enum: [draft, active, done] }
body:
  order: recognized-relative
  sections:
    - section: Summary
    - section: Details
```

### Frontmatter

`frontmatter` is a mapping with an optional `strict` flag and a `fields` map.

| Key | Type | Meaning |
| --- | --- | --- |
| `fields` | map of `key → schema` | Each key's schema, from the closed field vocabulary below. Compiles to a Zod object. |
| `strict` | boolean (default `false`) | When `true`, unknown frontmatter keys are rejected (`frontmatter/unknown-key`). Compiles to `z.strictObject`; otherwise `z.object`. |

Schema violations surface as `frontmatter/*` findings — see
[findings](/reference/findings/).

#### Field schema vocabulary

Each entry under `fields` (and each nested table cell, list item, array element,
or object field) is a **schema node**: a mapping with exactly one **base**
(`type`, `enum`, or `const`) plus optional constraints and wrappers.

**Base — pick exactly one:**

| Key | Value | Compiles to |
| --- | --- | --- |
| `type` | `string` \| `number` \| `boolean` \| `array` \| `object` | The typed schema (see per-type constraints below). |
| `enum` | non-empty list of **strings** | `z.enum([...])` over the listed strings. |
| `const` | string \| number \| boolean | `z.literal(value)`. |

A node with none of these — or with the deferred `$ref` code escape hatch — is a
`DeclarativeError`.

:::note
The same node vocabulary is reused across planes, so the emitted finding depends
on where the schema is bound: an `enum` mismatch on a frontmatter field is
`frontmatter/enum`, while the same node used as a table cell surfaces on the
content plane.
:::

**Per-type constraints:**

| `type` | Extra keys | Compiles to |
| --- | --- | --- |
| `string` | `format` (named format) **or** `min` / `max` / `pattern` | `z.string()` with `.min()` / `.max()` / `.regex(new RegExp(pattern))`, or the named format constructor. |
| `number` | `int` (boolean), `min`, `max` | `z.int()` when `int: true`, else `z.number()`, with `.min()` / `.max()`. |
| `boolean` | — | `z.boolean()`. |
| `array` | `of` (element schema, **required**), `min`, `max` | `z.array(<of>)` with `.min()` / `.max()` length bounds. |
| `object` | `fields` (map), `strict` (boolean) | A nested object schema — the same shape as the frontmatter `fields` map. |

:::caution
For `type: string`, a named `format` short-circuits: when `format` is present,
`min` / `max` / `pattern` on the same node are **not** applied. Use `pattern`
(with `min` / `max`) for constraints outside the named-format set.
:::

**Named string formats** (`type: string`, `format: <name>`) — the closed set:

| Group | Formats |
| --- | --- |
| Web / identity | `email`, `url`, `uuid`, `hostname` |
| ISO-8601 temporals | `datetime`, `date`, `time`, `duration` |
| Network | `ipv4`, `ipv6`, `cidrv4`, `cidrv6` |
| Id forms | `nanoid`, `cuid`, `cuid2`, `ulid` |
| Misc | `base64`, `emoji`, `e164` |

An unrecognized `format` is a `DeclarativeError` listing the allowed set.

**Wrappers** — applied on top of any base, so a field can combine them:

| Key | Value | Effect |
| --- | --- | --- |
| `nullable` | `true` | `.nullable()` — allows `null`. |
| `default` | any | `.default(value)`. |
| `optional` | `true` | `.optional()` — key may be absent. |

```yaml
fields:
  title:   { type: string, min: 1 }
  owner:   { type: string, format: email }
  version: { type: string, pattern: "^\\d+\\.\\d+\\.\\d+$" }
  weight:  { type: number, int: true, min: 0, max: 100, optional: true }
  tags:    { type: array, of: { type: string }, min: 1 }
  status:  { enum: [draft, active, done], default: draft }
  meta:
    type: object
    strict: true
    fields:
      created: { type: string, format: date }
```

### Body

`body` is a mapping describing the document's section structure. It compiles to
the `sections(opts, specs)` grammar.

**Level options** (on `body` and on any nested `children`):

| Key | Value | Meaning |
| --- | --- | --- |
| `order` | `none` \| `recognized-relative` \| `strict` | How strictly section order is enforced (`structure/section-order`). |
| `allowUnknown` | boolean | Whether headings not named by the grammar are tolerated. |
| `sections` | list of **nodes** (required) | The ordered section grammar (below). |

**Section-node grammar** — each entry in `sections` is a mapping with exactly
one of `section`, `oneOf`, or `gap`:

| Node key | Value | Compiles to |
| --- | --- | --- |
| `section` | heading name (string) | `section(name, opts)`. |
| `oneOf` | non-empty list of section names | `oneOf(names, opts)` — one of several allowed headings. |
| `gap` | `{ min?, max? }` | `gap(...)` — an unconstrained run of intervening content. |

Any node may carry `optional: true`, which wraps it in `optional(...)`.

**Options on a `section` / `oneOf` node:**

| Key | Value | Meaning |
| --- | --- | --- |
| `aliases` | list of strings (`section` only) | Alternate spellings accepted for the heading. |
| `anchor` | string | Require the section to carry a `^anchor` — a block-bound or section-level anchor inside the section (not on the heading line); absence is `structure/anchor-missing`, pinned at the heading. |
| `repeatable` | boolean | The slot may appear more than once (`structure/repeat-count`). |
| `min` / `max` | number | Repeat-count bounds. Valid only on a repeatable slot; `min ≤ max` — otherwise a build-time `ContractBuildError` raised by `section()` / `oneOf()`. |
| `content` | leaf or named-leaf map | Content requirements for the section body (below). |
| `children` | a nested body level | Sub-sections — recurses with its own `order` / `allowUnknown` / `sections`. |

:::note
`min` / `max` **on a section node** are repeat-count bounds. The `min` / `max`
**inside a `gap:` mapping** bound the size of the gap — a different axis.
:::

#### Content leaves

A section's `content` is either a **single leaf** (a one-key mapping) or a
**named-leaf map** — a record of `^anchor`-named leaves. Each leaf is one of:

| Leaf | Value | Compiles to |
| --- | --- | --- |
| `maxWords` | number | `maxWords(n)` — word budget for the section (`content/max-words`). |
| `code` | `{ lang? }` (string) | `code({ lang })` — require a fenced code block, optionally of a given language. |
| `table` | see below | `table(...)` — a table with named columns. |
| `list` | see below | `list(...)` — a list with item constraints. |

**`table` config:**

| Key | Value | Meaning |
| --- | --- | --- |
| `columns` | list of strings (**required**) | Expected column headers. |
| `cells` | map `column → schema` | Per-column cell schema (the closed field vocabulary). |
| `minRows` | number | Minimum data-row count. |
| `anchor` | string | Require a `^anchor` on the table. |
| `extraColumns` | `ignore` \| `error` | How to treat columns beyond `columns`. |

**`list` config:**

| Key | Value | Meaning |
| --- | --- | --- |
| `everyItem` | `checkbox` \| a schema | Constrain every item — a task-list checkbox, or a schema each item's text must satisfy. |
| `minItems` | number | Minimum item count. |
| `ordered` | boolean | Require an ordered (`true`) or unordered (`false`) list. |

```yaml
body:
  order: strict
  allowUnknown: false
  sections:
    - section: Overview
      content: { maxWords: 200 }
    - section: Tasks
      optional: true
      content:
        list: { everyItem: checkbox, minItems: 1 }
    - section: Fields
      content:
        table:
          columns: [name, type, required]
          minRows: 1
          cells:
            required: { enum: ["yes", "no"] }
    - section: Example
      children:
        order: none
        sections:
          - section: Input
          - section: Output
```

## Config document

A `kind: config` document is the data form of `defineConfig({ rules })`. It
compiles to the runner's [`CorpusConfig`](/reference/api/) — a list of routing
rules mapping globs to contracts.

| Key | Value | Meaning |
| --- | --- | --- |
| `rules` | list (**required**) | Ordered routing rules (below). |
| `contracts` | map `name → path` | Optional named-contract lookup, so a rule can reference a contract by name. |

**Each rule:**

| Key | Value | Meaning |
| --- | --- | --- |
| `include` | non-empty list of globs (**required**) | Files this rule matches. |
| `exclude` | list of globs | Files to remove from the match. |
| `contract` | name \| `.yaml` path \| inline contract | The contract to validate matched files against. |

**Contract references resolve three ways:**

- An **inline mapping** (`{ frontmatter?, body? }`) — compiled directly via
  `compileContractObject`, no envelope needed.
- A **name** — looked up in the `contracts` map; the mapped value is a path. Any
  string contract ref (a name or a path) also becomes the rule's label in the
  CLI run summary.
- A **path** — a string that is itself a `.yaml` / `.yml` path.

Relative paths resolve **relative to the config file's directory** (via
`loadConfigFile`); absolute paths are used as-is. A ref that is not a `.yaml` /
`.yml` file — e.g. a code-authored `.js` / `.ts` contract module — is rejected;
that is the deferred code escape hatch, out of scope in v1.

```yaml
mcVersion: 1
kind: config
contracts:
  capability: ./contracts/capability.contract.yaml
rules:
  - include: ["capabilities/**/*.md"]
    contract: capability          # by name
  - include: ["tasks/**/*.md"]
    exclude: ["tasks/_archive/**"]
    contract: ./contracts/task.contract.yaml   # by path
  - include: ["notes/**/*.md"]
    contract:                     # inline
      frontmatter:
        fields:
          title: { type: string, min: 1 }
```

:::note
Rule order is significant. See the [CLI reference](/reference/cli/) for how
`validate` consumes a config and its exit codes (`0` clean, `1` error-level
findings, `2` usage/config error).
:::

## Section text constraints — `requires` / `forbids`

A `section` node, and the `body` root, may carry `requires:` / `forbids:` lists
that constrain the section's (or the whole document's) text. Each is a list of
**match specs** compiled onto the `requires(...)` / `forbids(...)` / `textRule`
builders — the data-authoring twin of the TS text predicates (D-0011 / C-0009).

- On a **section node**, they compile to node-local rules over that section's
  subtree.
- On the **body root** (sibling of `sections:`), they compile to one
  document-scoped `textRule` (a `DocRule` whose id is `text/doc`).

Either surface emits the same findings as the equivalent TS builder: a missing
required phrase is `text/requires`, a present forbidden phrase is `text/forbids`,
and a violated `min` / `max` occurrence bound is `text/count`.

**Match-spec vocabulary** (closed — any other key is a `DeclarativeError`):

| Key | Value | Meaning |
| --- | --- | --- |
| `pattern` | string | A literal needle. |
| `regex` | string | A regex source. Exactly one of `pattern` / `regex` is required. |
| `normalize` | boolean | Whitespace-fold the literal before matching. |
| `ignoreCase` | boolean | Case-insensitive match. |
| `min` / `max` | number | Count bounds on occurrences (`text/count`). |
| `id` | string | Override the synthesized finding id. |
| `note` | string | Attach a note to the finding. |
| `level` | `error` \| `warn` | The finding level. |

```yaml
body:
  requires:
    - pattern: "Decision"
  sections:
    - section: Summary
      requires:
        - pattern: outcome
      forbids:
        - pattern: TBD
          level: warn
```

The compiler rejects authoring mistakes up front rather than letting them surface
as confusing findings: a **duplicate** matcher within one list (same needle /
`normalize` / `ignoreCase`), a `requires` / `forbids` **contradiction** over the
same literal `pattern` at one scope, or a count `max` below its effective floor.
Contradiction and duplicate detection over `regex` needles is byte-identity only
— no overlap analysis.

## YAML ⇄ TypeScript parity

The declarative front end is a pure front end. A `Contract` from `loadContract`
is the same object `contract(...)` builds from the combinators — same typed
model, same emitted findings (identical ids, levels, positions, messages). Pick
whichever authoring surface fits: data (YAML) for contracts that ship as config,
or code (TS) when you need the deferred escape hatches.

See the [API reference](/reference/api/) for the combinator surface,
[declarative-YAML examples](/examples/declarative-yaml/) for worked contracts,
and [real-world schemas](/examples/real-world-schemas/) for complete corpus
configs.
