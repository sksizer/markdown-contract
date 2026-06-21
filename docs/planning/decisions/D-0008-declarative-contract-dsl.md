---
type: decision
schema_version: '1'
id: D-0008
status: open/proposed
title: Declarative contract DSL — a versioned YAML format compiled to the runtime
created: '2026-06-21'
related:
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0004-content-plane]]'
  - '[[D-0003-structure-plane]]'
  - '[[D-0006-packaging]]'
  - '[[D-0007-engine-scope-and-fidelity]]'
  - '[[D-0001-finding-model]]'
tags:
  - yaml
  - dsl
  - declarative
  - versioning
  - config
  - zod
need_human_review: true
---

# Declarative contract DSL — a versioned YAML format compiled to the runtime

## Summary

- A contract may be authored as a **versioned YAML file** (`mcVersion: 1`, `kind: contract`) — a `frontmatter` schema, a `body` section grammar, and per-section `content` leaves — that a loader compiles into the same `Contract` the engine combinators produce. Validation, findings, and the typed model are identical to a TS-authored contract; YAML is a front-end, not a second engine.
- The schema layer (frontmatter fields, table cells, list items) is a **small closed declarative vocabulary** — `type` / `enum` / `const` / `min` / `max` / `pattern` / `array` / `object` — compiled to Zod. That vocabulary is the whole of v1's expressiveness (the 80% case). A **code escape hatch** — a `$ref` to a named Zod export in a module — is **planned but deferred to a later version**; until it lands, a contract that needs more than the vocabulary is authored in TypeScript via the combinators. The closed-vocabulary-now, escape-hatch-later shape mirrors [[D-0004-content-plane]]'s own "finite closed vocabulary, `z.*` as the escape hatch".
- The format is **explicitly versioned from day one** (`mcVersion`), so the DSL can evolve — or a different schema dialect (e.g. JSON Schema) be adopted — without breaking existing files. The version gate is the swap seam, and it is what lets us pick the DSL for v1 *without* foreclosing JSON Schema.
- A YAML **meta-config** (`kind: config`) maps directory globs → contract files (`.yaml` or `.ts`), the data form of the runner's directory → contract config ([[C-0003-corpus-cli]]).
- v1 covers **frontmatter + structure + content** as **pure declarative YAML, with no references to code**. Both the **code escape hatch** (a `$ref` to a Zod export, and contract refs to code-authored modules) and cross-cutting `rule` / `docRule`s are **explicitly deferred** to a later format version. The compiler is a new front-end; the engine ([[D-0006-packaging]]) is unchanged.

^summary

## Context

Today a contract is a TypeScript module: combinators (`sections` / `section` / `oneOf` / `optional` / `gap`) for structure, leaf helpers (`table` / `list` / `code` / `maxWords`) for content, and Zod for frontmatter and cell / item schemas — wired into a `defineConfig({ rules })` for the corpus runner ([[C-0003-corpus-cli]], [[D-0006-packaging]]). That is maximally expressive, but it couples "define a markdown check" to "write and build TypeScript".

Many consumers want the same checks as **data**: a file they edit, diff, and share with no toolchain — a CI config that pins a doc shape, a docs team that owns its own contract, another repo that installs the package and feeds it YAML. The vision already promises a "declarative dir → contract config"; this decision fixes the declarative surface end to end — the YAML format, how each construct maps to the runtime, the schema-language strategy, the versioning, and what v1 deliberately leaves out.

This work ships **standalone contracts over dummy data**; migrating the SDLC corpus is explicitly out of scope (it stays on TS contracts for now).

## Decision

### A versioned YAML format, compiled to the runtime — not a second engine

A loader compiles a YAML file into the runtime objects the engine already consumes:

- `loadContract(src) → Contract` — a `kind: contract` file becomes a `Contract<F, B>` identical to one built by the combinators.
- `loadConfig(src) → CorpusConfig` — a `kind: config` file becomes the runner's `CorpusConfig`.

The loader is a **new front-end layer**, exposed as a subpath export (`markdown-contract/declarative`), that imports `core` and `runner` but is imported by neither — preserving the one-way `cli → runner → core` layering of [[D-0006-packaging]] and keeping the engine free of a YAML dependency. The CLI's config loader grows `.yaml` / `.yml` recognition beside the existing `.js` / `.mjs`. Because YAML compiles to the same `Contract`, the finding stream ([[D-0001-finding-model]]) and the typed `Doc` are unchanged — authorship is invisible downstream.

### The contract file

