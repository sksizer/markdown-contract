---
type: decision
schema_version: '1'
id: D-0020
status: open/proposed
title: mcVersion 2 — the declarative vocabulary respelled to the JSON Schema idiom
created: '2026-07-15'
related:
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0011-declarative-text-constraints]]'
  - '[[D-0017-repeatable-sections]]'
tags:
  - declarative-dsl
  - json-schema
  - document-schema-alignment
  - mcversion-2
  - vocabulary
need_human_review: true
---
# mcVersion 2 — the declarative vocabulary respelled to the JSON Schema idiom

## Summary

- `mcVersion: 2` respells the declarative vocabulary to the **JSON Schema 2020-12 idiom** everywhere a concept has a JSON Schema counterpart: schema nodes adopt `properties` / `required` / `additionalProperties` / `minLength`–`maxLength` / `minimum`–`maximum` / `items` / `minItems`–`maxItems` / `type: integer` / `type: [T, "null"]`, and the body grammar adopts `additionalSections` and `minContains` / `maxContains`. A v2 `frontmatter:` block is **valid JSON Schema syntax** (a documented subset).
- **Zod remains the only engine.** The v2 compiler targets the same Zod constructors and the same runtime `Contract` objects v1 does; v2 claims JSON-Schema-compatible *spelling*, with per-keyword semantics defined by the Zod constructor it compiles to. The combinator API keeps its existing names (`repeatable`, `allowUnknown`, `min` / `max`) — the YAML compiler absorbs the vocabulary difference.
- `description:` is accepted on every declarable node and surfaces as a new optional **`Finding.hint`** — the nearest enclosing `description`, resolved walking outward. Renderers carry it (human: indented hint line; SARIF: message property).
- v2 schema nodes get a **per-node allowed-key check**, fixing the v1 bug where unknown constraint keys on a schema node compile silently (`{ type: string, minLenght: 3 }` → bare `z.string()`), and splitting rejections into "unknown keyword" vs "recognized JSON Schema keyword outside the supported subset" — the seam full 2020-12 support would later slot into.
- **v1 is dropped**, not dual-maintained: the package is pre-npm, so the migration burden is this repo's own corpus. A mechanical codemod transpiles v1 → v2 (including the `required` inversion); `mcVersion: 1` files fail loudly with a pointer to it. A JSON-Schema **meta-schema** for the v2 dialect is published on the docs site for editor completion/validation.

^summary

## Context

D-0008 defined the v1 closed vocabulary as a bespoke spelling of Zod's surface (`fields`, `strict`, overloaded `min` / `max`, `int: true`, `of`, `nullable`, implicit-required with `optional:` opt-out). It works, but it is a dialect nobody else speaks.

Two things changed. First, a comparison of markdown-contract against **document-schema.org** (draft 2026-06, the `schematter` validator from the IWE project — see `provenance/d0020/research/document-schema-alignment.md`) showed a directly competing declarative markdown-schema language that anchors its entire vocabulary to JSON Schema: its frontmatter plane *is* JSON Schema 2020-12, and its structural keywords reuse JSON Schema's names (`minContains`, `additionalSections` modeled on `unevaluatedItems`). Alignment analysis concluded markdown-contract's field vocabulary is already ~a semantic subset of JSON Schema, differing mainly in spelling and two defaults — so adopting the idiom is cheap now and positions every later alignment step (full 2020-12 frontmatter, schema-valued unknowns policy, header-schema binding) as an *additive* change rather than a second migration.

Second, the timing is uniquely favorable: the package is not yet published to npm, so there are no external contract authors to break. The whole migration surface is in-repo — six dogfood contracts, the validation fixtures, the `docs/catalog` example corpus, and the `init` inferer's output.

Two findings during the analysis also feed this decision: (a) v1's schema-node compiler does **not** enforce the documented closed vocabulary at the node level — unknown constraint keys are silently ignored, exactly the "typo validates nothing" failure mode the closed vocabulary exists to prevent; (b) a spike against the in-repo Zod 4.4.3 confirmed the one implementation unknown: named string formats **compose** with length and pattern constraints (`z.email().min(30).regex(…)` reports both `too_small` and `invalid_format` issues), unions cover `type: [T, "null"]`, and wrappers (`default`, `nullable`) chain on top. Nothing blocks composable `format` in v2.

## Decision

### Envelope

