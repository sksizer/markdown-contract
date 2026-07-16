---
title: Declarative YAML reference
description: Author contracts and corpus config as data — the closed mcVersion 2 YAML vocabulary that compiles to the same Contract, and the same findings, as the combinators.
---

The `markdown-contract/declarative` entry point compiles YAML documents into the
same runtime objects the combinators build. A YAML-authored contract is
indistinguishable downstream: the [same typed model](/reference/model/) and the
[same findings](/reference/findings/) as the equivalent
[TypeScript contract](/reference/api/).

This page is the complete authoring vocabulary for `mcVersion: 2`. The
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
| `mcVersion` | number | Format version. **`2` is the only supported value** in this build; any other value (or a non-number) throws. |
| `kind` | `contract` \| `config` | Which compiler the rest of the document is handed to. |

```yaml
mcVersion: 2
kind: contract
# … contract body …
```

:::note[mcVersion 1 is retired]
The original `mcVersion: 1` house dialect (D-0008) is retired (D-0020). A v1
document gets a dedicated error naming the codemod:

> mcVersion 1 is retired; run `bun packages/core/scripts/migrate-v1-to-v2.ts --write <file>` to migrate (D-0020)

The codemod is mechanical, preserves comments and key order, and warns on the
one behavioral hazard (v1 `format` short-circuited its sibling constraints; v2
composes them — see [strings](#per-type-constraints) below).

Invalid YAML, a non-mapping document, an unsupported `mcVersion`, or a `kind`
that is neither `contract` nor `config` is a `DeclarativeError` — the format is
never best-effort parsed.
:::

## Editor completion — `$schema`

The v2 vocabulary is published as a JSON Schema 2020-12 meta-schema at
[`/schema/mcv2.json`](/schema/mcv2.json). Point `yaml-language-server` (VS Code's
YAML extension, and most other editors) at it with a modeline for completion and
inline validation while authoring:

```yaml
# yaml-language-server: $schema=https://markdown-contract-docs.pages.dev/schema/mcv2.json
mcVersion: 2
kind: contract
```

The meta-schema is a faithful mirror of the compiler's closed vocabulary; the
compiler remains the source of truth (its errors carry migration hints and
did-you-mean suggestions the editor cannot).

## Contract document

A `kind: contract` document has two optional planes — `frontmatter` (the YAML
frontmatter schema) and `body` (the section/structure grammar) — plus an optional
root `description`. The contract root is **closed**: any key beyond the envelope
and these three is rejected.

```yaml
mcVersion: 2
kind: contract
description: a work-item note            # the outermost hint fallback
frontmatter:
  type: object
  required: [title]
  properties:
    title: { type: string, minLength: 1 }
    status: { enum: [draft, active, done] }
body:
  order: recognized-relative
  sections:
    - section: Summary
    - section: Details
```

`description` is accepted at (almost) every level of a contract — the contract
root, the body root, section/oneOf nodes, content leaves, and schema nodes. It
becomes the `hint` a finding carries: the nearest enclosing description in scope
at the mint site wins (see [findings](/reference/findings/#finding-shape)).

### Frontmatter

`frontmatter` is itself a **schema node** with an explicit `type: object` — the
same node vocabulary as any nested object (below). v2 frontmatter is JSON Schema
spelling: `properties` / `required` / `additionalProperties`, not v1's `strict` /
`fields`.

```yaml
frontmatter:
  type: object
  additionalProperties: false     # reject undeclared keys (frontmatter/unknown-key)
  required: [id, status]          # everything NOT listed here is optional
  properties:
    id: { type: string, pattern: '^D-[0-9A-Z]{4}$' }
    status: { enum: [open, closed] }
    reviewer: { type: string, format: email }
```

Schema violations surface as `frontmatter/*` findings — see
[findings](/reference/findings/).

#### Schema nodes — the JSON Schema 2020-12 subset

Each schema node (a frontmatter field, a nested object property, an array
`items`, a table cell, a list item schema) is a mapping with **exactly one
base selector** — `type`, `enum`, or `const` — plus that shape's constraint
keys. Every node also admits `default` and `description`.

**Base — pick exactly one:**

| Key | Value | Compiles to |
| --- | --- | --- |
| `type` | `string` \| `number` \| `integer` \| `boolean` \| `array` \| `object`, or the null union `[T, "null"]` | The typed schema (per-type constraints below). |
| `enum` | non-empty list of **strings** | `z.enum([...])` over the listed strings. |
| `const` | string \| number \| boolean (validated) | `z.literal(value)`. |

Nullability is the two-element type union — `type: [string, "null"]` (either
order) — not v1's `nullable: true`. Any other union form is outside the subset.

:::caution[Optional by default]
**Properties are OPTIONAL unless listed in `required`.** This is JSON Schema's
model and the **inversion of v1**, where every field was required unless flagged
`optional: true`. When migrating by hand, an empty or missing `required` list
means *nothing* is required. Each entry in `required` must name a declared
property — a stray name is a compile error, not a silent no-op.
:::

**Per-type constraints:**

| `type` | Extra keys | Compiles to |
| --- | --- | --- |
| `string` | `minLength` / `maxLength` / `pattern` / `format` | `z.string()` (or the named format constructor) with `.min()` / `.max()` / `.regex(new RegExp(pattern))` chained on. |
| `number` | `minimum` / `maximum` | `z.number()` with `.min()` / `.max()`. |
| `integer` | `minimum` / `maximum` | `z.int()` with `.min()` / `.max()` (v1's `int: true`). |
| `boolean` | — | `z.boolean()`. |
| `array` | `items` (element schema, **required**), `minItems` / `maxItems` | `z.array(<items>)` with `.min()` / `.max()` length bounds. |
| `object` | `properties` (map, **required**), `required` (list of declared names), `additionalProperties` (boolean) | A nested object schema — `additionalProperties: false` compiles to `z.strictObject`, otherwise `z.object`. |

`additionalProperties` accepts only a **boolean** in the subset — the JSON
Schema "schema form" (`additionalProperties: { type: … }`) is rejected.

:::note[format composes]
In v2 a named `format` **composes** with `minLength` / `maxLength` / `pattern`
on the same node — the constraints chain onto the format constructor. (v1's
short-circuit, where a `format` silently disabled its sibling constraints, is
gone; the codemod drops such inert siblings with a warning so findings stay
identical.)
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

**`default` — a documented divergence.** A `default` **actively fills** the
value when the key is absent: the compiled Zod schema substitutes it, so the
[typed model](/reference/model/) reads the default back. This is the
`ajv useDefaults: true` stance, not vanilla JSON Schema's annotation-only
`default`. A defaulted property never needs to be in `required`.

**`description`** on a schema node is stored via `.describe()` and becomes the
`hint` on findings that fail that node (e.g. a missing required field carries
its own description; see [findings](/reference/findings/#finding-shape)).

```yaml
properties:
  title:   { type: string, minLength: 1 }
  owner:   { type: string, format: email }
  version: { type: string, pattern: "^\\d+\\.\\d+\\.\\d+$" }
  weight:  { type: integer, minimum: 0, maximum: 100 }
  due:     { type: [string, "null"], format: date }
  tags:    { type: array, items: { type: string }, minItems: 1 }
  status:  { enum: [draft, active, done], default: draft }
  meta:
    type: object
    additionalProperties: false
    properties:
      created: { type: string, format: date, description: creation date, ISO }
```

#### What a schema node rejects

The vocabulary is closed **per node shape** (v1 silently ignored unknown schema
keys; v2 does not). After the base is picked, every present key must be in that
shape's allowed set. Rejections speak three distinct dialects:

1. **A v1 spelling** gets a migration hint naming the v2 form:

   ```text
   frontmatter.tags: 'of' is the v1 spelling — v2 uses 'items' (see the v1→v2 codemod)
   ```

2. **Recognized JSON Schema outside the subset** is named as such:

   ```text
   frontmatter.id: 'oneOf' is JSON Schema outside the supported v2 subset
   ```

3. **Anything else** is an unknown key, with a did-you-mean suggestion when a
   supported key is within edit distance 1–2:

   ```text
   frontmatter.title: unknown key 'minLenght' (did you mean 'minLength'?)
   ```

**What's outside the subset** — recognized JSON Schema 2020-12 keywords that are
deliberately rejected by name (class 2 above): composition (`oneOf`, `anyOf`,
`allOf`, `not`, `if` / `then` / `else`), references (`$ref`, `$defs`, `$id`,
`$schema`, `$comment`), tuple/array extras (`prefixItems`, `contains`,
`minContains`, `maxContains`, `uniqueItems` — note `minContains` / `maxContains`
ARE the [body grammar's](#occurrence--mincontains--maxcontains) occurrence keys,
just not schema-node keys), object extras (`patternProperties`, `propertyNames`,
`minProperties`, `maxProperties`, `dependentRequired`, `dependentSchemas`,
`unevaluatedProperties`), numeric extras (`multipleOf`, `exclusiveMinimum`,
`exclusiveMaximum`), content/annotation (`unevaluatedItems`, `contentEncoding`,
`contentMediaType`, `title`, `examples`, `deprecated`, `readOnly`, `writeOnly`).

:::note[Fidelity: JSON-Schema-compatible spelling, Zod-defined semantics]
v2 borrows JSON Schema's **spelling**, but the semantics are defined by what the
node compiles to in Zod (and its matched Rust runtime) — not by a JSON Schema
validator. Where the two could differ, the compiled behavior wins: `default`
actively fills (above), `enum` is strings-only, `const` is scalar-only,
`additionalProperties` is boolean-only, and everything outside the subset is
rejected by name rather than ignored. A v2 document is *readable* as JSON
Schema; it is *executed* as the engine's schema runtime.
:::

### Body

`body` is a mapping describing the document's section structure. It compiles to
the `sections(opts, specs)` grammar.

**Level options** (on `body` and on any [hoisted nested level](#nested-sections--hoisted)):

| Key | Value | Meaning |
| --- | --- | --- |
| `order` | `none` \| `recognized-relative` \| `strict` | How strictly section order is enforced (`structure/section-order`). |
| `additionalSections` | boolean | Whether headings not named by the grammar are tolerated (v1's `allowUnknown`). |
| `sections` | list of **nodes** (required) | The ordered section grammar (below). |
| `description` | string | The level's hint — carried by findings minted at this level with no nearer description. |

The **body root** additionally admits [`requires` / `forbids`](#section-text-constraints--requires--forbids).

**Section-node grammar** — each entry in `sections` is a mapping with exactly
one of `section`, `oneOf`, or `gap`:

| Node key | Value | Compiles to |
| --- | --- | --- |
| `section` | heading name (string) | `section(name, opts)`. |
| `oneOf` | non-empty list of section names | `oneOf(names, opts)` — one of several allowed headings. |
| `gap` | empty, or `{ min?, max? }` | `gap(...)` — an unconstrained run of intervening content. A `gap` node admits **only** the `gap` key. |

**Options on a `section` / `oneOf` node:**

| Key | Value | Meaning |
| --- | --- | --- |
| `aliases` | list of strings (`section` only) | Alternate spellings accepted for the heading. (A `oneOf` IS an alias set, so it takes none.) |
| `anchor` | string | Require a `^anchor` on the section heading (`structure/anchor-missing`). |
| `minContains` / `maxContains` | non-negative integers | The occurrence window (below). |
| `content` | leaf or named-leaf map | Content requirements for the section body (below). |
| `sections` (+ `order`, `additionalSections`) | a hoisted nested level | Sub-sections, directly on the node (below). |
| `requires` / `forbids` | match-spec lists | Node-local [text constraints](#section-text-constraints--requires--forbids). |
| `description` | string | The section's hint. |

#### Occurrence — `minContains` / `maxContains`

v2 spells occurrence with JSON Schema's counting names, replacing v1's
`optional` / `repeatable` / `min` / `max`:

| Declared | Window | Meaning |
| --- | --- | --- |
| *(both absent)* | exactly once | A plain slot — the section must appear exactly one time. |
| `minContains: 0`, `maxContains: 1` | 0–1 | **Optional**, at most once. |
| `minContains: 0` | 0–∞ | Optional and repeatable. |
| `maxContains: 5` | 1–5 | Required, up to five occurrences. |
| `minContains: 2` | 2–∞ | At least twice, unbounded. |
| `minContains: 3`, `maxContains: 3` | exactly 3 | A fixed count. |

The defaults once **either** key appears: `minContains` defaults to **1**,
`maxContains` defaults to **unbounded**. Bounds must be non-negative integers
with `maxContains ≥ 1` (to forbid a section, leave it undeclared) and
`maxContains ≥ minContains`. Repeat-count violations surface as
`structure/repeat-count`.

#### Nested sections — hoisted

A nested level sits **directly on the section node**: `sections` (plus optional
`order` / `additionalSections`) — v1's `children:` wrapper is gone. Declaring
`order` or `additionalSections` on a node **without** a `sections` list is a
compile error (level knobs with no level to govern).

```yaml
- section: Example
  order: none
  sections:
    - section: Input
    - section: Output
```

#### Content leaves

A section's `content` is either a **single leaf** (a one-key mapping) or a
**named-leaf map** — a record of `^anchor`-named leaves. Each leaf is one of:

| Leaf | Value | Compiles to |
| --- | --- | --- |
| `maxWords` | number | `maxWords(n)` — word budget for the section (`content/max-words`). |
| `code` | empty, or `{ lang?, description? }` | `code({ lang })` — require a fenced code block, optionally of a given language. |
| `table` | see below | `table(...)` — a table with named columns. |
| `list` | see below | `list(...)` — a list with item constraints. |

**`table` config:**

| Key | Value | Meaning |
| --- | --- | --- |
| `columns` | list of strings (**required**) | Expected column headers. |
| `cells` | map `column → schema node` | Per-column cell schema (the v2 [schema subset](#schema-nodes--the-json-schema-2020-12-subset)). |
| `minRows` | number | Minimum data-row count. |
| `anchor` | string | Require a `^anchor` on the table. |
| `extraColumns` | `ignore` \| `error` | How to treat columns beyond `columns`. |
| `description` | string | The leaf's hint. |

**`list` config:**

| Key | Value | Meaning |
| --- | --- | --- |
| `items` | `checkbox` \| a schema node | Constrain every item — a task-list checkbox, or a v2 schema each item's text must satisfy (v1's `everyItem`). |
| `minItems` | number | Minimum item count. |
| `ordered` | boolean | Require an ordered (`true`) or unordered (`false`) list. |
| `description` | string | The leaf's hint. |

```yaml
body:
  order: strict
  additionalSections: false
  sections:
    - section: Overview
      description: what and why, briefly
      content: { maxWords: 200 }
    - section: Tasks
      minContains: 0
      maxContains: 1
      content:
        list: { items: checkbox, minItems: 1 }
    - section: Fields
      content:
        table:
          columns: [name, type, required]
          minRows: 1
          cells:
            required: { enum: ["yes", "no"] }
    - section: Example
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

- An **inline mapping** (`{ description?, frontmatter?, body? }`) — compiled
  directly via `compileContractObject` with the v2 compilers, no envelope needed.
- A **name** — looked up in the `contracts` map; the mapped value is a path. Any
  string contract ref (a name or a path) also becomes the rule's label in the
  CLI run summary.
- A **path** — a string that is itself a `.yaml` / `.yml` path.

Relative paths resolve **relative to the config file's directory** (via
`loadConfigFile`); absolute paths are used as-is. A ref that is not a `.yaml` /
`.yml` file — e.g. a code-authored `.js` / `.ts` contract module — is rejected;
that is the deferred code escape hatch, out of scope in the declarative format.

```yaml
mcVersion: 2
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
        type: object
        properties:
          title: { type: string, minLength: 1 }
```

:::note
Rule order is significant. See the [CLI reference](/reference/cli/) for how
`validate` consumes a config and its exit codes (`0` clean, `1` error-level
findings, `2` usage/config error).
:::

## Section text constraints — `requires` / `forbids`

A `section` / `oneOf` node, and the `body` root, may carry `requires:` /
`forbids:` lists that constrain the section's (or the whole document's) text.
Each is a list of **match specs** compiled onto the `requires(...)` /
`forbids(...)` / `textRule` builders — the data-authoring twin of the TS text
predicates (D-0011 / C-0009). The vocabulary is unchanged from v1.

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
model, same emitted findings (identical ids, levels, positions, messages). A
contract that authors no `description` produces findings byte-identical to its
combinator twin (no `hint` key at all). Pick whichever authoring surface fits:
data (YAML) for contracts that ship as config, or code (TS) when you need the
deferred escape hatches.

See the [API reference](/reference/api/) for the combinator surface, and the
[authoring examples](/appendix/examples/author/) for worked contracts and corpus
configs.