A complete `kind: contract` file. Every construct below has a 1:1 runtime counterpart (mapping tables follow).

```yaml
mcVersion: 1
kind: contract

frontmatter:
  strict: true                       # → z.object(...).strict() ⇒ frontmatter/unknown-key
  fields:
    title:   { type: string, min: 1 }
    version: { type: string, pattern: '^\d+\.\d+\.\d+$' }
    status:  { enum: [draft, released] }
    tags:    { type: array, of: { type: string }, default: [] }

body:
  order: recognized-relative         # none | recognized-relative | strict
  allowUnknown: true
  sections:
    - section: Summary
      content: { maxWords: 80 }
    - section: Changes
      content:
        table:
          columns: [Type, Description]
          minRows: 1
          cells:
            Type: { enum: [added, changed, fixed, removed] }
          extraColumns: ignore
    - section: Breaking changes
      optional: true
      content: { list: { minItems: 1 } }
    - oneOf: [References, See also]   # interchangeable section spellings
      optional: true
    - gap: { min: 0 }                # a window admitting unknown sections
```

### Schema vocabulary — the 80% DSL, compiled to Zod

A field / cell / item schema is a YAML map. The vocabulary is **closed** and maps almost 1:1 onto Zod. Anything richer than the vocabulary is out of v1 scope: it is authored in TypeScript via the combinators today, and will be reachable from YAML through the deferred code escape hatch (below) once that lands.

| YAML | Compiles to | Notes |
|---|---|---|
| `{ type: string }` | `z.string()` | |
| `{ type: string, min, max }` | `.min(n)` / `.max(n)` | string length |
| `{ type: string, pattern: '…' }` | `.regex(/…/)` | |
| `{ type: string, format: email\|url\|uuid\|date }` | `.email()` / `.url()` / … | small closed format set |
| `{ type: number, int: true, min, max }` | `z.number().int().min().max()` | |
| `{ type: boolean }` | `z.boolean()` | |
| `{ type: array, of: <schema>, min, max }` | `z.array(<schema>).min().max()` | `of` recurses |
| `{ type: object, fields: { … }, strict }` | `z.object({ … })[.strict()]` | recurses |
| `{ enum: [a, b, c] }` | `z.enum([…])` | string members |
| `{ const: v }` | `z.literal(v)` | |
| `{ $ref: './m.js#Name' }` | the named Zod export from a module | **escape hatch — deferred** (see below) |
| `optional: true` (on a field) | `.optional()` | |
| `default: v` | `.default(v)` | |
| `nullable: true` | `.nullable()` | |

**The code escape hatch (`$ref`) — deferred to a later version.** The closed vocabulary covers the common case (enums, patterns, ranges, shapes). For the richer 20% — refinements, cross-field checks, custom messages — the planned escape is a `$ref` to a named Zod export, so the DSL never has to reinvent Zod (the same discipline [[D-0004-content-plane]] applies to leaves). This is **not in v1**: v1 is pure declarative YAML with no code references, and a contract that needs more than the vocabulary is authored in TypeScript via the combinators until the escape hatch lands.

Resolving such a ref, when it lands, is straightforward: the loader `import()`s the target module and reads the named export. Node loads JS/ESM (`.js` / `.mjs` / `.cjs`) directly, and a `.ts` module loads at runtime via a TS loader (`tsx` / `jiti` / `ts-node/esm`) or Node's native type-stripping (`--experimental-strip-types`, on by default in newer Node) — so runtime TypeScript is feasible, and deferring the escape is a scoping choice, not a technical limit.

### Body grammar — the structure mapping

| YAML node | Combinator |
|---|---|
| `{ section: Name }` | `section("Name")` |
| `{ section: Name, aliases: [A, B] }` | `section(["Name", "A", "B"])` — alias spellings of one section |
| `{ oneOf: [A, B] }` | `oneOf(["A", "B"])` — interchangeable sections at one slot |
| `{ gap: { min, max } }` | `gap({ min, max })` |
| `optional: true` (on any node) | `optional(spec)` |
| `{ section: N, content: <leaf> }` | `section(N, { content })` |
| `{ section: N, content: { '<anchor>': <leaf>, … } }` | named leaves bound by `^anchor` |
| `{ section: N, anchor: id }` | require a `^id` block |
| `{ section: N, children: { order, allowUnknown, sections: [ … ] } }` | nested `sections(...)` |
| body root `{ order, allowUnknown, sections }` | `sections({ order, allowUnknown }, [ … ])` |