`mcVersion: 2` is the only supported value once this lands (the loader's version gate dispatches exactly as D-0008 §envelope intended). A `mcVersion: 1` document is a `DeclarativeError` whose message names the codemod. `kind: contract` / `kind: config` are unchanged; `kind: config`'s own keys (`rules`, `include`, `exclude`, `contracts`) are already idiomatic and do not change.

### Schema nodes — the JSON Schema subset, compiled to Zod

The schema-node vocabulary (used by `frontmatter`, table `cells`, and list item schemas) becomes a documented subset of JSON Schema 2020-12:

| v1 | v2 | Compiles to (unchanged target) |
| --- | --- | --- |
| `fields:` | `properties:` | `z.object` shape |
| implicit required, `optional: true` | `required: [keys]` — **optional by default, like JSON Schema** | presence vs `.optional()` |
| `strict: true` | `additionalProperties: false` | `z.strictObject` |
| `min` / `max` on `string` | `minLength` / `maxLength` | `.min()` / `.max()` |
| `min` / `max` on `number` | `minimum` / `maximum` | `.min()` / `.max()` |
| `min` / `max` on `array` | `minItems` / `maxItems` | `.min()` / `.max()` |
| `of:` | `items:` | `z.array(<items>)` |
| `int: true` | `type: integer` | `z.int()` |
| `nullable: true` | `type: [T, "null"]` (null-pairing only; general unions out of scope) | `.nullable()` |
| `format` short-circuits `pattern` / bounds | `format` **composes** with `pattern` / `minLength` / `maxLength` | chained format constructor (spike-verified) |
| `pattern`, `enum`, `const`, `default` | unchanged | `.regex()`, `z.enum`, `z.literal`, `.default()` |
| — | `description` | carried for `Finding.hint` |

Decisions inside the subset:

- **`required` inversion is adopted fully.** JSON Schema's optional-by-default is the price of the idiom; the codemod handles the mechanical inversion, and a corpus findings-diff (identical findings before/after, modulo `hint`) backstops it.
- **`default` keeps actively filling** the parsed value (Zod `.default()`), feeding the typed model. This is ajv's `useDefaults` behavior rather than JSON Schema's annotation-only stance, and is documented as such.
- **Fidelity stance: syntax-compatible, Zod-defined.** Where a keyword's edge semantics differ between Zod's validators and a 2020-12 evaluator (`format: email` being the canonical case), v2's behavior is the Zod constructor's, documented per keyword. The named-format set stays Zod's (v1's 17 formats).
- **Closed subset, two rejection classes.** Every node is checked against its type's allowed-key set (fixing the silent-ignore bug). A key that is recognizable JSON Schema outside the subset (`oneOf`, `allOf`, `not`, `if`/`then`/`else`, `$ref`, `$defs`, `prefixItems`, `contains`, `uniqueItems`, `patternProperties`, `propertyNames`, `dependentRequired`, `multipleOf`, `exclusiveMinimum` / `exclusiveMaximum`, multi-type unions beyond null-pairing) is rejected as *unsupported in the v2 subset* — a distinct message from a plain unknown key, so the eventual full-2020-12 path (out of scope here) has a clean seam.
- **`frontmatter:` is itself a schema node** — `{ type: object, properties, required, additionalProperties }` — replacing v1's bespoke `{ strict, fields }` wrapper. This is what makes the block literal JSON Schema.

### Body grammar

| v1 | v2 | Semantics |
| --- | --- | --- |
| `allowUnknown: bool` | `additionalSections: bool` | unchanged (schema-valued form reserved for a future decision) |
| `optional: true` | `minContains: 0, maxContains: 1` | unchanged (0..1) |
| `repeatable: true` (+ `min` / `max`) | `minContains` / `maxContains` | counted slot; see defaults below |
| `children: { order, allowUnknown, sections }` | hoisted — `sections`, `order`, `additionalSections` sit directly on the section node | compiles to the same nested `sections()` |
| list leaf `everyItem:` | `items:` | unchanged (`checkbox` or a schema node) |
| `section`, `aliases`, `oneOf`, `gap`, `order`, `anchor`, `content`, `maxWords`, `code`, `table` (`columns` / `cells` / `minRows` / `extraColumns`), `requires` / `forbids` | unchanged | no JSON Schema counterpart exists; renaming would be motion without alignment |

**Occurrence defaults.** A section node with **no** occurrence keyword keeps markdown-contract's invariant: exactly one (D-0003 uniqueness, D-0005 dual-key model). A node carrying either occurrence keyword becomes a *counted* slot with JSON Schema's own defaults for the missing bound — `minContains` defaults to 1, `maxContains` to unbounded. So: `minContains: 3` = 3..∞, `maxContains: 5` = 1..5, `minContains: 0` = 0..∞, `minContains: 0, maxContains: 1` = optional. A counted slot with max > 1 gets D-0017's repeatable exemptions and array binding; 0..1 and 1..1 slots stay scalar. This deliberately diverges from document-schema's *default* (1..∞ for every entry) — adopting their spelling, keeping our exactly-once default — and the divergence is documented in the reference.

Codemod mapping: `optional: true` → `minContains: 0, maxContains: 1`; `repeatable: true` → `minContains: 1` (max omitted = unbounded); `repeatable` + v1 `min` / `max` → both bounds explicit; `optional` + `repeatable` → `minContains: 0`.

