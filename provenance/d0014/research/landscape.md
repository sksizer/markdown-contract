> Research appendix for [[D-0014-markdown-structure-validation|D-0014]] — prior-art landscape synthesis (research phase: seven researchers, 2026-06-06). Input to the decision; where this and D-0014 differ, D-0014 is authoritative.

# Prior art landscape — markdown structure validation

This document merges six prior-art reports (unified/remark, markdoc/MDX, rule-engine linters,
schema-over-tree theory, content-collections, docs-as-code/Obsidian + creative/emerging) into one
landscape against the REQ-xx contract from the current-state doc. Conflicts are resolved toward the
report carrying the primary-source citation (release date, repo push, spec text, or source line);
URLs are preserved. The corpus under validation is the SDLC planning set: H2-sectioned prose with
YAML frontmatter, ordered-but-optional sections, alias sets, line-terminal `^block-id`s,
wikilinks/transclusions, and hand-formatted typed tables ([[B-8FL9]] verified verbatim:
*"Settle on a particular markdown AST library … apply a JSON Schema directly against it"*;
`markdown_extract.ts:1-15` confirms remark/mdast is already the in-repo substrate and names B-8FL9 +
[[T-0007]]).

**The convergent finding across all six reports:** every ecosystem that touches this problem
validates *frontmatter shape* (commoditized: ajv / zod / Standard Schema) and then *transforms* the
body into a derived artifact (HTML / typed data / MDX) —
**almost nothing validates a contract over body structure.** The two exceptions (markdownlint MD043;
`zircote/structured-madr`) both use a flat or vendor-key section descriptor *outside* JSON Schema
and feed it to hand-rolled scanners — independently re-deriving, and re-making, the exact
duplication the current-state doc catalogs. That empty quadrant — a declarative per-doc-type
contract over
`{frontmatter + H2 grammar with aliases +
`^block-id`/wikilink/transclusion presence-and-shape + typed-table sub-grammar}`, deterministic, on
one AST pass — *is* the niche this ADR fills.

---

## Comparison matrix — shortlisted candidates and assembly stacks

Columns are the REQ groups from the current-state doc. Cell values: **yes** / **partial(note)** /
**no**. "Frontmatter" = REQ-02/03; "Body/H2 contracts" = REQ-04/05/06/09/24 (sections, aliases,
ordering, typed tables); "Obsidian fidelity" = REQ-10/20/32 (`^block-id`/wikilink/transclusion parse

- round-trip + resolution); "Error reporting" = REQ-14 (`<path>:<line>` machine findings); "TS/Bun
embed" = REQ-13 (in-process `defineOp`, no subprocess); "Config-as-data" = REQ-18/22 (declarative,
inspectable, project-agnostic); "Edit-time/LSP" = REQ-29/36 (edit-time + CI); "Maint. health" =
recency/bus-factor.

### Candidate tools/libraries