`optional` is a **flag on a node**, not a wrapper node — it reads better in YAML and compiles to `optional(spec)`. `aliases` covers spelling variants of one logical section; `oneOf` covers distinct interchangeable sections — the runtime distinguishes them and so does the format.

### Content leaves — the content mapping

| YAML | Leaf |
|---|---|
| `{ table: { columns, minRows, cells, extraColumns, anchor } }` | `table({ … })` — `cells` values are schema-DSL maps |
| `{ list: { ordered, everyItem, minItems } }` | `list({ … })` — `everyItem: checkbox` or a schema-DSL map |
| `{ code: { lang } }` | `code({ lang })` |
| `{ maxWords: N }` | `maxWords(N)` |

The leaf set is fixed by [[D-0004-content-plane]]; the YAML simply names each leaf and carries its config, with `cells` / `everyItem` schemas drawn from the same vocabulary as frontmatter fields — one schema language across the whole format.

### The meta-config file

```yaml
mcVersion: 1
kind: config

contracts:
  release-note: ./contracts/release-note.contract.yaml
  guide:        ./contracts/guide.contract.ts        # a TS contract — same registry

rules:
  - include: ['notes/releases/**/*.md']
    contract: release-note
  - include: ['docs/guides/**/*.md']
    exclude: ['**/_*.md']
    contract: guide
```

- `rules` mirrors the runtime `CorpusConfig.rules` exactly (`include` / `exclude` globs + `contract`), so the YAML is the data form of today's `defineConfig`.
- A contract ref resolves **relative to the config file**. In v1 it points at a **`.yaml` contract**; pointing at a code-authored contract module (`.js` / `.mjs`, or `.ts` via a loader) is the same deferred code escape (see § Schema vocabulary) — the **interop seam** that will let a corpus mix declarative and code-authored contracts.
- **First match wins**, matching the runtime runner.
- An inline contract (`contract: { mcVersion: 1, kind: contract, … }`) is allowed for tiny cases, but separate contract files are the norm — shareable and reusable.

### Versioning — `mcVersion` from day one

Every file carries `mcVersion: <integer>` and a `kind: contract | config`.

- The loader **dispatches on `mcVersion`** to a compiler for that version; an unknown or missing version is a clear config error (a `config/version` finding), never a silent best-effort parse.
- **Additive, backward-compatible** changes (new optional keys, new leaf types, new schema keywords) stay within a version. A **breaking** change mints the next integer, and the loader **retains prior-version compilers**, so existing files keep validating.
- `mcVersion` is the **format** version — independent of the npm package `VERSION`.
- This is the deliberate hedge: it makes the v1 vocabulary boundary and the DSL-vs-JSON-Schema choice **reversible**. We can ship a narrow v1 and widen it, or introduce a different schema dialect, all behind the version gate (see the comparison below).

> Editor tooling note: we may publish a JSON Schema describing the YAML **format itself**, for IDE autocompletion / validation of contract files. That is orthogonal to using JSON Schema as the in-format **leaf language** — a different layer (tooling-over-our-files vs. the value vocabulary).

## Schema language — the 80% DSL vs JSON Schema (worked comparison)

The central fork. Worked on a neutral dummy contract — a release-note doc with a typed frontmatter, a bounded `Summary`, a typed `Changes` table, and an optional `Breaking changes` list.

**(1) The runtime source of truth (TS, today):**

```ts
const ReleaseNote = contract({
  frontmatter: z.object({
    title: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    status: z.enum(["draft", "released"]),
    tags: z.array(z.string()).default([]),
  }).strict(),
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", { content: maxWords(80) }),
    section("Changes", { content: table({
      columns: ["Type", "Description"],
      minRows: 1,
      cells: { Type: z.enum(["added", "changed", "fixed", "removed"]) },
    }) }),
    optional(section("Breaking changes", { content: list({ minItems: 1 }) })),
  ]),
});
```

**(2) The 80% DSL (chosen):**

```yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    title:   { type: string, min: 1 }
    version: { type: string, pattern: '^\d+\.\d+\.\d+$' }
    status:  { enum: [draft, released] }
    tags:    { type: array, of: { type: string }, default: [] }
body:
  order: recognized-relative
  allowUnknown: true
  sections:
    - section: Summary
      content: { maxWords: 80 }
    - section: Changes
      content:
        table:
          columns: [Type, Description]
          minRows: 1
          cells:
            Type: { enum: [added, changed, fixed, removed] }
    - section: Breaking changes
      optional: true
      content: { list: { minItems: 1 } }
```

