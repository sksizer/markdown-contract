---
type: decision
schema_version: "1"
id: D-0014
status: open/proposed
title: "Markdown structure validation — per-type contracts over one AST"
created: 2026-06-07
last_reviewed: 2026-06-18
related:
  - "[[B-8FL9-validate-markdown-structure-by-applying-json-schema-to-its-ast]]"
  - "[[D-0008-markdown-standard]]"
  - "[[D-0011-markdown-formatting-tool]]"
  - "[[D-0004-entity-definition-architecture]]"
  - "[[D-0005-repair-on-prepare-and-aggressive-entity-upgrade]]"
  - "[[D-0006-typescript-substrate]]"
  - "[[D-0007-deterministic-op-substrate]]"
  - "[[D-H7FS-op-substrate-surface]]"
  - "[[D-K9PX-system-architecture]]"
  - "[[D-0002-entity-identifier-shape]]"
  - "[[S-0005-entity-definition-contract]]"
  - "[[S-0007-markdown-formatting]]"
tags:
  - markdown
  - validation
  - tooling
  - planning-meta
need_human_review: true
---
# Markdown structure validation — per-type contracts over one AST

## Summary

Validate every planning-corpus document against a per-type structural contract,
authored **in TypeScript** alongside the frontmatter schema and built on the substrate already in
the tree. One remark/mdast parse projects each body into a position-carrying section tree; that
tree is validated by a small **content-model grammar** — a combinator API
(`section`/`optional`/`oneOf`/`gap`/nested `children`) for the one axis a schema language cannot
express — with **Zod** embedded at every leaf (frontmatter, per-section content, table/list/code
shape) and reused for the single-node checks the corpus already standardized on when ajv was
retired (T-DHUF/T-JO4I). One contract per type, one finding shape, shipped as a deterministic op.
**Rejected**: adopting an external validator (markdownlint + markdownlint-obsidian, or the Go
binary `mdschema` — both evaluated empirically, both under-cover frontmatter and fight
`allow_unknown`); a second tree-sitter parser; a template-as-contract scaffold; and
JSON-Schema-over-the-whole-AST (B-8FL9 as filed). The decision is **proposed, not yet accepted** —
ratification is gated on scoping spikes (Migration phase 0).

^summary

## Context

