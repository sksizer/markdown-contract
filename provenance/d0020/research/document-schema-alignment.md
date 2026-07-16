# document-schema.org × markdown-contract — declarative semantics & alignment feasibility

*Prepared 2026-07-15. Sources: the document-schema draft 2026-06 spec
([document-schema.org](https://document-schema.org/), spec text at
[iwe-org/schematter `docs/document-schema.md`](https://github.com/iwe-org/schematter),
meta-schema, and schematter source), and markdown-contract's shipped reference docs
(`sites/docs/src/content/docs/reference/{yaml,findings,dialect,cli,api}.md`) plus
`packages/core/src/declarative/*` and the dogfood contracts. Verbatim copies of the
document-schema spec, README, meta-schema, and key source files are saved beside this
report in the scratchpad.*

Throughout: **DS** = document-schema draft 2026-06 (reference implementation
`schematter`), **MC** = markdown-contract `mcVersion: 1` declarative YAML (the
TypeScript combinator surface is noted where it changes the answer).

---

## 1. Executive summary

**The two projects are solving the same problem with the same core philosophy and
largely compatible — but not identical — semantics.** Both declare the required shape
of a markdown document as a closed-vocabulary YAML schema (unknown keys are load
errors in both), both validate frontmatter + section structure + block content, both
exit 0/1/2 with identical meanings, and both were explicitly motivated by
agent-written document corpora. DS's tagline — "schemas own shape, prompts own
semantics" — could sit unedited in MC's README.

**Neither is a subset of the other today.** DS has real capabilities MC's YAML lacks
(pattern/enum-bound section headers, ordered block sequences, token budgets,
`maxDepth`, universal `allSections`/`allBlocks` rules, full JSON Schema 2020-12
frontmatter, a published meta-schema, `description` hints). MC has a much larger set
DS lacks (source-position findings, severity levels, SARIF, corpus routing config,
per-column table contracts, checkbox lists, `forbids`/occurrence-count text rules,
unordered-body mode, Obsidian anchors, a typed read model, contract inference, and
custom code rules).

**Feasibility verdict: MC becoming a superset is realistic and worthwhile; a shared
validator engine is not, in code — but is, in conformance fixtures.** About six
engine additions (header-schema section binding + greedy matcher mode, block-sequence
grammar, token budgets, `maxDepth`, universal rules, JSON-Schema frontmatter
evaluation) would let MC validate any DS schema — and every one of those additions is
independently valuable to MC. Literally sharing schematter's validator code would
cost MC its two core invariants (position-pinned findings and the one-parse typed
model) to adopt a three-day-old, 1-star dependency; the leveraged version of "shared
engine" is a shared conformance corpus, which MC already knows how to run
(`packages/core` ↔ Rust crate parity fixtures). Recommended path in §8.

Caveat that shapes everything: **DS is three days old** (v0.1.0 published
2026-07-12, single org, 1 GitHub star, spec versioned "draft"). That cuts both ways —
aligning now is cheap and the spec is still influenceable, but it is a moving target
with no adoption weight yet.

---

## 2. What document-schema.org is

| | document-schema / schematter | markdown-contract |
|---|---|---|
| What it is | A declarative spec ("Think JSON Schema, but for the structure of a markdown page") + reference validator | A contract engine: declarative validation **and** a typed read model from one declaration |
| Spec artifact | `docs/document-schema.md` + published JSON-Schema meta-schema (`https://document-schema.org/draft/2026-06/schema`) | Reference docs site; no published meta-schema for the YAML dialect |
| Implementation | `schematter` (CLI) → `schematter-lib` (parse+tokens) → `schematter-validator` (markup-agnostic core); unpublished WASM crate | `packages/core` (TS library + CLI, canonical) + `crates/markdown-contract-engine` (Rust, finding-parity via shared fixtures, fs-free, wasm-ready) |
| Language | Rust (validator core has **no parser dependency** — other markups can feed it their own document model) | TypeScript (canonical) + Rust (declarative plane) |
| Maintainer / maturity | iwe-org (the IWE markdown knowledge-base/LSP project); **v0.1.0, 2026-07-12, 1 star**, Apache-2.0 | This repo; shipped/stable declarative surface, self-hosting on ~190 docs |
| Motivation | Agent write→validate→fix loops over knowledge bases | Same corpus problem + typed consumption (dashboards, migrations) |
| Scope stance | Validation only, by design — no extraction, no fixing, no corpus management | Validation + typed model + inference + (in progress) template generation + UI layers |

The ecosystem adjacency is notable: IWE is a wikilink-centric markdown knowledge-base
tool, i.e. DS grew out of the same Obsidian-flavored-vault world MC's dialect
targets. MC's own d0014 landscape research surveyed the nearest analogues
(jackchuka/mdschema, structured-madr, mdvalidate) but predates DS — DS is the
closest-aligned project to MC that now exists, closer than anything in that survey.

---

## 3. Same thesis, different commitments

Where the designs genuinely agree:

- **Closed vocabulary.** Both reject unknown schema keys at load time so "a typo
  cannot silently validate nothing" (DS spec) / "never best-effort parsed" (MC docs).
  This is rarer than it sounds — JSON Schema itself ignores unknown keywords.
- **Structure over style.** Both validate document *shape* (sections, blocks,
  frontmatter), explicitly not prose style or linting hygiene.
- **Deterministic, explainable matching.** DS: "no backtracking: matching is
  deterministic and errors are explainable." MC: deterministic pure engine, findings
  with stable rule ids.
- **Exit-code contract**: `0` clean, `1` violations/findings, `2` schema/config or
  usage error — identical in both.
- **Both parse GFM-ish markdown with wikilinks surviving the parse.**

Where the commitments diverge — these drive every table below:

| Commitment | DS | MC |
|---|---|---|
| Schema vocabulary anchor | **JSON Schema** — reuses its names (`pattern`, `const`, `enum`, `minContains`, `additionalSections` ≈ `unevaluatedItems`), embeds it verbatim for frontmatter | **Zod** — its own closed vocabulary compiling to Zod; grammar vocabulary from tree-grammar tradition (`section`, `oneOf`, `gap`, `order`) |
| Section identity | A **header schema** (`const`/`enum`/`pattern`/wildcard) — sections bind by matching, entries can be patterns like `'^\d{4}-\d{2}-\d{2}$'` | A **heading name** (+ `aliases`, `oneOf` of names) — sections bind by canonicalized name |
| Ordering model | One fixed algorithm: ordered, sequential, greedy binding; leftover policy via `additionalSections` | Three declared modes: `none` / `recognized-relative` / `strict`, plus positional `gap()` slots |
| Size metric | **Tokens** (OpenAI `o200k_base` BPE) — budgets for LLM context | **Words** (`maxWords`) — budgets for human prose |
| Violation location | Breadcrumb of header texts (**no line/column at all**) + `schemaPath` into the schema | **`path:line[:col]` source positions** — a founding requirement |
| Severity | None — everything is a violation | `error` / `warn` / `report`, registry-resolved per rule id |
| Multi-document | Out of scope ("deciding which schema governs which page is the caller's job") | First-class: `kind: config`, glob routing, corpus runner, run stats |
| Output of a clean doc | Nothing (validation only) | The typed model (`read()`) — same declaration types what it checks |

---

## 4. Feature-by-feature comparison

Legend: ✅ aligned (same capability, compatible semantics) · ≈ partial/divergent ·
❌ absent on that side. "MC (TS)" marks capabilities only reachable through the
TypeScript API, not `mcVersion: 1` YAML.

### 4.1 Capability matrix at a glance

| Capability | DS | MC | Alignment |
|---|---|---|---|
| Frontmatter schema | ✅ full JSON Schema 2020-12 | ✅ closed Zod vocabulary (+ arbitrary Zod in TS) | ≈ overlapping core, different power/edges |
| Required/ordered sections | ✅ | ✅ | ≈ different binding & order models |
| Section cardinality | ✅ `minContains`/`maxContains` | ✅ `optional`, `repeatable` + `min`/`max` | ≈ different defaults (§6.1) |
| Pattern-matched section headers | ✅ `header: {pattern}` | ❌ (names/aliases only) | gap in MC |
| Unordered required sections | ❌ | ✅ `order: none` | gap in DS |
| Nested subsection schemas | ✅ recursive `sections` | ✅ recursive `children` | ✅ |
| Ordered block sequences in a section | ✅ `blocks` (same matcher) | ❌ (single `content` leaf or anchor-named leaves) | gap in MC |
| Block kinds | 7: paragraph, bullet-list, ordered-list, code, quote, table, rule | leaves: code, table, list, (paragraph via maxWords) | ≈ |
| Table column/cell contracts | ❌ (type-only) | ✅ columns, per-cell schemas, minRows, extraColumns | gap in DS |
| List item constraints | ✅ `items` (text/tokens/nested blocks), `minItems`/`maxItems` | ✅ `everyItem` (checkbox or schema), `minItems`, `ordered` | ≈ |
| Task-list checkboxes | ❌ (not even parsed) | ✅ `everyItem: checkbox` | gap in DS |
| Code-fence language | ✅ `lang` (full header schema: pattern/enum) | ✅ `code: {lang}` (exact string) | ≈ DS richer |
| Token budgets | ✅ `maxTokens` at doc/section/block/text | ❌ | gap in MC |
| Word budgets | ❌ | ✅ `maxWords` | gap in DS |
| Max heading depth | ✅ `maxDepth` (doc + per-section) | ❌ (only a depth-*jump* warn) | gap in MC |
| Universal rules at every depth | ✅ `allSections` / `allBlocks` | ❌ YAML (TS `docRule`) | gap in MC YAML |
| Leftover policy as schema | ✅ `additionalSections`/`additionalBlocks`: bool **or** reduced schema | ≈ `allowUnknown` boolean only | gap in MC |
| Required text/phrase in scope | ≈ only as a bound block entry (`text: {pattern}`) | ✅ `requires` w/ counts, normalize, ignoreCase | MC richer |
| Forbidden text | ❌ (no negation anywhere) | ✅ `forbids` | gap in DS |
| Occurrence-count text bounds | ❌ | ✅ `min`/`max` on match specs | gap in DS |
| Anchors (`^block-id`) as contract | ❌ | ✅ `anchor:` on sections/tables + `byAnchor` | gap in DS |
| Conditional rules (fm ⇄ body) | ❌ (conditionals only *inside* frontmatter JSON Schema) | ❌ YAML (TS `docRule`) | gap in both YAMLs |
| Schema composition/reuse (`$ref`, imports) | ≈ in-document `$ref` inside frontmatter only | ❌ (deferred escape hatch) | gap in both |
| Custom code rules | ❌ (no plugin surface at all) | ✅ TS `rule`/`docRule` | gap in DS |
| Severity levels | ❌ | ✅ error/warn/report | gap in DS |
| Source positions on findings | ❌ (breadcrumbs only) | ✅ `path:line[:col]` | gap in DS |
| Pointer into the *schema* (`schemaPath`) | ✅ | ❌ | gap in MC |
| Human hints from schema (`description`) | ✅ nearest-description walk | ≈ `note` on text specs only | gap in MC |
| SARIF / CI formats | ❌ (text, JSON) | ✅ human/json/SARIF 2.1.0 | gap in DS |
| Binding-trace debugger | ✅ `--explain` | ❌ | gap in MC |
| Corpus config (globs → schemas) | ❌ | ✅ `kind: config` + runner | gap in DS |
| Schema-for-the-schema (editor DX) | ✅ published meta-schema | ❌ | gap in MC |
| Typed read model | ❌ | ✅ `read()` → Doc | gap in DS |
| Contract inference from corpus | ❌ | ✅ `init` / `--check` | gap in DS |
| Template generation | ❌ | 🚧 in progress | — |
| WASM story | 🚧 unpublished crate | Rust engine "wasm-ready" | — |

### 4.2 Envelope & versioning

| Aspect | DS | MC |
|---|---|---|
| Version gate | optional `$schema:` dialect URI; only `…/draft/2026-06/schema` accepted, else exit 2 | required `mcVersion: 1`; any other value throws `DeclarativeError` |
| Document kinds | one (a schema) | `kind: contract` \| `kind: config` |
| Empty schema | `{}` valid — constrains nothing (except unparseable frontmatter) | both planes optional; empty contract valid |
| Unknown keys | load error (exit 2) | load error (`DeclarativeError`) |
| File format | YAML 1.2 ("so JSON is equally valid") | YAML |

Aligned in spirit; trivially bridgeable. A dispatcher could route on `$schema:` vs
`mcVersion:` in one place (MC's docs already note `mcVersion` exists exactly so a
future version "would dispatch here without touching the compilers").

### 4.3 Frontmatter

| Aspect | DS | MC YAML | MC TS |
|---|---|---|---|
| Type system | **Literal JSON Schema 2020-12** — full spec: `if/then`, `oneOf`, `patternProperties`, `$defs`, in-document `$ref` | Closed vocabulary: `type` (string/number/boolean/array/object), `enum` (strings only), `const`; wrappers `optional`/`nullable`/`default` | Arbitrary Zod incl. `.refine()` cross-field |
| Formats | JSON Schema format assertions **enabled** (`date`, `date-time`, `email`, `uri`, …) | 17 named Zod formats (email, url, uuid, hostname, datetime, date, time, duration, ipv4/6, cidrv4/6, nanoid, cuid, cuid2, ulid, base64, emoji, e164) | any Zod |
| Unknown keys in the *document* | JSON Schema default: allowed unless schema says otherwise | default allowed; `strict: true` → `frontmatter/unknown-key` | `z.strictObject` |
| Missing frontmatter | treated as `{}` (so `required` fires) | equivalent behavior | — |
| Reserved keys | `_ $ . # @`-prefixed fields invisible to the schema (tooling-owned) | no such concept | — |
| External `$ref` | rejected at load | n/a (`$ref` deferred entirely) | — |
| Conditionals | full `if/then` *within frontmatter data* | ❌ | `.refine`/`.superRefine` |

This is the plane where DS is declaratively **stronger** than MC's YAML: any
JSON-Schema construct works, and the meta-schema `$ref`s draft 2020-12 so editors
validate the embedded subschema too. MC reaches (and exceeds) that power only via
TS/Zod. Conversely MC's enum-of-strings/const/pattern covers the overwhelmingly
common cases (compare the dogfood task contract's 14-value status enum), and MC's
`default` wrapper feeds the typed model — a concept DS has no use for since it never
outputs data.

Interop note: MC's field vocabulary is *almost* a JSON-Schema subset already —
`type/enum/const/pattern/min/max` map directly (`min`→`minLength|minimum`,
`of`→`items`, `fields`→`properties`, `strict`→`additionalProperties: false`,
`optional` inverts `required`). A mechanical MC→JSON-Schema frontmatter transpile is
low-effort; the reverse direction is only total for the subset.

### 4.4 Section structure & matching semantics

The deepest divergence. Both build a section tree and check declared shapes against
it, but the formalisms differ:

| Aspect | DS | MC |
|---|---|---|
| Section identity | `header` schema: `const` / `enum` / `pattern` (unanchored) / `minLength` / `maxLength` / `maxTokens`; omitted = wildcard | heading name string; `aliases: [...]`; `oneOf: [names]`; canonicalized (lowerCamelCase key, `structure/key-collision` guard) |
| Matching algorithm | **One fixed algorithm**: walk sections in document order; bind each to first entry at-or-after a monotonic pointer whose header schema matches; earlier entries close forever; occurrences tallied **in total** afterwards; unmatched sections fall to `additionalSections` | **Three modes**: `order: none` (presence only), `recognized-relative` (declared sections keep relative order), `strict` (exact order); unknowns via `allowUnknown` or positional `gap {min,max}` |
| Nearest equivalence | ≈ MC `order: recognized-relative` + `allowUnknown` | — |
| Cardinality | `minContains` (default **1**) / `maxContains` (default **∞**) | default **exactly 1**; `optional: true` → 0..1; `repeatable: true` + `min`/`max` |
| Optional section | `minContains: 0` | `optional: true` |
| Wildcard entry | header-less entry, must be last (else "unreachable entry" load error) | no direct analogue (`gap` is positional, `allowUnknown` is global) |
| Duplicate-identity entries | load error; spec: "write 'two to four lead paragraphs' as one entry with min/maxContains, never repeated entries" | repeated `section: X` at one level → `structure/duplicate-section` at validate time (of the doc) |
| Recursion | `sections` inside a section entry; per-entry `additionalSections` | `children: {order, allowUnknown, sections}` |
| Debugging | `--explain` prints the binding trace | — |

Consequences worth internalizing before any alignment work:

- **DS cannot express MC's `order: none`** ("these five sections required, any
  order") — its pointer is monotonic. MC's own dogfood contracts all use
  `order: none`, so DS-as-it-stands could not validate MC's own planning corpus
  as-written. MC is more expressive on ordering.
- **MC cannot express DS's pattern-bound repeating sections** — e.g. the spec's log
  page (`header: {pattern: '^\d{4}-\d{2}-\d{2}$'}, minContains: 3`). MC sections
  bind by name; there is no regex heading slot. This is DS's single biggest
  structural win and the most valuable single feature MC could adopt.
- **Binding is header-only in DS**: a section matching an entry's header binds even
  if its innards fail, and reports those failures (it never falls through to
  `additionalSections`). MC's name-binding behaves equivalently. Aligned instinct.
- DS's "tallied in total" occurrence counting (`date, date, other, date` = 3 dates)
  differs from MC's `repeatable` slot counting; edge-case behavior would need
  fixture-level pinning in any compatibility mode.

### 4.5 Blocks & content

| Aspect | DS | MC |
|---|---|---|
| Model | Ordered `blocks` sequence per section (and above first heading), validated with the **same greedy matcher** as sections; binding identity = `type` + `text`/`lang` schema | A section's `content` = **one leaf** or a map of `^anchor`-named leaves; no ordered multi-block grammar |
| Kinds | `paragraph`, `bullet-list`, `ordered-list`, `code`, `quote`, `table`, `rule`; `type` may be a **list** of kinds | leaves: `maxWords` (prose), `code {lang}`, `table {...}`, `list {...}` |
| Kind mismatch | wrong-kind = binding failure / leftover policy | `structure/block-kind`, `structure/block-missing` |
| Tables | **type-only** — no columns, no header row, no cells (`text` sees cell text) | `columns` (required), `cells` per-column schemas, `minRows`, `extraColumns: ignore\|error`, `anchor` |
| Lists | bullet vs ordered are distinct types; `items` schema on every item (`text`, `maxTokens`, nested `blocks` — items can contain block trees); `minItems`/`maxItems` (both default unbounded — empty list passes!) | `everyItem: checkbox \| schema`, `minItems`, `ordered: bool` |
| Quotes | recursive `blocks` inside quotes | ❌ |
| Thematic breaks | `rule` type | ❌ |
| Code language | `lang` takes a full header schema (pattern/enum/const) | exact string match |
| Nesting | "containers nest without limit" | table/list/code leaves are terminal |
| Keyword/type mismatch | load error (`lang` on paragraph etc.) | build-time `ContractBuildError` analogues |

Split decision: DS's block plane is **structurally** more general (ordered
sequences, occurrence bounds per block shape, quote/rule kinds, items-with-nested-
blocks); MC's is **deeper on the two kinds that carry data** (tables with per-column
cell schemas — which feed typed rows — and checkbox lists). A superset MC would adopt
DS's sequence grammar while keeping its table/cell depth; nothing conflicts, the
models compose.

### 4.6 String & text constraints

| Aspect | DS | MC |
|---|---|---|
| On a header / block text | `pattern` (unanchored, "contains"), `const`, `enum`, `minLength`/`maxLength`, `maxTokens`; `enum`+`const` together = load error | headings are exact names/aliases; block text via `requires`/`forbids` |
| Scoped phrase requirements | only by declaring a bound block entry (e.g. "some paragraph matching X exists") | `requires:` on any section or body root: `pattern` (literal) xor `regex`, `normalize`, `ignoreCase`, `min`/`max` occurrence counts |
| Negation | **none anywhere** (`allBlocks` asserts every block *matches*; no way to say "must not contain") | `forbids:` with per-hit findings at the offending line |
| Authoring-mistake detection | load-error catalog (invalid regex, negative counts, `minContains>maxContains`, …) | compile-time duplicate-matcher, requires/forbids contradiction, count-floor checks |
| Severity/id/note per constraint | ❌ (`description` hint only) | `level: error\|warn`, `id` override, `note` |

MC's text plane is strictly richer. The one DS idea worth stealing here is
`maxTokens` as a text constraint (see §4.7) and the pervasive `description` hint.

*(Repo housekeeping note: `reference/findings.md` still carries a "Planned — YAML
`requires:`/`forbids:` not yet wired" caution. It **is** wired —
`packages/core/src/declarative/text.ts` exists and `contracts/decision.contract.yaml`
uses a `requires: regex` in production. Stale doc.)*

### 4.7 Budgets & depth

| Aspect | DS | MC |
|---|---|---|
| Size metric | **tokens**, OpenAI `o200k_base` BPE via tiktoken-rs; counting function injectable at the library level | **words** (`maxWords`, `content/max-words`) |
| Where budgets attach | document body, any section subtree (header included), any block subtree, any text (`text: {maxTokens}`), list items — and store-wide via `allBlocks` | a section's prose leaf only |
| What's counted | subtree budgets over raw source span (markers included); text budgets over plain text | words in prose |
| Direction | max only (no min) | max only |
| Depth control | `maxDepth` at document and per-section (`3` allows `###`) | none; `structure/heading-depth-jump` warns on *skipped* levels only |

DS's token budgets are its most distinctive feature — the direct "keep this section
inside an LLM context slice" contract. MC has no equivalent, and given MC's explicit
agent-authored-corpus use case, this is arguably the most *strategically* valuable DS
feature to adopt (as an additional leaf/keyword — words and tokens are complementary,
not competing). Cost note: an `o200k_base` tokenizer is a real dependency in both of
MC's engines (js-tiktoken / tiktoken-rs); DS's injectable-counter design is the right
pattern to copy.

### 4.8 Cross-cutting rules & escape hatches

| Aspect | DS | MC |
|---|---|---|
| Universal rules | `allSections` / `allBlocks` — reduced schemas (header/text + maxTokens + maxDepth + description only) applied at every depth; all in-scope declarations stack | ❌ in YAML; TS `docRule` can do anything |
| Leftover policy | `additionalSections` / `additionalBlocks`: `true` / `false` / **reduced schema** (explicitly modeled on JSON Schema `unevaluatedItems`) | `allowUnknown: bool` (+ positional `gap`) |
| Conditional structure (frontmatter gating body) | ❌ | ❌ YAML; TS `docRule` |
| Composition across schema files | ❌ (no `$ref`/import outside frontmatter) | ❌ (deferred escape hatch; config can *reference* contracts by name/path but not compose them) |
| Custom rules / plugins | **none, by design** — the schema language is the whole surface | TS `rule` (node-local) / `docRule` (whole-doc, gets typed doc + tree), author-minted ids |
| Cross-document rules | ❌ | ❌ engine-level (docRule is per-doc); corpus runner aggregates but doesn't correlate |

Both v1 vocabularies are conservative in the same places (no conditionals, no
composition). The difference is the escape hatch: MC has a code tier; DS
deliberately has none. That makes "MC as a superset of DS" architecturally natural,
and "DS as the shared engine under MC" impossible without abandoning MC's rule tier.

### 4.9 Findings & outputs

| Aspect | DS | MC |
|---|---|---|
| Violation record | `{breadcrumb[], hint, keyword, message, schemaPath}` | `{id, level, path, pos?{line,col?}, message, fix?}` |
| Location in the *document* | breadcrumb of matched header texts + positional fallbacks (`sections[2]`, `items[3]`); **no line/column/offset** | 1-based `line`(+`col`) on position-pinned findings; omitted only for absence findings |
| Location in the *schema* | `schemaPath` JSON Pointer (e.g. `/frontmatter/properties/date/format`) + failing `keyword` | ❌ (rule id names the rule, not the schema location) |
| Identity | failing keyword name | stable namespaced rule id (26 engine ids across structure/content/frontmatter/text planes + synthesized text ids + custom namespaces) |
| Severity | none | error/warn/report, id→level registry, text-plane overrides |
| Hints | nearest `description` walking outward — every schema level can carry authored guidance | `note` on text specs; engine-authored messages otherwise |
| Formats | text lines, JSON (`-f json`) | human, JSON, **SARIF 2.1.0** |
| Fix metadata | ❌ | advisory `fix` field (never applied) |
| Exit codes | 0 / 1 / 2 | 0 / 1 / 2 (same meanings) ✅ |

This is where the projects' founding requirements visibly differ. MC's whole design
flows from `path:line` findings (its d0014 research *disqualified* JSON-Schema-based
approaches for reporting `instancePath` instead of lines); DS reports pure
breadcrumbs. For an agent fix-loop breadcrumbs are arguably sufficient (the agent
re-reads the section by name); for CI annotation, SARIF, and editor integration they
are not. If MC implements DS semantics, MC's findings would make it a *better* DS
validator than schematter on this axis alone. DS's `schemaPath`+`keyword` and
nearest-`description` hints are the two reporting ideas MC should import.

### 4.10 Corpus operation & CLI

| Aspect | DS | MC |
|---|---|---|
| Doc↔schema binding | caller's job, explicitly out of scope; multiple schemas = multiple runs | `kind: config`: ordered `rules: [{include globs, exclude, contract}]`, named contract map, auto-discovery, first-match routing |
| CLI | `schematter validate NOTE.md --schema note.yaml [-f json] [--explain]` | `markdown-contract validate <path> [--config\|--contract] [--format human\|json\|sarif]`; `init` (inference, `--meta`, `--depth`, `--check` drift gate) |
| Stats | ❌ | files scanned/matched/unmatched, per-rule counts |
| stdin | `<stdin>` key supported | — |

MC's corpus layer has no DS counterpart and no conflict — it wraps *any* per-document
validator. This is precisely the "MC wraps a shared core for its richer featureset"
seam the goal statement hypothesized: DS = the per-document schema language; MC =
per-document semantics **plus** corpus routing, severities, SARIF, typed reads.

### 4.11 Parser & dialect

| Aspect | DS (schematter) | MC |
|---|---|---|
| Parser | pulldown-cmark: CommonMark + tables + strikethrough + **wikilinks** | remark: GFM (tables, strikethrough, task lists, autolinks, footnotes) + frontmatter + in-house Obsidian dialect |
| Task lists | ❌ not enabled | ✅ (`everyItem: checkbox`) |
| Footnotes | ❌ | ✅ parsed |
| Wikilinks | parsed so text survives; **no schema keywords touch them** | recognized (`[[t\|alias]]`, `#heading`, `#^anchor`, `![[transclusion]]`); no resolution either; harvesting not yet public |
| Block anchors `^id` | ❌ | ✅ first-class: binding rules, table-anchor lift, `anchor:` contract checks, `byAnchor` navigation |
| Skipped heading levels | **normalized** (`#` → `###` becomes parent-child, silently) | kept as-is + `structure/heading-depth-jump` warn |
| Raw HTML blocks | invisible as blocks (bytes still counted in subtree budgets) — inferred from source | flows through remark's model |
| Frontmatter edge cases | duplicate keys = parse failure; non-mapping = violation; reserved `_ $ . # @` prefixes invisible | YAML per remark-frontmatter/yaml |

The projection-semantics differences (heading normalization, HTML, task lists) are
the *quietly dangerous* part of any compatibility claim: two engines can agree on
every keyword and still disagree on what tree a weird document projects to. Any
alignment work needs shared fixtures for exactly these edges (see §7.4).

### 4.12 Beyond validation

DS: nothing beyond validation, on principle. MC: typed model, inference/`--check`,
template generation (in progress), Rust engine parity, daemon dashboard, desktop app.
No alignment question here — this is the "richer featureset" MC keeps regardless.

---

## 5. Gap inventories

### 5.1 DS capabilities MC lacks (adopting these ⇒ MC becomes a DS superset)

| # | DS feature | MC status | Adoption cost | Worth it independent of DS? |
|---|---|---|---|---|
| G1 | Header-**schema** section binding (`pattern`/`enum`/`const` headers, wildcard entries) + greedy ordered matcher | names/aliases/oneOf only | **M–L** — new binding mode in the structure plane, both engines | **Yes** — date-headed logs/changelogs are a real corpus shape MC can't declare today |
| G2 | Ordered block-sequence grammar per section (+ quote recursion, `rule` kind, multi-kind `type`) | single content leaf / named leaves | **M–L** — extends content plane grammar | Yes — "one lead paragraph, then a bullet list" is a natural contract |
| G3 | Token budgets (`maxTokens` at doc/section/block/text) | `maxWords` only | **M** — leaf + keyword + tokenizer dep (injectable counter, per DS's own design) | **Yes** — MC's agent-corpus story wants this |
| G4 | `maxDepth` (absolute nesting bound, doc + per-section) | depth-jump warn only | **S** | Yes |
| G5 | `allSections` / `allBlocks` universal reduced rules | TS `docRule` only | **M** | Yes — "no block over N tokens anywhere" in pure YAML |
| G6 | `additionalSections`/`additionalBlocks` as a **schema** (not just bool) | `allowUnknown` bool | **S–M** — generalize `allowUnknown` | Yes |
| G7 | Full JSON Schema 2020-12 frontmatter (incl. `if/then`, `$defs`, in-doc `$ref`, format assertions) | closed Zod vocab (TS: Zod) | **M** — either ajv/jsonschema-crate beside Zod, or accept-JSON-Schema-as-input compile | Partially — MC's vocab covers most real cases; needed for DS compat |
| G8 | `description` hints at every level + nearest-hint resolution | `note` on text specs | **S** | **Yes** — cheap, big authoring win |
| G9 | `schemaPath` + failing `keyword` on findings | rule ids only | **S–M** | Yes for declarative authors |
| G10 | Published meta-schema for the YAML dialect (editor completion) | ❌ | **S** — mechanical | **Yes** — pure DX win, no engine work |
| G11 | `--explain` binding trace | ❌ | **S–M** | Yes once G1 lands |

### 5.2 MC capabilities DS lacks (what "MC wraps the shared semantics" adds)

Positions (`path:line`), severities, SARIF, corpus config + runner + stats, per-column
table cells / `minRows` / `extraColumns`, checkbox lists / `ordered` flag,
`forbids` + occurrence-count text rules with normalize/ignoreCase, `order: none` and
`strict` modes, positional `gap()`, `aliases`, Obsidian anchors as contract +
navigation, custom TS rules (`rule`/`docRule`), Zod escape hatch, typed read model,
contract inference + drift gate, template generation, dashboard/desktop, advisory
`fix`, `report` level, `default` values feeding reads, footnote/task-list parsing.

None of these conflict with DS semantics; they layer on top or sit beside.

---

## 6. Semantic conflicts — where "the same-looking thing" means something different

These are the traps for any compatibility mode; each needs an explicit decision and
a pinned fixture, because a keyword mapping alone will silently diverge.

| # | Axis | DS says | MC says | Resolution sketch |
|---|---|---|---|---|
| C1 | **Default section cardinality** | `sections` entry = **1..∞** (`minContains` 1, `maxContains` unbounded) | `section:` = **exactly 1** (`duplicate-section` on repeat) | Keep both, per dialect; in any unified vocabulary make cardinality explicit; never translate defaults silently |
| C2 | **Order semantics** | one fixed ordered-greedy algorithm; unmatched → leftover policy | three modes; `none` has no DS equivalent | DS ≈ `recognized-relative`; a DS-input mode pins the greedy matcher exactly (incl. total-tally counting); MC keeps its modes as superset |
| C3 | **Heading-level projection** | skipped levels **normalize** to parent-child, silently | levels kept; skip = `heading-depth-jump` warn | Fixture-pin both; a DS-compat mode must normalize (or document divergence) |
| C4 | **`pattern` anchoring** | unanchored, JSON-Schema style (`pattern: Tasks` = *contains*) | MC frontmatter `pattern` is also regex-`test` (unanchored) — aligned; but MC section *names* are exact | Fine as long as G1 adopts unanchored semantics with the same "write `^…$`" guidance |
| C5 | **Size units** | tokens (o200k_base, raw-source spans for subtrees) | words (plain prose) | Not a conflict — carry both (`maxWords`, `maxTokens`); never alias one to the other |
| C6 | **Empty list** | passes `items` constraints until `minItems` set (`minItems` ≠ `minContains` — spec calls this out) | `minItems` on the list leaf; list presence is the structure plane's job | Behaviorally close; pin with fixtures |
| C7 | **Unknown-frontmatter keys + reserved prefixes** | JSON-Schema-default open; `_ $ . # @` prefixes invisible to schema | open unless `strict: true`; no reserved prefixes | DS-compat mode must hide reserved prefixes before evaluation; MC-native mode should *not* adopt invisibility silently |
| C8 | **Violation identity** | failing `keyword` + `schemaPath` | stable rule `id` + severity | In a DS-compat mode, emit both: MC finding ids *and* keyword/schemaPath fields |
| C9 | **YAML scalar coercion** | header `const: 2024` coerces to `"2024"` (with documented strictness exceptions) | MC `const` accepts string/number/boolean literally (Zod literal) | Compat layer coerces at the boundary per DS meta-schema rules |
| C10 | **`enum`** | strings (header schema) but full JSON Schema in frontmatter (any JSON values) | strings only, everywhere in YAML | G7 decision covers frontmatter; header enums align already |

---

## 7. Feasibility of alignment — four options

### Option A — Vocabulary convergence (rename/alias toward the JSON-Schema idiom)

Adopt DS/JSON-Schema *names* where MC has the same concept: accept
`minContains`/`maxContains` beside `repeatable`+`min`/`max`, `additionalSections`
beside `allowUnknown`, `description` everywhere, `$schema` beside `mcVersion`.
Publish a meta-schema (G10).

- **Cost: S.** Pure front-end (the declarative layer is already "a pure front end"
  compiling to Contract objects); no engine changes except G8/G10.
- **Value:** lowers the learning curve (JSON-Schema vocabulary is the lingua franca),
  makes later options cheaper, zero semantic risk if added as aliases with the
  existing keys kept.
- **Risk:** two spellings for one thing; needs a "canonical spelling" lint to avoid
  corpus drift.
- **Verdict: do it opportunistically** — specifically `description` hints and the
  meta-schema, which are wins with no aliasing debate.

### Option B — MC as a DS **superset**: accept document-schema files as an input dialect

Dispatch on `$schema: https://document-schema.org/draft/2026-06/schema` at the
loader; compile DS schemas onto MC's engine, extended with G1–G7. MC's config layer
routes DS schemas like any contract (`contract: ./note.ds.yaml` in `kind: config`
rules). Findings come out position-pinned, severity-carrying, SARIF-able — i.e. MC
becomes a strictly better DS validator, plus everything MC already is.

- **Cost: M–L overall**, but decomposable, and *every* engine piece (G1–G5) is
  independently on-thesis for MC. The genuinely DS-specific work is small: the
  loader/compat shim, the C1–C10 semantics pinning, JSON-Schema frontmatter
  evaluation (G7 — the one new heavyweight: ajv or equivalent in TS, `jsonschema`
  crate in Rust, or a documented supported subset), and the tokenizer dependency
  (G3, injectable).
- **Dual-engine tax:** every addition lands twice (TS + Rust) under the existing
  parity-fixture discipline. Real but already MC's operating model.
- **Fidelity risk:** "supports DS" is a conformance claim against a 3-day-old draft
  spec with exactly one implementation; behavior not covered by the spec text is
  defined by schematter's source. Mitigate with §7.4's corpus and by versioning the
  claim ("draft 2026-06 only", mirroring DS's own dialect gate — exactly what
  `mcVersion` dispatch was designed for).
- **Does it still satisfy MC's requirements?** Yes — nothing in DS semantics
  conflicts with MC's invariants (one parse, position-pinned findings, typed model,
  purity). DS docs validated in compat mode simply don't get a typed model *from the
  DS schema* (DS declares no reads); they can still be read via an MC contract.
- **Verdict: feasible and the highest-leverage option** — with the caveat that the
  *reason* to do G1–G5 is MC's own roadmap; DS compatibility then falls out at ~20%
  extra cost, and its worth depends on whether DS gets adoption (watch, don't bet).

### Option C — A literally shared validator engine

Two directions, both poor fits today:

- **MC wraps schematter-validator** (its core is markup-agnostic by design — MC
  could feed it a Document built from remark). But: violations carry **no
  positions** (kills MC's founding requirement — the model literally has no offset
  fields to fill), no severities, no custom-rule tier; it's Rust-only so
  `packages/core` (the canonical TS artifact) would need WASM in its hot path; and
  it's a v0.1.0, 1-star, single-org dependency. MC would be trading its engine's
  guarantees for someone else's weaker ones.
- **DS adopts MC's engine** as reference implementation: not MC's decision to make,
  and unrealistic to expect from a project three days into its own Rust
  implementation.

**Verdict: not recommended in code.** The architecture the goal statement envisioned
("shared validator engine, MC wrapping it for its richer featureset") is better
realized as *shared semantics + shared conformance fixtures* (Option D) with
independent engines — which is precisely how MC already keeps its own TS and Rust
engines honest. In effect, MC's engine *becomes* a second implementation of the DS
spec, rather than both projects sharing one binary.

### Option D — Shared conformance corpus + upstream influence

Extend MC's existing cross-engine fixture discipline
(`packages/core/tests/fixtures/validation` goldens run by both TS and Rust) with a DS
conformance suite: the spec's own examples, plus fixtures pinning every C1–C10 edge
(heading normalization, total-tally counting, empty lists, scalar coercion, reserved
prefixes). Offer it upstream — a spec this young has no conformance suite, and the
contributor who writes one earns standing to influence the draft (source positions
as optional violation fields, severity tiers, table columns — each an issue MC has
already solved and can argue from experience).

- **Cost: S–M**, mostly fixture authoring; no engine commitment required to start.
- **Value:** de-risks Option B before any engine work; converts "DS is a moving
  target" from a threat into influence; useful even if DS dies (the fixtures document
  MC's own projection edges).
- **Verdict: do first.** It is the cheapest probe of both the spec's stability and
  the maintainers' openness.

---

## 8. Recommendation

Sequenced, cheapest-first, each step valuable even if the next never happens:

1. **Now (S):** Adopt the free DS ideas that need no compatibility story —
   `description` hints with nearest-hint resolution (G8), a published meta-schema
   for `mcVersion: 1` (G10), and fix the stale `findings.md` caution. Watch DS for
   adoption signals; open contact upstream (shared fixtures, position-fields
   proposal).
2. **Next (S–M):** Build the DS conformance fixture set (Option D) and run MC's
   projection against it to get a *measured* — not estimated — divergence list for
   C1–C10.
3. **Then, on MC's own roadmap merits (M–L):** land G1 (header-pattern sections +
   greedy mode), G2 (block sequences), G3 (token budgets), G4 (`maxDepth`), G5/G6
   (universal rules, schema-valued unknowns policy). After these, MC's YAML is a
   semantic superset of DS's body plane regardless of any compat switch.
4. **Last, and only if DS earns adoption (S at that point):** the `$schema` dispatch
   + JSON-Schema frontmatter evaluation (G7), turning MC into a conforming DS
   validator with strictly better output (positions, severities, SARIF, corpus
   routing) — the "MC wraps the shared semantics for its richer featureset" end
   state, achieved without sharing a line of engine code.

The inverse direction — constraining MC to DS's rule set — is not viable: it would
surrender order modes, table cells, text negation, severities, positions, anchors,
and the entire code tier that MC's own corpus already depends on.

---

## Appendix A — keyword-by-keyword mapping (DS → MC)

| DS keyword | MC equivalent | Status |
|---|---|---|
| `$schema` | `mcVersion` | ≈ different versioning idiom |
| `description` (hints) | `note` (text specs only) | ❌ MC gap (G8) |
| `frontmatter` (JSON Schema) | `frontmatter.fields` (closed vocab) / TS Zod | ≈ (G7) |
| `maxTokens` (doc/section/block/text) | — (`maxWords` nearest) | ❌ MC gap (G3) |
| `maxDepth` | — (`heading-depth-jump` warn ≠) | ❌ MC gap (G4) |
| `sections` (ordered entries) | `body.sections` | ≈ binding+order differ (C1, C2) |
| `header: {const}` | `section: Name` | ✅ |
| `header: {enum}` | `oneOf` / `aliases` | ✅ (aliases also normalize identity) |
| `header: {pattern\|minLength\|maxLength\|maxTokens}` | — | ❌ MC gap (G1) |
| entry without `header` (wildcard, last-only) | ≈ `allowUnknown` / `gap` | ≈ |
| `minContains` / `maxContains` | `optional` / `repeatable`+`min`/`max` | ≈ defaults differ (C1) |
| `additionalSections: bool` | `allowUnknown` | ✅ |
| `additionalSections: <reduced schema>` | — | ❌ MC gap (G6) |
| `allSections` / `allBlocks` | — (TS `docRule`) | ❌ MC YAML gap (G5) |
| `blocks` (ordered sequence) | `content` single/named leaves | ❌ MC gap (G2) |
| `type: paragraph` | ≈ `maxWords` leaf implies prose | ≈ |
| `type: code` + `lang` (schema) | `code: {lang}` (exact) | ≈ DS richer on lang |
| `type: table` | `table: {columns, cells, minRows, extraColumns, anchor}` | MC far richer; DS type-only |
| `type: bullet-list` / `ordered-list` | `list: {ordered: false/true}` | ✅ |
| `items: {text, maxTokens, blocks}` | `everyItem: schema` | ≈ MC adds `checkbox`; DS adds nested blocks/tokens |
| `minItems` / `maxItems` | `minItems` / — | ≈ MC lacks maxItems |
| `type: quote` (recursive `blocks`) | — | ❌ MC gap (part of G2) |
| `type: rule` | — | ❌ MC gap (part of G2) |
| — | `gap {min,max}` | ❌ DS gap |
| — | `order: none` / `strict` | ❌ DS gap |
| — | `anchor:` / `^block-id` | ❌ DS gap |
| — | `requires` / `forbids` (+counts, normalize, ignoreCase, level, id) | ❌ DS gap (partial: bound block w/ `text.pattern` ≈ requires) |
| — | `strict` frontmatter | ✅ expressible in DS as `additionalProperties: false` |
| — | `default`, `nullable` wrappers | frontmatter JSON Schema has `default` (annotation-only — no typed read to feed) |
| — | `kind: config` (globs → contracts) | ❌ DS gap (explicitly caller's job) |
| — | severity levels, SARIF, positions, `fix` | ❌ DS gap |
| `--explain` | — | ❌ MC gap (G11) |
| exit 0/1/2 | exit 0/1/2 | ✅ identical |

## Appendix B — source notes

- DS spec details verified against the draft 2026-06 spec text, the published
  meta-schema, and schematter v0.1.0 source (`builder.rs`, `document.rs`,
  `violation.rs`, `main.rs`); raw HTML-block invisibility is inferred from source
  (spec is silent). Verbatim copies in the session scratchpad.
- MC details from the shipped reference docs, `packages/core/src/declarative/*`, the
  dogfood contracts, and the d0014 landscape research (which predates DS and does
  not mention it).
- Docs drift found during this work: `reference/findings.md` "Planned" caution on
  YAML `requires:`/`forbids:` is stale — the feature is shipped and dogfooded.