**(3) JSON Schema flavour (rejected as primary):**

```yaml
mcVersion: 1
kind: contract
frontmatter:                              # only the VALUE layer is JSON Schema…
  $schema: 'https://json-schema.org/draft/2020-12/schema'
  type: object
  additionalProperties: false
  required: [title, version, status]
  properties:
    title:   { type: string, minLength: 1 }
    version: { type: string, pattern: '^\d+\.\d+\.\d+$' }
    status:  { type: string, enum: [draft, released] }
    tags:    { type: array, items: { type: string }, default: [] }
body:                                     # …and `body`/`sections`/`table`/`maxWords` have NO
  order: recognized-relative              # JSON Schema vocabulary — the structure grammar is STILL
  allowUnknown: true                      # a bespoke DSL. So one file carries two dialects:
  sections:                               # `minLength`/`items` here, `min`/`of` there.
    - section: Summary
      content: { maxWords: 80 }
    - section: Changes
      content:
        table: { columns: [Type, Description], minRows: 1, cells: { Type: { type: string, enum: [added, changed, fixed, removed] } } }
```

**The comparison:**

| Dimension | 80% DSL (chosen) | JSON Schema |
|---|---|---|
| Coverage of the *format* | One language across frontmatter + cells + items, reading consistently beside the structure grammar | Value layer only — JSON Schema has nothing for the section grammar, so we ship a bespoke structure DSL anyway and bolt JSON Schema onto the leaves → **two dialects per file** |
| Fit to the document model | Native — the "document" is markdown, leaves are projected nodes; the DSL describes node data | JSON Schema assumes a JSON document; it fits frontmatter and scalar cells but is foreign to "a table" or "a section" |
| Mapping to Zod | ~1:1 (`min`→`.min`, `pattern`→`.regex`, `enum`→`z.enum`); we own it | Needs a JSON-Schema→Zod compiler; `minLength`/`minimum`/`minItems` collapse by context, `additionalProperties`→`.strict()`, and it is **lossy** on refine / transform / messages |
| Escape to full power | a `$ref` to a named Zod export = arbitrary power, one line (planned — deferred past v1) | No clean path to arbitrary Zod; the escape is "more JSON Schema" or *also* a code `$ref` (then why JSON Schema at all) |
| Surface we maintain | A small closed vocabulary we version | A pinned JSON Schema draft **plus** a compiler we maintain as the spec evolves |
| Verbosity (80% case) | Terser — `{ enum: [...] }`, `min` | Heavier — `{ type: string, enum: [...] }`, `minLength` |
| Familiarity / tooling | Bespoke (must document) | Standard; `$schema` IDE tooling exists |

**Verdict.** The DSL wins for v1. The decisive point is **coverage**: JSON Schema can only model the value layer, so adopting it would *not* spare us a bespoke structure grammar — it would leave us maintaining two schema dialects in one file plus a lossy translation to the Zod the engine actually runs. The DSL gives one coherent language that mirrors Zod, with `$ref` as the honest escape to the real thing.

But the choice is **not** a foreclosure. Because the format is versioned and the schema vocabulary is an isolated, closed sub-layer, JSON Schema remains reachable later as either a `mcVersion: 2` value language or an opt-in per-field / per-leaf `dialect: json-schema`. **Versioning from the start is exactly what makes choosing the DSL now safe** — we get the simpler, better-fitting language today and keep the standard one a contained, non-breaking change away.

## Why

- **Data, not code, for the common case.** Editing YAML needs no toolchain; checks become reviewable, shareable, CI-pasteable artifacts — the "declarative dir → contract config" the vision promises.
- **One coherent language that mirrors Zod.** The vocabulary maps ~1:1 to the Zod the engine already runs, so there is no impedance layer and the escape hatch is literally "drop to the real thing".
- **80/20 with a planned escape hatch.** v1's closed vocabulary covers the common shapes; the deferred `$ref` will handle everything richer. We surface Zod's common slice now and never reinvent Zod.
- **Versioned from the start = cheap to change our minds.** Foregrounding `mcVersion` makes the DSL-vs-JSON-Schema decision and the v1 vocabulary boundary reversible without breaking files.
- **A compiler, not a second engine.** Reusing the runtime keeps one source of truth for findings and the typed model; YAML authorship is invisible downstream.

## Consequences