The planning corpus is validated like code: every entity type carries a frontmatter contract
(a per-type **Zod** schema over a shared `CommonFrontmatter` base, `entities/<type>/schema.ts`; ajv
Draft 2020-12 was the engine until it was retired for Zod in T-DHUF/T-JO4I, PR #444) and a body
contract (`body-schema.yaml`: required/optional H2 sections, aliases, unknown-section policy).
Around that core, structural checks accreted one scanner at a time. A six-subsystem map (research
appendix [research/current-state.md](research/current-state.md)) found ~35 distinct structural
checks implemented across four mechanisms, with heavy duplication:

| Duplicated mechanism                       | Copies | Examples (line numbers as of 2026-06-18)                                                                                                                    |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontmatter slice regex (`FRONTMATTER_RE`) | ~18    | `entity.ts:65`, `validate.ts:66`, `audit.ts:56`, `markdown_extract.ts:77`, the task scanners (`scan-placeholders.ts:27`, `parse-touchpoints.ts:26`, `quantifiers.ts:33`, `paths.ts:38`, `gap-report.ts:65`, `_task_doc.ts:27`), `migrate.ts:45`, `_update.ts:56`, `.claude/skills/project-check/check_entities.ts` — partial consolidation already in flight: a canonical `util/frontmatter.ts:34` (T-MBOK) is adopted by ~7 callers, the rest still inline |
| Fence-aware H2 section walker              | 6      | `entity.ts:507` (`extractH2Headings`, called by `validateBody:355`), `_skill_prose_core.ts:46`+`:126` (`H2_RE` + `codeFenceLines`), `scan-placeholders.ts:127`, `parse-touchpoints.ts:87`, `scan_corpus_assumptions.ts:162`, `quantifiers.ts:70` |
| Section-alias vocabulary                   | 3      | `body-schema.yaml aliases:` (11 manifests), `scan-placeholders.ts:39` (`REQUIRED_SECTIONS`), `parse-touchpoints.ts:46` (`SECTION_ALIASES`) — already divergent (task `Today`/`Goal` aliases live in code, not the manifest) |
| Frontmatter validation engine              | 1 (was 3) | `entity.ts:340` → `entities/_validate.ts` renderer. The three former ajv setups (`entity`/`validate`/`audit`) **already consolidated** onto one Zod `.safeParse` + a shared `ZodError.issues → {location, message}` renderer in T-DHUF/T-JO4I, with the goldens held byte-identical across the swap. The duplication this row tracked is now closed — cited as evidence the corpus is already converging on one engine. |

Meanwhile the config promises more than the engines deliver: `order: strict` is declared in
manifests and read by nothing; per-section `description:` text is parsed and ignored; `^summary`
absence fails silently (blank index cell); body validation runs at author- and audit-time but not
under `entities validate`. One real markdown parser exists — `markdown_extract.ts` (remark/mdast),
whose own docstring names [[B-8FL9-validate-markdown-structure-by-applying-json-schema-to-its-ast|B-8FL9]]
as the intended consolidation — yet every validation engine bypasses it for line scanners.

Three forces make this the moment to consolidate:

- **The two-plane split** (D-DX1Q/D-WAKO, in flight on PR #323): rust-ontogen consumes only the
  JSON-Schema subset it understands; *full validation stays with the document* — i.e. with the
  library this decision designs. The companion round-trip fidelity gate (parse → render →
  `git diff --exit-code`) constrains every parsing choice made here.
- **[[D-0008-markdown-standard]]** settled formatting and explicitly handed the structural axes to
  "the schema validators, not the new formatter". This decision is that other half.
- **Open questions left by prior decisions**: [[D-0004-entity-definition-architecture]]'s
  body-manifest consolidation fork, and [[D-K9PX-system-architecture]]'s body-validator hook
  surface.

Research basis: two multi-agent workflow runs (32 agents; six subsystem maps, seven prior-art
researchers, four independently designed options, twelve adversarial reviews, one scored judgment).
Appendices: [research/current-state.md](research/current-state.md) (inventory + requirements
REQ-01..38 + open tensions), [research/landscape.md](research/landscape.md) (prior art + paradigm
analysis), [research/decision-package.md](research/decision-package.md) (scoring + verdicts).

## Decision

Build the validation library as a **bespoke assembly on the in-repo substrate**: one remark/mdast
parse per document feeding three cooperating mechanisms, declared per-type contracts, one finding
shape, shipped as a deterministic op. Nothing off the shelf covers the niche — every surveyed
ecosystem validates frontmatter and *transforms* bodies; none declaratively validates body
structure (see Options considered).

| #   | Component            | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **One parse**        | remark/mdast via `unified` — extend `markdown_extract.ts` as the single parse path. The ~18 frontmatter regexes, 6 fence walkers, and offset counting retire; fence-awareness and `<path>:<line>` positions are intrinsic to the tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2   | **Obsidian dialect** | In-house micromark extension pair (`syntax` + `mdast-util` from/to-markdown) for line-terminal `^block-id`, `[[target\|alias#anchor]]` wikilinks, and `![[file#^anchor]]` transclusion. Verified 2026-06: no maintained package parses this dialect — owning ~900-1200 LoC here is the price of the niche, and the round-trip gate covers it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3   | **Contract split**   | The contract is authored **in TypeScript**, one module per type, split by expressiveness class (Murata: schema languages and regular tree grammars are formally incomparable — the design is RELAX NG's "pattern + datatype library" shape). One mdast→object **projection** turns each body into a position-carrying *tree* of sections (per node: heading, source line, child sections, and child blocks — tables/lists/code — the `BodyModel` D-MDSV proposed). A small **content-model grammar** — a combinator API (`section`/`optional`/`oneOf`/`gap` + nested `children`, with `order` + `allowUnknown` per level) — validates the section *sequence and nesting*, the one axis Zod's array vocabulary cannot express. **Zod** is embedded at every leaf: frontmatter and single-node shapes (per-type `schema.ts`, the engine the corpus standardized on in T-DHUF/T-JO4I — where B-8FL9's structural-schema idea lands) and per-section *content* (a finite `table({columns,cells})`/`list`/`maxWords` vocabulary that compiles to Zod over the projected node, with raw `z.*` as the escape hatch). Cross-node/cross-file rules (`depends_on` graph, path-moved claims, vacuous quantifiers, status-conditional requirements) attach to grammar nodes as named, id'd rule functions (Schematron lineage, generalizing `claims/*`). The whole thing is one `contract({ frontmatter, body, rules })` per type, validated in a single pass and returning a typed `{ frontmatter, body }` — which is what lets a frontmatter field gate a body section (`status: closed/* ⇒ a Completion note section`), a cross-plane rule the separate engines could not express. |
| 4   | **Contract home**    | One TypeScript contract per entity type, colocated with the frontmatter schema (`entities/<type>/`: the existing `schema.ts` for frontmatter plus a body-grammar module, or one merged `contract.ts`). This **retires `body-schema.yaml`** — and resolves D-0004's fork by collapsing both candidates (YAML manifest, `schema.json` vendor key — both gone or going) into TypeScript: the contract is code, in the same language and engine as the frontmatter beside it, composable and type-checked. Alias vocabulary is declared once in the grammar (`oneOf`/alias sets) and consumed everywhere; the three code-side alias tables are deleted. Section-name matching is exact and case-sensitive, uniformly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5   | **Finding shape**    | One shape for every mechanism: `{ id, level: error\|warn\|report, path, line, col?, message, fix? }`. Severity is contract data, not call-site choice (commitlint model) — the same rule cannot be hard at author-time and soft at audit by accident. Rule ids are namespaced (OFM-style) for filtering and golden-pinning. `fix?` carries machine-applicable suggestions only; applying them is [[D-0005-repair-on-prepare-and-aggressive-entity-upgrade]]'s separate pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6   | **Op substrate**     | A deterministic op under `plugin/lib` (`defineOp`, Zod I/O, `OpError`), surfaced through the generated CLI/MCP/HTTP adapters and importable as functions ([[D-0007-deterministic-op-substrate]], [[D-H7FS-op-substrate-surface]]). The validator path is LLM-free; deterministic candidate-emitters feeding LLM adjudication (the corpus-assumption pattern) remain the sanctioned seam.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 7   | **Read-only**        | The validator never mutates or normalizes a document. Repair/normalize stays a distinct downstream pass. Round-trip fidelity of the extension is proven by spike, not assumed (Open questions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 8   | **Templates**        | `body-template.eta` stays the hand-authored content artifact and Eta stays the template engine. The contract *validates* the template — the gate renders each type's template with sample frontmatter and runs this library over the result (`validate(render(template))`), so templates are born-valid by check. The contract does **not** generate templates (Out of scope — refused trajectory).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 9   | **Ordering**         | The grammar's default is `order: none`; `recognized-relative` (recognized sections ordered relative to each other, unknown sections interleaving freely) is opt-in per type and per nesting level. The decision contract's declared order is corrected to match corpus reality (Context before Decision) rather than rewriting seven shipped decisions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 10  | **Day-1 severity**   | Grandfathered: the existing corpus surfaces findings at `report` tier (visible, non-gating) with a remediation backlog item; `error` tier gates newly created and newly edited documents (born-valid). Deliberate WIP uses inline `<!-- structure-disable <rule-id> -->` with an audit trail instead of `--no-verify`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

The concrete shape — package layout (a standalone `markdown-contract` package), API surface, and
syntax examples — is in [proposed-shape.md](proposed-shape.md) (non-normative; finalised by spikes
S6/S7).

## Why

- **The quadrant is empty.** Every surveyed ecosystem (unified/remark, Markdoc, markdownlint,
  Vale/textlint, Astro/Contentlayer/Velite content collections, ADR/changelog tooling, Obsidian
  tooling) validates frontmatter shape and then transforms the body; declarative body-structure
  contracts exist only as flat-list hacks (markdownlint MD043) or vendor-key one-offs
  (structured-madr). Adoption was never available; the choice was which assembly to own.
- **The paradigm split is formally grounded.** A schema language — JSON Schema or Zod alike —
  cannot express "required sub-schemas in order with optional gaps" over a flat sibling sequence,
  and its issue paths cannot satisfy `<path>:<line>` reporting without a position-carrying
  projection; regular tree-grammar content models can, but are datatype-poor. The XML
  structured-authoring lineage (DocBook/DITA = grammar + Schematron; RELAX NG = pattern + datatype
  library) shipped this exact hybrid for decades. The codebase already *is* the hybrid —
  `validateBody` + the `claims/*` registry — built on duplicated parsers; this decision unifies the
  parse and names the lineage. **D-MDSV (PR #450)**, an independently drafted ADR for the same
  decision, reached the same "extend our own engine over the body, don't adopt a binary" conclusion
  via a Zod-only framing — convergent evidence, folded in here (its mdschema evaluation becomes the
  fourth rejected option below; its body→object projection becomes component 3's substrate).
- **Narrowest owned-risk surface of the four options.** Pure-ESM, no native binaries, no
  low-bus-factor COTS in the critical path; the one owned component (the Obsidian extension) is
  also required by the runner-up options, so it is the price of the niche, not a differentiating
  liability. The substrate is the parser the round-trip gate already depends on, deliberately
  seeded by `markdown_extract.ts`.
- **It survived adversarial review.** Twelve skeptic reviews attacked all four options against the
  live corpus and registries. The chosen option's refuted claims were accounting errors
  (LoC totals, a parity-retirement plan aimed at a suite that turned out to be frontmatter-only);
  the alternatives' refuted claims were structural (see Options considered).

## Options considered

Weighted scoring (MUST-coverage 30%, architecture fit 20%, maintenance 15%, migration 15%, DX 10%,
future reach 10%) after adversarial deductions — full matrix in
[research/decision-package.md](research/decision-package.md):

| Option | Weighted | Verdict |
|---|---|---|
| Bespoke assembly on in-repo substrate | 4.05 | **chosen** |
| Template-as-contract zipper | 3.50 | rejected as primary; one idea grafted (amended) |
| Structure-native second parser (tree-sitter) | 2.95 | rejected; mental model held in reserve |
| COTS engine adoption (markdownlint) | 2.70 | rejected; finding-shape pieces grafted |
| mdschema (Go declarative validator) | — | rejected (empirical, folded from D-MDSV/PR #450): 0/4 frontmatter, 2774 false section violations |

### JSON Schema / Zod over the whole AST (B-8FL9 as filed)

The seed idea: serialize the mdast tree and validate it with a schema language. Rejected *as the
body-sequence mechanism* on spec grounds — neither JSON Schema's nor Zod's array vocabulary has an
operator for ordered sub-schemas with optional gaps over mdast's flat heterogeneous sibling
sequence, and schema-engine issue paths report `/children/14/...`, not `<path>:<line>`, without a
position-carrying projection. Retained *exactly where it is strong*, now on Zod rather than ajv
(the corpus retired ajv in T-DHUF/T-JO4I): frontmatter objects, single-node shapes, and per-section
*content* over the body projection — where B-8FL9's structural-schema idea genuinely lands.

### mdschema (Go declarative markdown validator) — rejected (folded from D-MDSV / PR #450)

A parallel investigation (D-MDSV) evaluated `mdschema` v0.13.1 empirically against this corpus as
the off-the-shelf declarative body validator. Two findings disqualify it, both demonstrated rather
than argued: its `FrontmatterField` carries only `{name, optional, type, format}` — no enum,
pattern, conditional-required, strict/unknown-key rejection, or array-item constraint — so a probe
with four planted frontmatter violations caught **zero** (it covers ~3 of the ~14 frontmatter
features the Zod schemas rely on); and it is strict-on-structure with no `allow_unknown`, producing
**2774 "unexpected section" violations across 309 task files** against the corpus's deliberate
`allow_unknown: true`. Adopting it would add a second engine, a second config dialect, and a
pre-1.0 single-maintainer Go binary to a Bun/TS stack, for the body alone. Rejected on the same
axis as markdownlint-obsidian (an external binary fighting the corpus); its rule catalog
(`word_count`, `code_blocks`, `tables`, `lists`, `heading_rules`, `links`) is retained as the
**design checklist** for component 3's finite leaf-assertion vocabulary. D-MDSV's *positive*
recommendation — project the body to an object and validate it with Zod — is folded into the chosen
option (the projection + Zod leaves), with this decision's content-model grammar retained for the
section *sequence and nesting* that Zod cannot express.

### Bespoke assembly on the in-repo substrate — chosen

One remark/mdast parse projects each body into a position-carrying section tree, which feeds a
TypeScript contract per type: Zod (frontmatter + per-section content leaves), the content-model
grammar (section sequence + nesting), and the named-rule registry (cross-node/cross-file) — the
Murata-justified split, with Zod the engine the corpus already adopted for frontmatter. The
Obsidian dialect is parsed by an in-house micromark extension, the only path since nothing on npm
covers it. Dependency surface is the narrowest of the four — pure-ESM, no native binary, no young
single-maintainer COTS in the critical path — on the parser the round-trip gate already uses. Owned
cost: ~900-1200 LoC extension on a bus-factor-1 upstream substrate, plus the grammar/leaf engine
(~400-500 LoC, recursion + leaf dispatch); round-trip is read-only-safe, proven by spike, not free.
Chosen: the only option whose load-bearing architecture survived adversarial review with its
dependency surface intact.

### COTS engine adoption (markdownlint + markdownlint-obsidian + ajv) — rejected

markdownlint itself is healthy (MIT, decade-stable, pure-JS, in-process) and survives attack. But
the *differentiating* capability rides markdownlint-obsidian: 2★, eight weeks old, one maintainer,
transitively dragging markdown-it + a second YAML reader + an XML parser into a repo whose premise
is retiring duplicate parsers; its integration API is undocumented and resolves links against an
`.obsidian` vault this repo lacks. Strip that dependency and the option collapses into the chosen
one with a heavier three-parser harness. Its "zero day-1 failures" claim was refuted by corpus
sweep (28 task findings at parity). Grafted: the `fixInfo` channel shape, OFM-style rule-id
namespacing, SARIF emission for CI, and its target-resolution algorithm as the *reference
implementation* (ported, not depended on) for deferred wikilink resolution.

### Structure-native second parser (tree-sitter-markdown / ast-grep) — rejected

tree-sitter-markdown is the only parser with a real nesting `section` node — a genuine advantage
that survived attack. But the npm-installable grammar is frozen at 0.3.2 (Sep 2024); the claimed
v0.5.2 exists only as a source tag whose WASM "does not work out of the box"; no release in ~16
months; open correctness bugs in precisely the two node types the option sells (`section` in
blockquotes, `pipe_table`); `web-tree-sitter` under Bun is undocumented; the ast-grep YAML rule
dialect cannot ship in-process; and `^block-id` would still need a hand-rolled scanner. A strictly
worse ownership position than six walkers we can patch in an afternoon. Retained: the
section-as-first-class-node mental model — the grammar synthesizes a section projection from flat
mdast siblings, and tree-sitter remains the fallback parse behind the same grammar interface if
that projection ever proves too lossy.

### Template-as-contract zipper — rejected as primary; graft amended

One annotated `body-contract.md` per type that both scaffolds and validates, walked in lockstep
with the instance tree — template-vs-manifest drift dissolved by construction, a property no other
option has. Refuted in its load-bearing specifics: "round-trips by construction" fails against
four open serializer bugs and, decisively, against this corpus's mixed `_`/`*` emphasis (no single
renderer config can round-trip it — the first render rewrites every decision); the extension was
under-priced ~4×; the day-1 claim ignored folder-ADRs and 24 checkbox failures; and authoring
markdown-with-directives reviewed worse than a YAML manifest. The graft, **amended during review
of this decision**: the surviving idea is *mechanical agreement between contract and template* —
implemented as the contract **validating** the rendered template (self-application, component 8),
not as the contract **generating** the template. Generation was refused because its end state is a
template engine embedded in the manifest dialect (interpolation, conditionals, iteration encoded
in YAML — the config-grows-a-language failure mode), owned forever including for consuming
projects.

## Consequences

- **Collapse surface** ([[D-0007-deterministic-op-substrate]] head/tail boundary made explicit).
  Becomes contract-over-library, in migration order: `validateBody` (→ grammar);
  `scan-placeholders`, `parse-touchpoints`, `claims/*`, the `depends_on` graph check (→ named
  rules under the task contract); `gate skill-prose` + per-skill `invariants.yaml` (→ a SKILL.md
  doc-type contract); the deterministic halves of `entities-audit`, `task-ensure-ready`, and
  `project-check`. Stays skill-side (irreducibly LLM-judged): `dev-update-docs` semantic
  verification, `principle-review`, subjective-AC and corpus-assumption *adjudication* (the
  deterministic candidate-emitters move into the library).
- **`entities validate` grows body validation**, closing the today's asymmetry where a dropped
  required H2 passes `validate` and surfaces only as non-gating audit drift. Severity follows the
  day-1 policy (component 10), so this closure does not hard-fail the grandfathered corpus.
- **The model (`doc`) is a navigable typed view** ("object-oriented markdown") — sections become
  typed properties (exact-string *and* camelCase keys), tables become iterable typed-row collections
  inferred from their column/cell declaration. Consumers and the deterministic skills read
  `doc.body.filesToTouch` instead of hand-walking mdast (shape in
  [proposed-shape.md](proposed-shape.md) §6). It is **additive**: the validator never depends on the
  model (findings come from the projection + Zod + grammar), so it can ship after the validator.
- **The three alias tables die**; what was per-section `description:` prose becomes a doc comment on
  the contract node (documentation, not load-bearing).
- **D-0008 partition, drawn precisely**: this library asserts *presence and shape* (a `^summary`
  block-id exists within the Summary section; a table has these columns) — never *placement and
  whitespace* (line-terminality of `^anchor`, table padding, wrapping), which remain
  [[D-0008-markdown-standard]] / [[S-0007-markdown-formatting]] axes enforced by the formatter
  track ([[D-0011-markdown-formatting-tool]]).
- **Parity**: the golden parity suite is frontmatter-only (verified — all 367 fixtures), so the
  body-side consolidation does not touch it; frontmatter-path consolidation runs as a shadow no-op
  against the golden outputs before any swap, coordinated with T-YBKU.
- **Owned code, honestly stated**: ~900-1200 LoC extension + ~400-500 LoC
  grammar/leaf-dispatch/registry core owned forever; ~1,100 LoC of scanners deleted across migration
  phases 2-4 (not the larger figure claimed pre-review — ~40% of the headline duplication is
  parity-pinned helpers that retire with T-YBKU, not with this library).
- **The corpus gains a remediation backlog**: 24 tasks with non-checkbox ACs, 4 missing
  `Out of scope`, folder-ADR sub-documents without frontmatter — surfaced at `report` tier until
  remediated.

## Migration

Sequenced; each phase lands independently. Spike outcomes gate acceptance of this decision.

| Phase | Work | Gate |
|---|---|---|
| 0 | Spikes S1/S2/S4/S5/S6/S7 (Open questions) | All resolve → this decision moves `open/proposed` → `open/accepted` |
| 1 | Obsidian extension + parse consolidation: one frontmatter slicer (collapse the ~18 `FRONTMATTER_RE` copies onto `util/frontmatter.ts`, already begun in T-MBOK), `markdown_extract.ts` as the only parse path, body→section-tree projection. The frontmatter *engine* is already consolidated — T-DHUF/T-JO4I retired ajv for one Zod `.safeParse` + shared renderer — so this phase inherits a single engine, not three | Extension round-trips corpus byte-clean; projection nests the corpus correctly; frontmatter shadow run is a no-op against golden outputs |
| 2 | Grammar replaces `validateBody`; TypeScript contracts authored for all 11 types (`body-schema.yaml` ported to TS; decision contract ordered to corpus reality); `entities validate` gains body validation; template self-validation gate wired | Grandfathered severity live: existing corpus `report`, new/edited docs `error` |
| 3 | Named-rule registry absorbs the task scanners; task readiness contract (`implementation-ready.md` Location grammar, placeholder, checkbox, quantifier, path-moved rules) becomes declared rules on the task contract | `task-ensure-ready` deterministic verify = library call; scanner files deleted |
| 4 | SKILL.md becomes a contracted doc type; `invariants.yaml` folds into its contract; `gate skill-prose` = library call | Skill-prose gate parity on the 14 opted-in skills |
| 5 | Deferred reach: wikilink/transclusion *resolution* (porting the markdownlint-obsidian resolver as reference), SARIF emission, CI wiring, LSP adapter over the pure `(tree, contract) → findings` core | Each lands as its own task |

[[B-8FL9-validate-markdown-structure-by-applying-json-schema-to-its-ast|B-8FL9]] is promoted to the
phase-1 implementation task when it is created (the backlog schema deliberately has no
`promoted/decision` status — backlog items resolve to work, and this decision's work is that
task).

## Out of scope

- **Formatting** — line length, wrapping, list markers, table padding, fence form, whitespace:
  [[D-0008-markdown-standard]] / [[S-0007-markdown-formatting]], enforced by the formatter track
  ([[D-0011-markdown-formatting-tool]] — selected rumdl).
- **Repair and normalization** — the validator is read-only; confidence-gated mutation stays with
  [[D-0005-repair-on-prepare-and-aggressive-entity-upgrade]]. The `fix?` channel only *describes*
  machine-applicable fixes.
- **Template generation, permanently**: the body contract never grows interpolation, conditionals,
  or iteration; content lives in templates; Eta remains the template engine. A future proposal to
  add a scaffold/content emitter to the contract re-litigates this decision, not just a field.
- **A YAML schema dialect, permanently**: the body contract is TypeScript + Zod, not a config DSL
  that reinvents a schema language. Inline leaf assertions are a finite, closed vocabulary
  (`table` columns, `list` item shape, `code` lang, `maxWords`); any leaf needing a condition,
  cell grammar, or cross-cell constraint is a named Zod schema in code, not a new config keyword.
  This is the same config-grows-a-language guard as template generation above.
- **LLM-judged rules** — semantic quality, subjective ACs, contradiction review stay skill-side;
  the library's seam is deterministic candidate emission only.
- **ontogen plane changes** — whether rust-ontogen ever reads the body contract is D-DX1Q/D-WAKO
  follow-up territory; this library is the document-side superset validator either way.

## Open questions

| # | Spike (≤1 day each) | Settles |
|---|---|---|
| S1 | Author the micromark extension pair for `^block-id` + pipe-alias wikilinks + `![[#^anchor]]`, binding a trailing `^block-id` to the preceding block (so tables/lists are addressable by anchor, not only sections); prove parse → render → `git diff --exit-code` over `docs/planning` | The critical-path unknown; the extension's real LoC; whether the mixed `_`/`*` emphasis problem forces a renderer config or a one-time corpus normalization |
| S2 | Resolve the `mdast-util-to-markdown` import failure under Bun (transitive `unist-util-visit-parents` resolution break) with direct deps; run one round-trip | Whether the round-trip gate is even runnable on this substrate |
| S4 | Define ordering semantics across the three knobs — `order`, `allowUnknown`, and positional `gap()` windows (the "strict prefix, then extras" shape) — when unknown sections interleave anchored ones (e.g. D-0001's 8 unknown sections); confirm the decision-contract re-order | The grammar's central construct, currently undefined for the heterogeneous types |
| S5 | Re-derive day-1 blast radius over `find docs/planning -name '*.md'` including folder-ADR sub-documents; produce the remediation list | The grandfathering scope and the remediation backlog item's contents |
| S6 | Build the mdast→section-tree projection (heading-depth nesting; content before the first sub-heading; tables/lists inside blockquotes and list items); confirm `remark-gfm` as the dep that yields `table`/`list` nodes (today's parser is `remark-parse` + `remark-frontmatter` only, so tables are paragraphs); pin the inline leaf vocabulary (which assertions are v1 vs deferred to named Zod) | The recursive grammar's substrate and the closed leaf-assertion set |
| S7 | Prototype the grammar combinator API: whether sequence nodes are literal `ZodType`s (one Zod schema end-to-end, `z.infer` body types) or a companion type embedding Zod at the leaves; how Zod issue paths remap to `<file>:<line>` | The contract's public API surface and the engine↔Zod integration seam |

Beyond the spikes: whether the per-type frontmatter `schema.ts` and body grammar merge into one
`contract.ts` or stay sibling modules; how the capability type's two-flavour body (mutual-exclusion
groups — `anyOf` over alternative sequences) is expressed and scaffolds a default; whether the LSP
adapter (phase 5) wants recognized-relative ordering relaxed at edit-time.

## Notes

- Research provenance: two background workflow runs over this repository (six subsystem mappers,
  seven prior-art researchers, four independent option designers, twelve adversarial reviewers,
  one judge; ~3.4M agent tokens). The committed appendices are the synthesis layer; raw option
  specs and reviews remain in session scratch (`.sdlc/reports/markdown-validation-adr/options/`).
  Where [research/decision-package.md](research/decision-package.md) and this document disagree —
  specifically the template graft (validate, not generate) — this document is authoritative.
- Inventory currency: the current-state map's file:line citations were a 2026-06-06 snapshot; the
  duplication table above was **re-pinned to current lines on 2026-06-18** (the original numbers had
  drifted across all four rows). The one premise that *did* move in the interim: ajv was retired for
  Zod as the frontmatter engine (T-DHUF/T-JO4I, PR #444, merged after research) — reconciled
  throughout this revision (Context, the duplication table, components 3-4, Options). The three
  former ajv setups have already consolidated onto one Zod engine, which strengthens rather than
  undercuts the consolidation thesis. Still confirmed absent at this revision: no
  structure-validation library, no body grammar, no section-contract op; and `body-schema.yaml`'s
  `order:` remains declared but unenforced.
- This decision **consolidates D-MDSV** (PR #450, "markdown body validation architecture — extend
  Zod over the body, not mdschema"), an independently drafted ADR for the same decision. Its
  empirical mdschema evaluation is folded in as a rejected option, its body→object projection and
  Zod-over-the-body recommendation are folded into component 3, and its frontmatter-is-Zod grounding
  corrected this document's stale ajv premise. The body contract is authored in TypeScript (not a
  `body-schema.yaml` v2 manifest) as the synthesis of the two — combinator grammar for the section
  sequence Zod cannot express, Zod at every leaf. PR #450 is closed as consolidated here; D-MDSV's
  id is retired unmerged, leaving no dangling entity.
- The amended template graft emerged in human review of the decision package: generation's
  trajectory (template-engine semantics accreting into YAML) was judged a worse end state than a
  self-application check, accepting "born-valid by gate" over "drift-impossible by construction".
- 404wolf/mdvalidate (the zipper's prior art) is tracked as
  [[B-RX2K-track-404wolf-mdvalidate-rust-template-as-schema-markdown|B-RX2K]] (in flight on the
  rolling backlog PR #329) for periodic re-evaluation.
- The in-flight ontological decisions D-DX1Q / D-WAKO (PR #323) are referenced here ahead of their
  merge; this decision is the "full validation stays with the document" arm of that split.
- Filename grammar per [[D-0002-entity-identifier-shape]]: folder-shaped decision
  `D-0014-markdown-structure-validation/README.md`; id minted incrementing per the
  `identifier.ts` pin (the base-36 decision ids predate it).