| Candidate | Frontmatter | Body/H2 contracts | Obsidian fidelity | Error reporting | TS/Bun embed | Config-as-data | Edit-time/LSP | Maint. health |
|---|---|---|---|---|---|---|---|---|
| **unified/remark + mdast** ([repo](https://github.com/unifiedjs/unified)) | partial(via remark-frontmatter node; you add ajv) | partial(visitors; you write rules) | partial(parses base md; no Obsidian dialect) | yes(`position` free) | yes(ESM, Bun-clean) | partial(rules are code) | partial(library; LSP-ready) | yes(MIT, 11.0.5, active) |
| **remark-lint** rule model ([repo](https://github.com/remarkjs/remark-lint)) | no(separate plugin) | partial(heading *hygiene* only; no required-skeleton rule) | no | yes(`file.message(node)`) | yes | partial | partial | yes(MIT, `*@4.x`, 2025) |
| **remark-lint-frontmatter-schema** ([repo](https://github.com/JulianCataldo/remark-lint-frontmatter-schema)) | partial(**draft-2019-09**, not 2020-12) | no(frontmatter only) | no | yes(line/col) | yes(ESM) | yes(glob→schema map) | partial | partial(ISC, v3.15.4 **Oct-2023**, quiet ~2.5y) |
| **@portaljs/remark-wiki-link** ([npm](https://www.npmjs.com/package/@portaljs/remark-wiki-link)) | no | no | partial(`[[a\|b]]`,`[[a#h]]`,`![[embed]]`,`data.exists`; **no `^block-id` / `![[#^anchor]]`**) | yes(node position) | yes(TS, mdast) | n/a(parser) | n/a | partial(MIT, v1.2.0 2024-04) |
| **Markdoc** ([repo](https://github.com/markdoc/markdoc)) | no(**parses YAML, never validates it**) | partial(per-node `validate()` imperative; no declarative sections/aliases/order) | no(tokenizer instantiates markdown-it internally, **no custom-syntax hook** — `^id`/`[[]]` invisible) | yes(`{id,level,location}`, best shape surveyed) | partial(adds a *2nd* parser vs mdast) | no(presets are code) | no | yes(MIT, **0.5.7 26-Mar-2026**) |
| **markdownlint custom-rule (micromark)** ([CustomRules](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md)) | no(strips frontmatter; you keep ajv) | partial(MD043 sequence w/ `*`/`+`/`?` — no aliases/OR; custom rule does rest) | no(passes as text; no construct model) | yes(`onError{lineNumber,fixInfo}`) | yes(pure JS, Bun-runs) | partial(one generic config-driven rule) | partial(CLI/CI) | yes(MIT, **v0.40.0 ~Jan-2026**, decade-stable) |
| **markdownlint-obsidian** ([repo](https://github.com/alisonaquinas/markdownlint-obsidian)) | partial(OFM08x key/type, **not JSON-Schema**) | no(inherits MD043; no section-contract rule) | **yes**(OFM00x links / OFM02x embeds / OFM10x `^block-ref` as first-class + **resolves targets**) | yes(SARIF/JUnit) | yes(**TS, Bun 1.1+ native**) | partial | partial(CI) | partial(MIT, **v1.1.0 5-May-2026**, young/single-maintainer) |
| **textlint** ([npm](https://www.npmjs.com/package/textlint)) | no | partial(custom rule + `DocumentExit`; you write logic) | partial(remark base tolerates; no construct validation) | yes(`RuleError`) | yes(but adds 2nd parser+config) | partial | partial | yes(MIT, v15.6.1, very active) |
| **Vale** ([docs](https://vale.sh/docs)) | partial(per-field scopes, no schema) | partial(**existence-via-`scope:raw`+`occurrence` regex only**; no AST/order/alias) | partial(survives in `raw`) | partial(line) | **no**(Go binary, subprocess only) | partial(YAML, not from body-schema) | no(CI only) | yes(MIT, v3.x, 2026) |
| **tree-sitter-markdown** ([repo](https://github.com/tree-sitter-grammars/tree-sitter-markdown)) | no(YAML node content still needs ajv) | **yes**(real nesting `section` node + ordering via positions) | partial(`EXTENSION_WIKI_LINK`+tags; no `^block-id`) | yes(node start point) | partial(WASM/napi — REQ-31 degrade) | yes(`.scm` queries per type) | yes(designed for editors) | yes(MIT, **v0.5.2 Jan-2026**) |
| **ast-grep + @ast-grep/lang-markdown** ([repo](https://github.com/ast-grep/ast-grep)) | no(pair w/ ajv) | **yes**(`has`/`inside`/`follows` → sections/order/mutual-excl) | partial(inherits tree-sitter; no `^block-id`) | yes(`SgNode.range()`) | partial(napi binary; **custom-lang loader experimental**) | **yes**(declarative YAML rules) | partial | yes(MIT, **v0.43.0 May-2026**, 14.4k★) |
| **ajv / JSON Schema 2020-12** ([json-schema.org/array](https://json-schema.org/understanding-json-schema/reference/array)) | **yes**(already deployed; `$ref`,`if/then`,`useDefaults`) | **no**(spec itself: no "required-in-order-with-optional-gaps" operator; `instancePath ≠ line`) | partial(node *shape* only) | partial(instancePath, not `<path>:<line>`) | yes(in-repo) | yes(schema.json) | partial | yes(MIT, active) |
| **CUE** ([cuelang.org](https://cuelang.org/)) | yes(imports JSON Schema) | no(positional lists — same ordered-optional wall as JSON Schema) | no | partial | **no**(Go binary; forks off ajv/`x-ontology`) | yes | no | yes(Apache-2.0, active) |
| **structured-madr** (`zircote`) ([repo](https://github.com/zircote/structured-madr)) | partial(ajv **draft-07**) | **yes**(required H2/H3 + **ordering implemented** + per-section field checks) | no | yes(`{message,line}` + pass/warn/fail) | no(Node CLI; 4th frontmatter slicer) | **yes**(**`schema.body` vendor key**) | no(CI/Action) | yes(MIT, **push 1-Jun-2026**, v1.2.0; 7★) |
| **jackchuka/mdschema** ([repo](https://github.com/jackchuka/mdschema)) | partial(typed, **not ajv**) | **yes**(headings/order + `required_text`/`forbidden_text` per section + table/code rules) | no(`^summary` only via `required_text`) | yes(line) | no(**Go binary** + npm wrapper) | **yes**(`.mdschema.yml`; also *infers* schema from docs) | no | yes(MIT, **v0.13.1 26-May-2026**, 64★) |
| **mdvalidate** (`404wolf`) ([repo](https://github.com/404wolf/mdvalidate)) | partial(regex-hole, not ajv) | **yes**(parallel-AST zipper → order free, presence, unknown) | partial(tree-sitter base) | partial | no(**Rust, no JS/WASM binding**) | **yes**(**template IS the schema**) | no | partial(MIT, v0.2.5 Jan-2026, **6★ "early WIP"**) |
| **Astro/Starlight `docsSchema()`** ([docs](https://docs.astro.build/en/guides/content-collections/)) | yes(zod; **already in `site/`**) | no(body is `render()`-time, schema never sees it) | no(republishes Obsidian-isms as dead text) | partial(build error, free-form) | no(build step, not op) | partial(zod, not ajv) | partial(build/CI) | yes(MIT, Astro 6, active) |
| **Velite / sdorra content-collections** ([Velite](https://github.com/zce/velite)) | yes(zod / Standard Schema) | no("transform, don't assert"; `s.toc()` extracts, never validates) | no | partial | partial(Node) | partial | no | yes(MIT, active) |
| **marksman / markdown-oxide** (LSP) ([marksman](https://github.com/artempyanykh/marksman)) | no | partial(≤1 H1, dup-heading diagnostics) | partial(broken-wikilink/ambiguous-heading) | yes(LSP diagnostics) | **no**(F#/Rust binary, external server) | no(fixed rule set) | **yes**(the edit-time answer) | yes(MIT/Apache, 2026, 3.2k/2.1k★) |
| **Promptfoo GH Action** ([action](https://www.promptfoo.dev/docs/integrations/github-action/)) | n/a | n/a(semantic rubrics only) | n/a | n/a | n/a(judge harness, library never imports) | yes(rubric YAML + **cache-key reproducibility**) | partial(CI) | yes(MIT, very active) |

### Notable assembly stacks (the real decision options)

| Stack | Frontmatter | Body/H2 contracts | Obsidian fidelity | Error reporting | TS/Bun embed | Config-as-data | Edit-time/LSP | Maint. health |
|---|---|---|---|---|---|---|---|---|
| **A. remark/mdast + ajv-2020 (frontmatter) + generic projection-validator rule + in-house micromark Obsidian extension** *(the "build the Obsidian layer yourself" stack)* | yes(reuse `Ajv2020`) | yes(content-model matcher over canonicalized H2; tables in rule code) | yes(in-house `^block-id`/`[[a\|b]]`/`![[#^anchor]]` nodes — the only way) | yes(node `position`) | yes(one `defineOp`, ESM) | partial→yes(body-schema++ as data; named-rule registry for graph/grammar) | yes(pure `(mdast,contract)→Diagnostic[]` core → LSP adapter later) | yes(all-MIT; you own the ~few-hundred-line extension) |
| **B. markdownlint custom-rule + markdownlint-obsidian + ajv (kept)** *(off-the-shelf engine, Obsidian as a dependency)* | yes(ajv beside) | partial(one generic `section-contract` rule from body-schema; MD043 design vocab) | yes(markdownlint-obsidian validates+resolves Obsidian constructs) | yes(`onError`/SARIF) | yes(both in-process JS/TS, Bun) | yes(rule config = body-schema) | partial(CI; SARIF→PR annotations) | partial(obsidian wrapper young/single-maintainer) |
| **C. tree-sitter-markdown (or ast-grep) parse + declarative `.scm`/YAML queries + ajv (frontmatter)** *(structure-native parser, second parser cost)* | yes(ajv on YAML node) | yes(real `section` node + `has`/`inside`; ordering by offsets) | partial(wikilinks parsed; `^block-id` still bespoke) | yes(node range) | partial(WASM/napi binary; REQ-31; experimental lang loader for ast-grep) | yes(queries/YAML per type) | yes(tree-sitter is editor-native) | yes(both MIT, 2026-active) |
| **D. structured-madr `schema.body` shape + own mdast scanners + ajv** *(adopt the config ergonomics, not the code)* | yes(ajv) | yes(vendor-key sections/order/subsections, fed off real AST) | no(add separately) | yes | yes(`defineOp`) | yes(`schema.body` inside schema.json — answers D-0004 fork) | no(wire yourself) | n/a(pattern, not dependency) |
| **E. template-as-schema zipper (mdvalidate idea, reimplemented in TS) + ajv (frontmatter)** *(eliminate template/manifest drift by construction)* | yes(ajv) | yes(parallel-AST walk → presence+order+unknown in one pass) | partial(reuse in-house extension from A) | partial(build it) | yes(~150-line walk in `defineOp`) | yes(**one artifact = template + schema**; dissolves REQ-25) | partial | n/a(design; don't depend on 6★ crate) |
| **F. Astro/Starlight content pipeline (frontmatter) + SDLC op wired as remark plugin** *(reuse what's in-repo; renders Obsidian-isms)* | yes(zod, site pages only) | no(not the home for 9 entity contracts) | partial(wiring lets corpus *render* instead of dead text — REQ-36) | partial | no(build step) | partial | yes(build/CI) | yes(in `site/` today) |

---

## Paradigm analysis

The schema-over-tree report supplies the intellectual backbone: validating a per-type contract over
a tree is a 25-year-old problem with four formal answers, measured against **Murata/Lee/Mani**,
*Taxonomy of XML Schema Languages Using Formal Language Theory*, ACM TOIT 5(4):660–674, 2005
([ACM](https://dl.acm.org/doi/10.1145/1111627.1111631)).

| Paradigm | Mechanism | Theory anchor | Strengths FOR THIS CORPUS | Weaknesses FOR THIS CORPUS |
|---|---|---|---|---|
| **Grammar / content-model** | Regular-tree-grammar regex over child labels: `(summary, context?, (decision\|recommendation\|conclusion\|resolution), outOfScope?, references?)` — sequence/optional/choice/interleave | DTD/RELAX NG content models; Murata's *regular tree grammar* class (closed under union/intersection/difference, supports interleave) | **The correct expressiveness class for H2 sections.** One line per doc type expresses required+optional+order+alias-as-choice+mutual-exclusion (REQ-04/06/24/34) — exactly what JSON Schema cannot. A ~200-line matcher over **canonicalized** H2 names is the natural `validateBody` successor. | Datatype-poor (defers scalar constraints to a datatype library — i.e. you still need ajv for frontmatter values). Tooling is XML-only (jing/libxml2 don't enter a Bun stack); only the *content-model idea* transfers. |
| **Rule / assertion (Schematron-style)** | `@context` (selects nodes) + `<assert test=…>` with human messages; absence-of-match = violation | Schematron, ISO/IEC 19757-3:**2025** ([schematron.com](https://schematron.com/home/whyisschematrondifferent_.html)); DocBook/DITA ship **grammar + Schematron together** ([xml.com](https://www.xml.com/pub/a/2004/02/11/relaxtron.html)) | The paradigm for **cross-node + status-conditional** rules grammars can't reach: "`^summary` on the paragraph after the Summary heading" (REQ-10), "Summary populated once `status:accepted`" (REQ-33), depends-on cycles (REQ-12). Maps 1:1 onto remark-lint `lintRule`/ast-grep queries and onto the `claims/*` resolver registry (REQ-27/30). | Imperative per rule (weakens the "declared as data" goal — REQ-18) unless wrapped in a config-driven generic rule. Not a closed contract — it's a checklist of assertions, so "what is the full grammar?" is implicit. |
| **Schema-over-serialized-AST (JSON Schema over mdast)** — *the seed framing* | Serialize mdast to JSON, validate with ajv 2020-12 | [[B-8FL9]] literal; mdast ([syntax-tree/mdast](https://github.com/syntax-tree/mdast)); ajv ([ajv.js.org](https://ajv.js.org/)) | **Genuinely right for frontmatter** (a YAML *mapping* → JSON object: `const`/`pattern`/`enum`/`if-then`/`$ref _common.json`/`useDefaults` — REQ-02, already deployed) **and for single-node shape** ("this `table` has N columns"). Preserves the `x-ontology` direction (REQ-21). | **Wrong for the body, demonstrably.** mdast headings are a **flat heterogeneous sibling sequence** (no `section` node). JSON Schema 2020-12 array keywords (`prefixItems`/`items`/`contains`) cannot express "required sub-schemas in order with optional gaps" — the spec says so explicitly ([json-schema.org/array](https://json-schema.org/understanding-json-schema/reference/array)). On the ladder it sits **below DTD** for child sequences yet **above regular-tree-grammars** for leaf values: the two formalisms are *incomparable*. And ajv reports `instancePath /children/14/children/2`, not `<path>:<line>` — a hard **REQ-14** failure. |
| **Query-language (selectors / tree-sitter)** | CSS selectors over mdast (`unist-util-select`) or S-expression/YAML queries over a tree-sitter CST (tree-sitter-markdown, ast-grep) | tree-sitter query lang ([DeepSource](https://deepsource.com/blog/lightweight-linting); [siraben](https://siraben.dev/2022/03/22/tree-sitter-linter.html)) | Same assertion paradigm as Schematron but over a **real `section`-nesting parse tree** (tree-sitter-markdown's `section` node contains heading + body + nested sections — REQ-07 fence-awareness free, kills the 6 hand-rolled walkers). ast-grep exposes it as **declarative YAML** ≈ today's `invariants.yaml`/`body-schema.yaml` (REQ-18/28). `position`/`range` → REQ-14 free. | tree-sitter is a **second parser** alongside the in-repo mdast (which owns round-trip REQ-20), via WASM/napi binary (REQ-31). `unist-util-select` re-walks the tree per call (slow at corpus scale). ast-grep's custom-markdown-lang loader is **flagged experimental**. None model `^block-id`. |
| **Template-derived** | The template *is* the schema; parse both to AST, walk in lockstep ("zipper"), holes = captures | mdvalidate ([404wolf.com](http://404wolf.com/posts/mdvalidate/)); mdat autophagic templates ([repo](https://github.com/kitschpatrol/mdat)); reverse-templating ([Springer](https://link.springer.com/chapter/10.1007/978-3-031-44245-2_18)) | **Dissolves the template-vs-manifest drift fork (§C.3, REQ-25) by construction** — one artifact, ordering free, answers D-0004 in a third direction. Streaming variant suits LLM-generated docs (REQ-26). Pairs with grammar-constrained *authoring* (born-valid bodies). | No production-grade implementation (mdvalidate is 6★ WIP, Rust-only, no JS binding). Its frontmatter matching is regex-holes, **not** ajv (loses `$ref`/`if-then`/`useDefaults`). Must be reimplemented in-house (~150 lines on the existing remark instance). |

**Synthesis (the load-bearing paradigm answer).** No single paradigm fits. JSON Schema and regular
tree grammars are *incomparable* (Murata), optimized for orthogonal axes — value-shape-at-a-node vs
child-sequence-structure — which is the **formal justification for splitting the contract** (the
§G.2/§G.9 fork resolves to **option (c)**): ajv-2020-12 for the
*frontmatter object and individual node shapes*, a small *content-model/query layer* for
*H2 section sequence*, and a *Schematron-style named-rule registry* for
*cross-node/graph/grammar/claim* checks — all on one parse, all emitting one finding shape, all
inside one `defineOp`. The XML lineage already proved this hybrid (DocBook/DITA = grammar +
Schematron); the SDLC codebase already *is* it (section walker + `claims/*` registry) — the
contribution is to name the lineage and unify the parsers.

---

## Shortlist — candidates/stacks that should become decision options

**Stack A — remark/mdast + ajv-2020 (frontmatter) + generic content-model/projection rule + in-house
micromark Obsidian extension.** The convergent recommendation of four of six reports. The unified
ecosystem is the *correct and already-present* substrate (`markdown_extract.ts` is already
remark/mdast; MIT, 11.0.5, Bun-clean since it's pure-ESM with no native addons). `position` on every
node gives REQ-14 for free; `code` nodes make fence-awareness intrinsic (REQ-07). The decisive fact
forcing the in-house piece: **no maintained package parses the SDLC Obsidian dialect** — `^block-id`
(the `![[id#^summary]]` index-transclusion anchor) is **unsupported everywhere** (not @moritzrs OFM
v0.0.1-single-commit, not landakram colon-divider-unmaintained, not the render-only 1★
remark-obsidian-md), and pipe-alias + `#^anchor` transclusion are stale-or-render-only. The
micromark two-layer extension model (tokenizer + `fromMarkdown` + matching `toMarkdown`) is the
documented, GFM-grade path, and an in-house extension can emit dedicated
`{wikiLink, blockId, transclusion}` nodes carrying the data validators assert on — and round-trips
by construction (REQ-20). Load-bearing cost: you own ~a few hundred lines; load-bearing benefit:
REQ-01/03/07/10/14/16/20 satisfied with one parser the round-trip gate already depends on.

**Stack B — markdownlint custom-rule (micromark) + markdownlint-obsidian + ajv (kept).** The
strongest off-the-shelf-engine option. markdownlint is MIT, pure-JS, Bun-embeddable
(`import { lint } from "markdownlint/sync"`), micromark = same family as the repo's mdast,
decade-stable (v0.40.0, ~Jan-2026), with a custom-rule API (`function(params,onError)`,
`params.config` injected) that lets ONE generic `sdlc-section-contract` rule be fed each type's
`body-schema.yaml` — collapsing the §D duplication and covering REQ-04/05/06/07/10/14/24.
**markdownlint-obsidian** (MIT, **TS/Bun-native, v1.1.0 5-May-2026**) is the only surveyed tool that
validates `[[wikilinks]]`/`^block-ids`/`![[transclusions]]` as first-class constructs
*and resolves their targets* (the deferred D-0008 broken-link concern, REQ-10/32), emitting SARIF
for CI (REQ-36). ajv stays for REQ-02 (markdownlint never does schema-frontmatter). The bet:
markdownlint-obsidian is young/single-maintainer (vet bus-factor); and the section-contract logic is
still yours to author — these give the parser, rule harness, finding shape, and MD043 design
vocabulary, not the rules.

**Stack C — tree-sitter-markdown (or ast-grep) + declarative queries + ajv (frontmatter).** The
structure-native option, justified by the single highest-leverage fact in the research:
tree-sitter-markdown (MIT, **v0.5.2 Jan-2026**) is the only off-the-shelf parser with a real nesting
`section` node (heading + following blocks + nested sub-sections), making "section body" first-class
and fence-aware for free — eliminating the 6 duplicated walkers at the parser level (REQ-01/07) —
plus toggleable wikilink/tag extensions (REQ-10 partial). **ast-grep + @ast-grep/lang-markdown**
(MIT, **v0.43.0 May-2026**, Bun via napi) wraps the same grammar as *declarative YAML rules*
(`has`/`inside`/`follows`) that could supersede `body-schema.yaml` (REQ-18/28) and answer §G.6
(table/section rules generalize into rules; LLM-judged disqualifiers stay skill-side). The fork it
forces: tree-sitter gives the better *parse tree* for structure, but mdast gives
*round-trip fidelity* (REQ-20, the in-flight ontological renderer) — running two parsers is the
cost, plus a WASM/napi binary that must degrade explicitly (REQ-31), plus ast-grep's experimental
custom-lang loader.

**Stack D — structured-madr's `schema.body` config shape + own mdast scanners + ajv.** Not a
dependency — the *config ergonomics* are the option. `zircote/structured-madr` (MIT,
**push 1-Jun-2026, v1.2.0**) is the direct structural twin: it validates ADR frontmatter with ajv
and carries the body-section contract as a
**non-standard `body` vendor key inside the same schema.json**
(`{sections, optional_sections, subsections, title_pattern, require_option_headings}`), and
**it actually implements section ordering** — the one thing SDLC declared (`order: strict`) but
never built (REQ-24). This is working, shipped proof that
**folding the body manifest into `schema.json` as a vendor key is viable** — directly resolving
D-0004's open "body-manifest consolidation" (§G.1) — and pointed evidence for option (c): it uses
JSON Schema for frontmatter and a *plain config object* for sections, *not* JSON-Schema-over-AST.
Its cautionary value is equal: its source independently re-derives the prefix-collision hazard
(`if (sectionName==='Decision') return headingLower==='decision'` — the same REQ-05/§C.6
case-matching bug) and ships a no-op `if`-without-`then` schema restriction (the P-0005
mis-authoring risk, live). Adopt the shape, feed it off real mdast, do not vendor the scanners.

**Stack E — template-as-schema zipper (mdvalidate idea, reimplemented in TS) + ajv (frontmatter).**
The creative option worth a decision slot because it *dissolves* a problem the others only mitigate.
`404wolf/mdvalidate` (MIT, v0.2.5 Jan-2026) makes the schema file *visually resemble the markdown*,
parses both to AST, and walks them in lockstep — giving presence + ordering + unknown-section in one
traversal, with the same file doubling as the scaffolding template (collapses §C.3 template/manifest
drift by construction; answers D-0004 in a third direction). The disqualifier for *adoption* is
unambiguous (6★, self-described "early stage WIP", table-repetition/XML-blocks "planned but not
implemented", Rust-only, no JS/WASM binding) — so this is "steal the design, reimplement ~150 lines
on the existing remark instance," not a dependency.

---

## Ruled out — single disqualifying fact each

| Candidate | Disqualifying fact (primary source) |
|---|---|
| **Markdoc** | Tokenizer instantiates markdown-it internally with **no hook to register custom rules** → `^block-id`/`[[wikilink]]`/`![[transclusion]]` are **invisible to the parser** (`src/tokenizer/index.ts`); also adds a 2nd AST and **does not validate frontmatter at all** ([faq](https://markdoc.dev/docs/faq)). |
| **@astrojs/markdoc** | Same parser limits as Markdoc, and it doesn't even surface `validate()` — Zod-frontmatter only ([docs](https://docs.astro.build/en/guides/integrations-guide/markdoc/)). |
| **JSON Schema as the *body* mechanism** | The spec itself: no operator for "required sub-schemas in order with optional gaps," and `instancePath /children/N` violates REQ-14 ([json-schema.org/array](https://json-schema.org/understanding-json-schema/reference/array)). *(Retained for frontmatter + node shape only.)* |
| **CUE** | For the body, identical positional-list wall as JSON Schema (no ordered-optional/interleave) **and** a Go binary on a TS/Bun substrate, forking off the ajv/`x-ontology` toolchain ([cuelang.org/docs](https://cuelang.org/docs/concept/how-cue-enables-data-validation/)). |
| **remark-lint-frontmatter-schema** (as a dependency) | Pinned to **JSON-Schema draft-2019-09** while SDLC standardized on **2020-12** (`$ref`-with-siblings differs), frontmatter-only, and **no release since Oct-2023** — adopting it adds a *second, older* ajv path (anti-REQ-03). Borrow the pattern. |
| **remark-lint (alone)** | Ships heading *hygiene* rules only (increment/first-level/dup); **no required-named-section rule** exists — a custom rule would just re-create the §D duplication ([repo](https://github.com/remarkjs/remark-lint)). |
| **Vale** | **Cannot be embedded** (Go binary, subprocess only — the `mmdc`-style dependency REQ-31 fights) and structurally does **existence-via-`scope:raw`-regex only** (its own docs: markup-aware scopes can't assert a heading exists) — no AST/order/alias (REQ-01/05/06/24). Ideas only. |
| **mdformat** | A **formatter, not a validator** (asserts nothing; lives on D-0008's side, REQ-17) and a Python dependency ([docs](https://mdformat.readthedocs.io/)). |
| **mdast-util-wiki-link (landakram)** | Unmaintained (repo 2024-04), defaults to **colon `:` divider not Obsidian's pipe `|`**, no `#`/`^`/embed support. |
| **@moritzrs OFM family** | **v0.0.1, single commit 2024-11-02**; block-references/embeds/aliases explicitly "planned, not implemented." Pre-release. |
| **remark-obsidian-md** | **Render-only** (Obsidian→HTML), destroys round-trip, exposes no targets to validate, 1★ — fails REQ-20 and the "expose data to assert on" need ([repo](https://github.com/adrianoaraujods/remark-obsidian-md)). |
| **comby** | Abandonware (no releases since ~2021–22) and text/template matching isn't markdown-block-aware. |
| **semgrep generic mode** | Structure-blind by design (line/token, no markdown AST) ([issue #2985](https://github.com/returntocorp/semgrep/issues/2985)). |
| **ast-grep w/ markdown** *(as primary)* | No native markdown — requires compiling/loading a custom tree-sitter-markdown grammar via an **experimental** loader for *less* fidelity than remark gives natively. *(Retained in Stack C as a structure-native alternative, with that caveat.)* |
| **Contentlayer (original)** | Effectively abandonware — maintainer ~1 day/month, financial-backing-gated since Apr-2023; community migrated to Contentlayer2 ([#429](https://github.com/contentlayerdev/contentlayer/issues/429)). |
| **Contentlayer2 / Nuxt Content / zod-matter / Velite / sdorra** | Frontmatter-only by construction — body is *transformed, never structurally validated* ("transform, don't assert" is the universal failure mode); zod-not-ajv; not a `defineOp`. *(Velite's `s.*` registry + sdorra's Standard Schema retained as ideas.)* |
| **Front Matter CMS** | Field-level only, **no body-structure rule, runs only in VS Code (no CI)** ([fields](https://frontmatter.codes/docs/content-creation/fields)). |
| **Dendron schemas** | **Non-enforcing by design** — schemas scaffold/autocomplete only; "you can create notes that don't match any schema." Declaration-shape reference, not a validator ([wiki](https://wiki.dendron.so/notes/c5e5adde-5459-409b-b34d-a0d75cbb1052/)). |
| **obsidian-linter** | A **formatter** (YAML normalization), no per-note-type required-section/field enforcement — D-0008's side (REQ-17) ([rules](https://github.com/platers/obsidian-linter/blob/master/docs/rules.md)). |
| **adr-tools / MADR / log4brains / adr-viewer** | None validate structure (scaffolder / bare template / publisher / renderer); MADR's headings are **enforced by nothing** in-repo; log4brains stale (2024-12). |
| **@lordcraymen/adr-toolkit** | Frontmatter-presence-grade only (title/status/summary), gray-matter+regex not AST — below REQ-04. |
| **@thumbtack/changelog-lint** | Abandonware (v0.1.4, 2019-01-30). |
| **markdownlint MD043 (native rule, alone)** | Flat literal-heading array with anonymous `*`/`+`/`?` wildcards: **cannot express the alias set** `{Decision\|Recommendation\|…}`, no OR/optional-naming, no `^anchor` ([md043.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md)). *(Custom-rule API retained in Stack B.)* |
| **MS Learn/OPS + DocFX `md.style`** | Closed-source (OPS) and tag/character-class (DocFX = D-0008's side); architectural precedent only, nothing adoptable. |
| **IETF xml2rfc / idnits** | Validates **XML against an RNG schema**, not markdown; the canonical form is XML so the lineage doesn't transfer to a markdown-native corpus. |
| **marksman / markdown-oxide** *(as a library)* | F#/Rust LSP *servers* with fixed rule sets — not config-driven, not Bun-embeddable. *(Retained as the edit-time/REQ-36 companion and the LSP-readiness reference.)* |
| **mdvalidate / jackchuka-mdschema** *(as dependencies)* | mdvalidate: 6★ WIP, Rust-only, no JS binding. mdschema: Go binary (violates D-0006/07 as the engine), no ajv composition. *(Both retained as design references — Stacks D/E.)* |
| **guidance / llguidance** | Generation-time CFG constraint, not a document validator — transferable concept (born-valid authoring) only. |
| **Gherkin/Pickles/Gauge living-docs** | Make *prose drive tests*; this need is the inverse (contracts validate prose) — solving a different problem. |

---

## Transferable ideas — to fold into whichever option wins

## Error-message models

- **Markdoc's tiered `ValidateError {id, level ∈ {debug,info,warning,error,critical}, message,
  location:{start,end}}`** — adopt as the *single* finding shape, resolving the §C.5 "two message
  vocabularies" drift and encoding REQ-15's hard/warn/report tiers in one `level` field; the stable
  `id` makes findings filterable and golden-test-pinnable (REQ-16)
  ([validation](https://markdoc.dev/docs/validation)).
- **`file.message(reason, node)` → `position` for free** (remark-lint / textlint `RuleError` /
  markdownlint `onError{lineNumber}`) — the entire `<path>:<line>` apparatus (REQ-14) is a property
  of using real nodes; stop counting `\n`.
- **markdownlint's `fixInfo` channel** — a rule returns a finding *plus* an optional
  machine-applicable fix, the right shape for the REQ-15 "warn-then-autofix" tier and D-0005
  repair-on-prepare
  ([CustomRules](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md)).

## Config formats

- **`schema.body` vendor key inside `schema.json`** (structured-madr) — working proof for the D-0004
  body-manifest consolidation (§G.1); adopt the shape, not the scanners.
- **MD043's `*`/`+`/`?` wildcard sequence + `match_case`** — a proven, human-writable ordering
  notation; adopt as the surface syntax for `body-schema.yaml` v2, **extended** with a named
  alias-set token `{A|B|C}` (REQ-06) and a `^anchor` terminator assertion (REQ-10) — the two things
  MD043 provably lacks
  ([md043.md](https://github.com/DavidAnson/markdownlint/blob/main/doc/md043.md)).
- **GitHub Issue-Forms grammar** (`body[]` of typed elements with `id`/`required`/`validations`) —
  the most legible config format for a body-section descriptor: model each H2 as
  `{id, heading|one_of, required, kind: prose|table|checkbox, block_id, table:{columns}}`, rolling
  REQ-06/09/10 into one inspectable artifact
  ([form schema](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema)).
- **`forbidden_text`/`required_text` per section** (jackchuka/mdschema) — generalizes the task-only
  `<…>`/`TBD`/`(pick one)` scan to all 9 types as declared config (REQ-08, the worst coverage gap)
  ([repo](https://github.com/jackchuka/mdschema)).
- **commitlint's severity-as-tuple `[level, applicability, value]` + shareable presets** — make
  severity a *property of the rule* (fixes §G.4: same check can't be hard-at-author and
  soft-at-audit by accident — REQ-15) and compose contracts by extension (REQ-22)
  ([config](https://commitlint.js.org/reference/configuration.html)).
- **One JSON Schema, multiple association modes, `$ref` resolved natively**
  (remark-lint-frontmatter-schema via `@apidevtools/json-schema-ref-parser`) — retires the
  hand-rolled `_common.json` inline-merge (REQ-02) and the glob→schema doc-type selection (REQ-22)
  in one move.
- **Metadata layering: project-global defaults overridden per-file** (MS Learn `docfx.json` ⟶
  frontmatter) — the model for REQ-22's "works for any consuming project": ship type-schemas as
  defaults a consumer can override.

## Rule taxonomies

- **`require-sections` / `no-unknown-sections` / `section-order` as three orthogonal rules**
  (standard-readme-preset,
  [index.js](https://github.com/RichardLitt/standard-readme-preset/blob/main/index.js)) and
  **awesome-lint** (776★,
  [config.js](https://github.com/sindresorhus/awesome-lint/blob/main/config.js)) — the existence
  proof that "markdown-as-code doc-type validation" is a shipped pattern; their shape maps 1:1 onto
  `required`/`allow_unknown`/the dead `order` key and shows ordering is cheaply implementable
  (retires §G.7 toward *enforce*).
- **markdownlint-obsidian's OFM namespacing** (OFM00x links / OFM02x embeds / OFM08x frontmatter /
  OFM10x block-refs) — a good taxonomy for organizing finding codes and proof the Obsidian dialect
  validates as first-class constructs
  ([rules/index.md](https://github.com/alisonaquinas/markdownlint-obsidian/blob/main/docs/rules/index.md)).
- **Markdoc's `children: [...]` declarative child-constraint + `matches` enum** — a compact
  micro-grammar; `body-schema.yaml` could grow per-section `allowed_blocks: [table|list|checkbox]`
  (REQ-09/35) and source the alias vocabulary *once* as a declared enum (REQ-06).
- **Velite's `s.*` helper registry** — the ergonomic model for making structural assertions
  *first-class and declarable* (`requiredSection`, `aliasOneOf`, `blockIdTerminator`, `typedTable`,
  `noPlaceholders`) rather than hardcoded per scanner (REQ-08/09/30).
- **Canonicalize-then-match** (Murata's local-grammar insight) — resolve alias→canonical *first*
  from one contract-sourced map, then the grammar speaks only canonical names; the three drifting
  alias tables (§D) collapse to one declaration + one resolution step (REQ-06).
- **The grammar-plus-assertion hybrid** (DocBook/DITA architecture) — name the lineage to justify
  keeping the content-model checker and the `claims/*` registry as *two cooperating mechanisms*
  (REQ-27/30/33), not one over-stretched schema.

## Edit-time integration

- **Pure `(mdast, contract) → Diagnostic[]` core with `position` on every finding** (marksman's
  design) — the single cheapest insurance for REQ-29: keep all I/O out of the core so a thin LSP
  adapter is a later wrapper, not a rewrite.
- **yaml-language-server schema association** — `schema.json` is already Draft-2020-12-consumable;
  ship `.vscode/settings.json yaml.schemas` (or a modeline) pointing entity files at their per-type
  schema for in-editor frontmatter completion *today* (REQ-36), watching
  [vscode-yaml#207](https://github.com/redhat-developer/vscode-yaml/issues/207) for native
  md-frontmatter association.
- **remark-message-control inline comments** (`<!-- lint disable require-sections -->`) — per-doc,
  in-corpus rule suppression with an audit trail, for deliberate-WIP cases without a global
  `--no-verify` bypass (§G.10).
- **markdownlint-obsidian / lychee SARIF output** — the CI currency for REQ-36; emit SARIF from the
  op so server-side CI annotates PRs.
- **Cache-keyed LLM-rubric tier** (Promptfoo: `PROMPTFOO_CACHE_PATH` + `actions/cache`, key =
  section-hash) — the reproducible semantic-judge seam respecting the D-0007 head/tail split: the
  deterministic op owns *which bytes* feed the judge (extracts + hashes `## Summary`), the skill
  owns the *grade*; the LLM tier becomes replayable without being deterministic (REQ-19/26, keeps
  the library LLM-free) ([action](https://www.promptfoo.dev/docs/integrations/github-action/)).
- **mdat `check` exit-code drift detection** for *generated* surfaces (index.md, regen'd site pages)
  — replaces the bespoke "is index.md stale" logic (REQ-25/36)
  ([repo](https://github.com/kitschpatrol/mdat)).
- **Astro's clean parse→validate→render boundary** (validation strictly precedes, never mutates the
  body) — the architectural precedent for §G.8: keep the validator
  **read-only and fidelity-preserving** (REQ-20), make any normalize/repair (D-0005) a distinct
  downstream pass.
- **Treat round-trip as a *tested gate*, never an assumption** (`mdast-util-to-markdown`'s own
  "complete roundtripping is impossible" caveat) — validates the in-flight parse→render→`git diff`
  gate (REQ-20) as the only safe fidelity claim; a normalizing validator silently breaks it.

---

## Unknowns needing a spike — things research could not settle from sources alone

1. **`^block-id` micromark extension cost & round-trip.** Every report agrees `^summary`
   (line-terminal, the `![[id#^summary]]` anchor) is unsupported across the *entire* ecosystem and
   must be authored in-house. Reports assert the tokenizer is "genuinely simple" (line-terminal
   `^[\w-]+$` at end of flow content) and that a matching `toMarkdown` extension round-trips by
   construction — **but no one built it.** Spike: write the `micromark-extension` + `mdast-util`
   pair for `^block-id` + pipe-alias `[[a|b]]` + `![[#^anchor]]` transclusion, and prove
   parse→render→`git diff --exit-code` clean over `docs/planning` (REQ-10/20). This is the
   critical-path unknown for Stacks A/B/E.

2. **One-parser vs two-parser decision (mdast vs tree-sitter).** tree-sitter-markdown's nesting
   `section` node is objectively the better structure tree (REQ-01/07), but mdast owns the
   round-trip renderer (REQ-20, in-flight ontological work) and the existing `markdown_extract.ts`.
   Sources can't say whether an mdast *post-projection* (group flat siblings into synthetic
   `{section, body}` objects) is "good enough" to avoid a second parser + WASM/napi binary, or
   whether tree-sitter's native sections justify the dual-parser cost. Spike: build the mdast
   section-projection and compare against a tree-sitter `.scm` query set on the real corpus for
   correctness + LOC + edge-case fidelity.

3. **Does markdownlint-obsidian forward markdownlint's `customRules`?** Stack B's elegance (one
   `lint()` call carrying both the OFM rules and the generic section-contract rule) depends on this;
   the README didn't show it. If not, it's two in-process calls (acceptable, but changes the
   integration shape). Spike: confirm against the package API.

4. **ast-grep's experimental custom-markdown-lang loader stability.** `@ast-grep/lang-markdown` +
   `registerDynamicLanguage` is documented but the custom-language path is flagged "experimental /
   doc not ready." Spike: load it under Bun, run the Decision-doc rules against the corpus, and
   assess whether it's production-viable or a moving target (REQ-31 degradation matters here).

5. **Parity-string lock-in vs clean break (§G.5).** ~400 lines of `pyRepr`/`translateAjvError` are
   byte-pinned by `tests/parity/`. Every consolidation either preserves these exact strings or
   coordinates retiring the parity suite (T-YBKU). Adopting *any* new engine (remark-lint messages,
   markdownlint `onError`, tree-sitter) breaks byte-parity. Sources can't decide whether byte-parity
   is still a goal — this is a project-policy call, not a research question, but it gates how much
   of Stacks A–E is reachable incrementally.

6. **Whether the section/table/block-id contract should cross the ontogen plane (§G.9, REQ-21).**
   The two-plane split says rust-ontogen consumes "only the JSON-Schema subset it understands." If
   the body contract is a content-model grammar (not JSON Schema), the planes validate
   *different things* (ontogen sees frontmatter only). Sources confirm JSON Schema can't express the
   body, but can't settle whether ontogen should grow a section-grammar reader or whether the
   SDLC-side contract is intentionally a strict superset. Requires a decision coordinated with the
   in-flight D-DX1Q/D-WAKO work, not on this branch.

7. **Performance at edit-time scale.** `unist-util-select` maintainers warn it re-walks per call;
   markdownlint/tree-sitter parse-once-reuse is asserted "well under a second for a few hundred
   docs" but unmeasured on *this* corpus with *N rules × M docs at edit-time latency* (REQ-29).
   Spike: benchmark the chosen rule mechanism on the full `docs/planning` set at the latency budget
   an LSP/edit-time gate implies.

Relevant files (absolute): seed item
`docs/planning/backlog/B-8FL9-validate-markdown-structure-by-applying-json-schema-to-its-ast.md`;
AST substrate precedent `plugin/lib/util/markdown_extract.ts`.