- A new front-end module (subpath export) plus a YAML-parser dependency; the engine stays YAML-free per the one-way layering of [[D-0006-packaging]].
- The CLI's config loader gains `.yaml` / `.yml` recognition beside `.js` / `.mjs`.
- The closed vocabulary is a **maintained surface**: each new leaf type or schema keyword is a deliberate, versioned addition — the same discipline [[D-0004-content-plane]] imposes on leaves.
- The code escape hatch (`$ref`, and code-authored contract refs) reintroduces a code dependency, so it is **deferred** — v1 is pure declarative YAML. When it lands the loader `import()`s the target (JS/ESM directly; `.ts` via a loader or Node type-stripping); runtime TypeScript is feasible, so the deferral is a scoping choice. Until then, contracts past the closed vocabulary are authored in TypeScript via the combinators.
- Cross-cutting rules cannot be expressed in v1 YAML; corpora needing them author those contracts in TS (interop), or wait for the rules format version.

## Options considered

### Schema language — JSON Schema as the primary leaf language

Worked in full above. Rejected for v1: partial coverage (no structure grammar), a foreign data model, lossy Zod mapping, and two dialects per file. Kept **reachable** behind the version gate, so the rejection is reversible if real demand appears.

### Rules in v1 YAML — reference-by-id, or an inline predicate DSL

Two ways cross-cutting `rule` / `docRule`s could enter YAML now: **(a)** reference a TS-registered rule by id, or **(b)** an inline `when` / `require` predicate DSL. Both deferred. (a) still requires TS, so it does not advance "checks as data" and is a half-measure; (b) is a real expression language to design, parse, document, and version. v1 ships the three planes that *are* cleanly declarative; rules get their own decision when the demand is concrete (a future format version).

### Meta-config — single self-contained YAML vs file-refs

Chose **file-refs** (one contract per file, the meta-config binds globs) for shareability and reuse, with inline contracts allowed for tiny cases. A single self-contained file is simpler for a one-off but grows unwieldy and unshareable as contracts accumulate.

### Packaging — fold into core, subpath export, or a separate package

Chose a **subpath export within the one package** (`markdown-contract/declarative`), consistent with [[D-0006-packaging]]'s "one package, layers, another front-end". Folding into core would put a YAML dependency in the engine; a separate package would add a second publish cadence and a version-coupling seam for what is one more front door onto one engine.

## Open questions

- **`$ref` target resolution (deferred feature)** — when the code escape hatch lands: resolve against a JS/ESM module export (`.ts` via a loader / Node type-stripping); the open bits are how the `#Name` fragment selects the export (default vs named) and whether the loader ships a built-in TS hook.
- **Named-leaf / anchor syntax** — the `content: { '<anchor>': <leaf> }` map form vs a list; final shape.
- **`format` keyword set** — which string formats (email / url / uuid / date …) are in the closed vocabulary vs pushed to `pattern` / `$ref`.
- **The meta-schema** — validating a contract YAML *before* compiling, for a friendly error surface: a schema over the parsed YAML that ideally dogfoods the engine's own finding model.
- **Editor tooling** — whether and when to publish a JSON Schema for the YAML format itself.

## Out of scope

- The **code escape hatch** — a `$ref` to a Zod export, and meta-config refs to code-authored (`.js` / `.ts`) contract modules — deferred to a later format version. v1 is pure declarative YAML; a contract past the closed vocabulary is authored in TypeScript until then.
- Cross-cutting `rule` / `docRule`s in YAML — deferred to a later format version.
- Document repair / generation — the engine is read-only ([[D-0007-engine-scope-and-fidelity]]).
- Migrating the SDLC corpus to YAML contracts — this work ships standalone, dummy-data contracts; the SDLC corpus stays on TS for now.
- Non-YAML serializations — JSON / TOML parse to the same AST trivially, but YAML is the authored surface and the only v1 deliverable.

## References

- [[C-0006-declarative-yaml-contracts]] — the capability this decision realizes.
- [[C-0003-corpus-cli]] — the directory → contract config this puts in data form.
- [[C-0005-two-plane-contract-engine]] — the runtime the loader compiles to.
- [[D-0004-content-plane]] — the closed-vocabulary + `z.*` escape-hatch philosophy this mirrors, and the leaf set.
- [[D-0003-structure-plane]] — the section grammar the body mapping targets.
- [[D-0006-packaging]] — the one-package / one-way layering the loader respects.
- [[D-0007-engine-scope-and-fidelity]] — the read-only / repair-free posture the loader inherits.
- [[D-0001-finding-model]] — the findings a compiled contract emits unchanged.