### `description` and `Finding.hint`

`description: <string>` is accepted on: the contract root, any schema node, any section / `oneOf` / `gap` node, any content leaf, and the body root. `Finding` gains an optional `hint?: string`: the nearest enclosing `description` walking outward from the failing node (leaf → section → ancestors → contract root); absent when no `description` is in scope. For frontmatter findings the per-field `description` lands via the compiled schema (Zod `.describe()`), resolved by the existing Zod-issue mapper. Renderers: human prints an indented `hint:` line under the finding; `json` carries the field; SARIF attaches it as a message property. Rule ids and levels are untouched, and contracts with no `description` produce byte-identical findings to today.

The TS combinators grow the matching optional `description?` on `SectionOpts`, leaf configs, and the contract root — additive, so YAML/TS parity (same objects, same findings) is preserved.

### Meta-schema

A JSON Schema 2020-12 meta-schema describing the v2 dialect is authored and published on the docs site under a stable `$id` URL, with editor-wiring documentation (YAML-LSP `$schema` association). Because v2 `frontmatter` is literal JSON Schema, the meta-schema constrains that region to the supported subset rather than hand-describing it.

### Migration & sequencing

Five PRs, each leaving CI green: (1) this decision; (2) TS engine gains the v2 compilers beside v1; (3) the Rust engine mirrors them (parity fixtures gain v2 twins); (4) the codemod lands and migrates the whole in-repo corpus — `contracts/*.contract.yaml`, `markdown-contract.yaml`, validation fixtures, `docs/catalog/*.yaml` — and the `init` inferer emits v2 (goldens regenerate, `init --check` stays green); (5) both v1 compilers are removed, `reference/yaml.md` is rewritten, and the meta-schema publishes. Acceptance: dogfood corpus validates clean under v2 with findings identical modulo `hint`; TS ↔ Rust parity suite green; `init` round-trips through `--check`; a v1 file produces one clear migration error.

## Why

- **JSON Schema is the vocabulary people already know.** Every renamed keyword is one a contract author has met before; the bespoke v1 spellings (`fields`, `of`, `int`, overloaded `min`) are pure learning cost with no expressive payoff.
- **It is the cheapest permanent step toward document-schema interop.** The alignment analysis (provenance/d0020) sequenced the work cheapest-first; the respell is the foundation every later step (full 2020-12 frontmatter, schema-valued `additionalSections`, header-schema binding, token budgets) builds on without another rename — and it is valuable even if that interop never happens.
- **The meta-schema only becomes honest after the respell.** Publishing editor tooling for a dialect about to change spelling would ship churn; doing it against JSON-Schema-shaped syntax lets the meta-schema delegate to the real spec.
- **Pre-npm is the one moment a clean break is free.** Dual-maintaining v1 doubles the compiler surface and test matrix in two engines for consumers that do not exist.
- **The node-level allowed-key check closes a real hole** in v1's own documented contract, and doing it in v2 avoids churning v1 behavior on its way out.

## Consequences

- Every declarative document in the repo changes spelling once; the codemod makes it mechanical and the corpus findings-diff makes it verifiable. The `required` inversion is the one hazard class, mitigated by exactly that diff.
- `Finding` grows `hint?` — additive for every consumer; the SARIF and JSON shapes stay backward-compatible.
- The combinator API is otherwise untouched: v2 keywords compile onto the existing `SectionOpts` / `LevelOpts` / leaf configs, so the engine, projection, typed model, and finding ids are all unchanged. YAML ⇄ TS parity holds by construction.
- The Rust engine mirrors both the compilers and the `hint` field; the shared fixture corpus is the parity instrument, as today.
- Documented divergences from both neighbors: from JSON Schema, `default` fills and `format` asserts (ajv-`useDefaults` / format-assertion stance); from document-schema, the exactly-once occurrence default. Both are stated in `reference/yaml.md` rather than left implicit.
- Out of scope, deliberately: full 2020-12 evaluation (`oneOf`, `$ref`, conditionals — the two-path evaluator design is sketched in the alignment report), schema-valued `additionalSections`, header-schema section binding, `maxTokens` budgets, and any combinator renames.

## References

- [[D-0008-declarative-contract-dsl]] — the v1 closed vocabulary this decision respells, and the envelope version gate it dispatches through.
- [[D-0011-declarative-text-constraints]] — `requires` / `forbids`, unchanged in v2.
- [[D-0017-repeatable-sections]] — the repeatable-slot semantics `minContains` / `maxContains` now spell, including the counted-slot exemptions and array binding.
- [[D-0003-structure-plane]] — the per-level uniqueness invariant behind the exactly-once occurrence default.
- `provenance/d0020/research/document-schema-alignment.md` — the document-schema.org comparison and alignment-feasibility analysis motivating the respell.
