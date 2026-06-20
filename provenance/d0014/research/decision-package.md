> Research appendix for [[D-0014-markdown-structure-validation|D-0014]] — the judge's scored decision package (four option designs × three adversarial reviews, 2026-06-06). Superseded in one respect: the template graft was amended in human review (contract validates the rendered template; generation refused) — see D-0014, Options considered and Notes.

# Decision package — markdown structure validation library

## Scoring matrix

Weights: MUST-REQ coverage **30%** · architecture fit (round-trip + op-substrate + two-plane)
**20%** · maintenance burden & dependency risk **15%** · migration cost & day-1 blast radius **15%**
· authoring DX & error quality **10%** · future reach (LSP/CI/ontogen) **10%**. Cells score 1–5
after adversarial deductions (a refuted claim scores as false).

| Option | MUST-REQ (30%) | Arch fit (20%) | Maint/dep risk (15%) | Migration/blast (15%) | Authoring DX (10%) | Future reach (10%) | **Weighted** |
|---|---|---|---|---|---|---|---|
| **assemble-unified** | **4** — REQ-01/07/14 real on one mdast; REQ-20 only "read-only safe", not by-construction | **5** — one parser the round-trip gate uses; clean two-plane; op-conformant | **4** — narrowest dep surface (pure-ESM, no native binary); risk = ~900-1200 LoC in-house extension on bus-factor-1 substrate | **3** — blast data verifies exactly, but `recognized-relative` fails 7/15 decisions; placeholder mechanism needs redesign | **3** — config sprawl + redundant dialect; error msgs good | **4** — pure `(mdast,contract)→Finding[]` → LSP-ready; ontogen-clean | **4.05** |
| **adopt-engine** | **3** — engine half real (REQ-04/05/06/07/14); REQ-01 is a net parser *increase* (micromark+markdown-it+mdast+2 YAML) | **3** — `text`-mode loses resolution; vault-root unbudgeted; op-conformant | **2** — markdownlint healthy but the *differentiating* tier rides a 2★/8-week/1-maintainer pkg dragging markdown-it+js-yaml+fast-xml-parser | **2** — "0 day-1" refuted (24 AC + 4 OoS fail); whole-corpus re-glob per check | **3** — config-over-rule legible; 3 finding vocabularies to reconcile | **4** — SARIF + markdownlint-obsidian resolution + CI native | **2.70** |
| **tree-sitter-native** | **3** — `section` node verified real; REQ-01 partial (2-3 parsers); `^block-id` bespoke 7th scanner | **3** — read-only safe; but `placement:` leaks D-0008 seam; ast-grep YAML dialect can't ship in-process | **2** — npm grammar frozen at 0.3.2; WASM "doesn't work OOB"; Bun support undocumented; open bugs in `section`+`pipe_table` | **3** — strict-equivalence port = ~0 new failures; but Bun-WASM is a go/no-go gate | **3** — `.scm` illegible → needs a compiler (the durable cost) | **5** — editor-native; LSP is the thinnest of any option | **2.95** |
| **template-zipper** | **4** — REQ-25 *dissolved* by construction (unique); rest tracks assemble-unified | **4** — one artifact, read-only; but `@block-id` "terminate" leaks D-0008; render libs not on branch | **3** — same narrow surface as assemble-unified; extension re-priced to ~900-1200 LoC | **2** — "0 day-1" refuted harder (folder-ADRs, 24 AC, 102 prose Files-to-touch, mixed `_`/`*` breaks round-trip) | **4** — one readable scaffolding-contract; best authoring story IF round-trip holds | **3** — LSP-able; CI via SARIF graft | **3.50** |

## Per-option verdict

**assemble-unified — viable-with-conditions (the winner).** Survived attack on its load-bearing
axes: the dependency surface is genuinely the narrowest of the four (pure-ESM, no native binary, no
young single-maintainer COTS in the critical path — verified), "nothing on npm parses the
`^block-id`/`![[#^anchor]]` dialect" held against a *fresh* 2026 check (the ownership reviewer
probed `remark-obsidian@1.12.1`, GPL+render-only+no block-id), and every blast-radius number
re-measured **to the exact count** (4/277 tasks, 0/15 decisions missing required, 1 standard missing
`^summary`). The paradigm split (ajv frontmatter / content-model matcher / named-rule registry) is
the landscape's Murata-justified answer and the codebase already *is* this hybrid. **Refuted:** (a)
REQ-20 "round-trips by construction" — `mdast-util-to-markdown`'s own caveat is "complete
roundtripping is impossible," and no serializer exists on this branch (architecture F1/F2, adoption
F6); the honest status is "read-only safe, non-distinctive." (b) the headline `recognized-relative`
ordering as a "near-zero-fix win" — all three reviewers independently reproduced
**7/15 decisions fail** it (Context-before-Decision), and the decision *template itself* makes every
future decision born-invalid (architecture F1, adoption F2); the fix is a one-line
**manifest re-order** the spec never lists. (c) the placeholder `<…>`-vs-HTML mechanism — mdast
parses `<placeholder>` as the *same* `html` node as `<br>`, so the node-kind defense is backwards;
the incumbent works only because it's text-regex + required-section-scoped (adoption F1, refuted
with run output). (d) "~1,900 LoC deleted" — ~40% is parity helpers woven into 11 files incl.
migrations the option can't touch (ownership F3). (e) the G.5 "retire body-half of parity" plan
targets a suite that **does not exist** — I confirmed all 367 fixtures are frontmatter (architecture
F4, refuted). **Conditions:** re-order the decision manifest+template to agree and ship
`order: none` as the real default; revert placeholder to text-regex + document `<…>` as a heuristic;
re-stamp REQ-20 conditional; budget the extension at 7-10pd/~900-1200 LoC; correct net-LoC and the
parity narrative.

**adopt-engine — viable-with-conditions, but the differentiator collapses.** The markdownlint half
is real and well-evidenced — MIT, decade-stable (6107★, pushed today), pure-JS, Bun-clean, correct
`onError`/`params.config` plumbing, ships at parity as a day-1 no-op for required sections. There is
no kill shot against markdownlint. **But every survivor lives on markdownlint, not on the package
that distinguishes this option from a plain in-house build.** Refuted: (a) the "0 day-1 failures"
claim — full-corpus sweep shows **24 tasks** fail the AC-checkbox rule + **4** miss required Out of
scope (~28 day-1 errors; I re-verified the 24); (b) markdownlint-obsidian's "7★" →
**2★, 0 watchers, 1 issue, 2 releases, 8 weeks old, already 1 month stale** (ownership F1,
GitHub-API-quoted), and it transitively drags
**markdown-it 14 + js-yaml + gray-matter + fast-xml-parser** into a repo whose entire premise is
*retiring* duplicate YAML slicers (ownership F2); (c) the "settled definitively" `lint({globs,cwd})`
integration rests on an **undocumented API page** (adoption F3, unverifiable) and resolves links
relative to a `.obsidian` **vault that does not exist** in this repo (architecture F2); (d) the
"preferred" single-file glob mode is *incorrect* for resolution — correct resolution re-globs all
~367 files per edit-time check (ownership F3, architecture). Take the obsidian dependency away and
this option *is* "build the in-house extension" — i.e. it collapses into assemble-unified with a
heavier, three-parser harness. Conditions to survive: demote markdownlint-obsidian to
optional/vendored/default-off, re-spec resolution as corpus-glob-and-benchmark, pre-scope the
assemble-unified extension as the named escape hatch, withdraw "0 day-1," reframe REQ-01 as a
deliberate parser-count *increase*.

**tree-sitter-native — not-viable as specified; recoverable only as a spike.** The one verified
structural advantage no other option has: tree-sitter-markdown's nesting `section` node is real
(grammar source confirms `_section1..6` nesting; architecture and adoption reviewers both *failed*
to kill it). Op-conformance and two-plane coherence survive.
**But the off-the-shelf parser is fatally mis-grounded:** the npm-installable grammar is
**frozen at 0.3.2 (Sep 2024)** — the "v0.5.2" exists only as a GitHub tag/Rust crate (ownership F1);
its WASM **"does not work out of the box"** per the grammar's own README (C external scanner needs
emscripten static-link, ownership F4); **no release in ~16 months** to land fixes (F2); and there
are **open correctness bugs in the exact two node types the option sells** — `section` nesting in
blockquotes (#248) and `pipe_table` (#242/#230) — against constructs this corpus uses (F5).
`web-tree-sitter` under **Bun is undocumented by primary sources** (Node/Deno/Electron/Browser only
— both architecture F2 and adoption F2 flag this as a go/no-go). The ast-grep YAML dialect — half
the config section — **cannot ship in-process** (custom-lang loader is native-`.so`-only, no WASM,
CLI-only → violates REQ-13). And `^block-id` reintroduces a **7th line-scanner** the option claims
to retire. You would trade 6 walkers you own and can fix in an afternoon for an upstream C-scanner
grammar you must build yourself, can't get fixed upstream, and would ultimately fork — a strictly
worse ownership position than the status quo for the headline benefit. Recoverable *only* if a
corpus spike proves `section`+`pipe_table` correct despite the open bugs AND the team accepts owning
the WASM build + a grammar fork as permanent infrastructure.

**template-zipper — viable-with-conditions; strongest authoring story, weakest migration.** Its
distinguishing property is real and valuable: **one artifact = template + contract ⇒ REQ-25
(template-vs-manifest drift) dissolved by construction** — no other option matches this, and the
architecture (mdast parse, fence-awareness intrinsic, op-conformant) is sound. Edit-time latency is
*measured* (2.25 ms/file). **But the migration narrative is false in its load-bearing specifics, and
three claims are refuted:** (a) "round-trips by construction" — contradicted by
*four open upstream bugs* in `mdast-util-to-markdown` (#12/#68/#73/#75), and worse, the corpus
**mixes `_` and `*` emphasis** so *no single renderer config can round-trip it* — render #1 rewrites
all 15 decisions (architecture F1, the kill-shot-to-watch); the HTML-comment directive mechanism
sits *on* bug #75's class. (b) "~250 LoC extension" — measured against the org's own GFM extensions,
the wikilink/transclusion pair is autolink-class (~966 LoC tokenizer alone); realistic is
**800-1200 LoC** (ownership F2). (c) "bus-factor Low — org" — the entire micromark/mdast substrate
is **one human (Titus Wormer, 98-99% of commits)** against an explicitly-unstable `dev/` API
(ownership F3/F4). (d) "0 day-1 failures" — refuted hardest of all four: REQ-23 puts
**folder-ADRs (7 docs, 6 frontmatter-less) in scope**, plus 24 AC failures, 102 prose
Files-to-touch, P-0001's unknown section under `allow_unknown:false` (adoption F1, kill shot). (e)
`@block-id … terminate the section` crosses D-0008's block-id-placement axis (architecture F2,
adoption F5). **If the round-trip spike fails on the mixed-marker corpus, this option's
distinguishing claim evaporates and it should not be selected over a plain manifest option.**

## Recommendation

**Adopt assemble-unified. Graft from template-zipper and adopt-engine; hold tree-sitter in
reserve.**

assemble-unified wins because it is the only option whose *load-bearing architecture* survived every
attack with its dependency surface intact: one mdast parse on the substrate the round-trip gate
already depends on, the narrowest dependency risk (no native binary, no 2★ COTS in the critical
path), the Murata-correct contract split, and blast-radius homework that re-verifies to the exact
count. Its refuted claims are all
**correctable accounting/over-claims, not structural impossibilities** — unlike adopt-engine
(differentiator collapses to a 2★ package), tree-sitter (parser is mis-published, buggy,
Bun-undocumented), or template-zipper (round-trip is impossible on the mixed-marker corpus). The
owned cost — ~900-1200 LoC in-house Obsidian micromark extension — is real, concentrated, and
*shared by template-zipper anyway*, so it is not a differentiating liability; it is the price of the
niche this whole ADR fills.

**COMPOSITION GRAFTS — concretely what to steal:**

- **From template-zipper (the highest-value graft): the template-IS-contract zipper for the
  *authoring/born-valid* path, and REQ-25 by construction.** Let the v2 manifest *generate* the
  `body-template.eta` skeleton (derive template from contract, not check one against the other) —
  this dissolves the §C.3 template/manifest drift that otherwise needs a separate `check-template`
  helper, and it fixes the decision-manifest-vs-template inversion *structurally* rather than by CI.
  Keep the content-model matcher for *edit-time and CI* validation of hand-edited bodies — the two
  are not exclusive.
  **Do NOT graft template-zipper's round-trip-by-construction claim or HTML-comment directives** —
  both are refuted on the mixed-`_`/`*` corpus.

- **From adopt-engine: three config/finding-shape pieces.** (1) markdownlint's
  `onError{lineNumber, fixInfo}` as the exact shape of the Finding's optional `fix?` channel (REQ-15
  / D-0005 seam). (2) markdownlint-obsidian's **OFM namespacing** (OFM00x/02x/10x) as the
  `Finding.id` taxonomy for Obsidian rules. (3) markdownlint-obsidian's
  **target-resolution algorithm** as the *reference implementation* (port, don't depend) for the
  deferred `resolve-wikilink` rule (REQ-32) — and its **SARIF emission** for REQ-36 CI. This is the
  designated escape hatch: if the in-house extension's bus-factor-1 substrate ever proves fatal, the
  resolution tier can fall back to porting markdownlint-obsidian's resolver rather than re-deriving
  it.

- **From tree-sitter-native: the `section`-node *mental model* and `.scm`/ast-grep query *idea* held
  in reserve.** The matcher synthesizes a section projection from flat mdast siblings; if that
  projection proves too lossy for a future deeply-nested check (REQ-34), tree-sitter's native
  `section` is the fallback parse for *that rule only*, behind the same matcher interface so the
  contract dialect is unchanged. Steal the proof that section-as-first-class-node is the right model
  — the zipper gets it from the contract tree, the matcher from the projection — without paying the
  second-parser/WASM/Bun-undocumented tax.

- **Cross-cutting (already convergent in all four specs):** Markdoc's tiered `{id, level, location}`
  as the single finding shape (kills the §C.5 two-vocabularies drift); commitlint severity-as-data
  (kills the §G.4 hard-at-author/soft-at-audit drift); remark-message-control
  `<!-- structure-disable <rule> -->` for grandfathering without `--no-verify`.

## Dissent record

A reasonable engineer could weigh these differently — the human decides:

1. **Ordering policy is genuinely open.** Every spec ships `order: lenient`/`none` because strict
   fails 7/15 decisions, but the *manifest order itself is wrong about the corpus* (declares
   Decision-before-Context; corpus + template do Context-before-Decision). Fix the one-line manifest
   (cheap, what I recommend) vs rewrite 7 hand-authored decisions vs formally delete `order` as dead
   config (REQ-24 → won't-do). The 4 `order: strict` manifests (capability/driver/principle/product)
   are dead config today regardless.

2. **REQ-01 "one AST" is unreachable by every option, but the *direction* differs.**
   assemble-unified/template-zipper keep mdast + add an extension (parser-count roughly flat).
   adopt-engine *increases* parser count (micromark + markdown-it + mdast + two YAML readers) — a
   deliberate "engine maturity over consolidation" bet that cuts against B-8FL9's charter.
   tree-sitter adds a native parser. If single-AST consolidation is a hard goal, only the in-house
   options approach it; if engine maturity matters more, adopt-engine's trade is legitimate but
   different from what its summary claims.

3. **Build-vs-buy on the Obsidian dialect.** assemble-unified and template-zipper own ~900-1200 LoC
   forever on a **bus-factor-1 substrate** (Titus Wormer) against an explicitly-unstable micromark
   `dev/` API. adopt-engine "buys" resolution from a 2★/8-week package. Neither is comfortable. A
   reviewer who weights "never own a parser extension" over "never depend on a solo COTS" could
   prefer adopt-engine's markdownlint-obsidian-as-default-off posture — but then accepts the
   differentiating feature doesn't work against this corpus without vault-root wiring.

4. **Parity break scope is smaller than every spec thought** — there is no body-half parity suite;
   all 367 fixtures are frontmatter (verified), and the ajv frontmatter tier is unchanged in every
   option. So parity is a near-non-issue, but the `pyRepr`/`coerceForSchema` quartet is woven into
   11 files incl. migrations; consolidating those could move *frontmatter* golden output. The
   "shadow no-op" step guards this — but a reviewer may want T-YBKU coordination scoped explicitly
   before any consolidation PR.

5. **D-0008 seam: three of four specs smuggle a placement predicate** (`position: section-terminal`
   / `placement: section-terminal` / `@block-id … terminate`) into the structural contract, which
   D-0008 §78 owns. Trivially fixable (assert presence-within-section, not line-terminality) but a
   reviewer should confirm the partition is *drawn*, not just claimed, in the chosen option.

6. **Severity × day-1 grandfathering is an unresolved internal contradiction in every spec.**
   "required-section = error" (G.4) and "zero new day-1 failures" cannot both hold for
   already-non-conformant docs (M-GJBW, the 4 OoS-missing tasks, the 24 AC tasks). The honest
   resolution — grandfather existing corpus to `report`, gate `error` only for born-valid new docs —
   is exactly the asymmetry §G.4 says it wants to *fix*. The human picks which way the asymmetry
   resolves.

## Spike list

Merging the landscape's 7 unknowns with review-discovered ones. Each ≤1-day.

| Spike | Status | ≤1-day description |
|---|---|---|
| **S1 — `^block-id` + wikilink + transclusion micromark extension round-trip** (landscape #1) | **BLOCKS-DECISION** | Write the `micromark-extension` + `mdast-util` pair; prove parse→render→`git diff --exit-code` over `docs/planning`. **First settle the mixed-`_`/`*` emphasis problem** (architecture-F1): the base renderer rewrites all 15 decisions today, so determine whether a renderer config preserves mixed markers or whether a one-time corpus normalization is a prerequisite. Re-measure extension at ~900-1200 LoC, not 250. Critical-path for assemble-unified AND the template-zipper graft. |
| **S2 — render toolchain imports under Bun** (review-discovered) | **BLOCKS-DECISION** | `mdast-util-to-markdown`/`-from-markdown` are transitively present but **fail to import under Bun** here (`unist-util-visit-parents/do-not-use-color` resolution break, adoption-F6). Add as direct deps, resolve the break, confirm a round-trip call runs. If it can't be fixed, REQ-20's whole gate is blocked. |
| **S3 — mdast section-projection vs tree-sitter `.scm`** (landscape #2) | FOLLOWS-DECISION | Build the flat-sibling→`{section, body}` projection; compare against a tree-sitter query set on the corpus for correctness/LOC/edge-fidelity. Confirms the reserve-graft fallback is viable; not needed to pick assemble-unified. |
| **S4 — order × allow_unknown semantics** (review-discovered) | **BLOCKS-DECISION** | Define what `recognized-relative` ordering does when unknown sections interleave anchored ones (D-0001 has 8 unknowns between anchors; the matcher's central construct has no defined semantics there). Decide the decision-manifest re-order. Until specified, REQ-04/24 claims are unfounded for the heterogeneous types. |
| **S5 — full-corpus blast radius incl. folder-ADRs** (review-discovered) | **BLOCKS-DECISION** | Re-derive against `find docs/planning -name '*.md'` (not the flat glob): folder-ADRs (7 docs, 6 frontmatter-less, REQ-23 scope), 24 AC-non-checkbox tasks, 4 OoS-missing, 102 prose Files-to-touch, P-0001's unknown section. Produce the grandfathering/remediation plan. Every "0 day-1" claim depends on this. |
| **S6 — parity-string clean break** (landscape #5) | FOLLOWS-DECISION | Resolved by inspection: parity is **frontmatter-only** (367 fixtures, all `entities validate`). Confirm the `coerceForSchema` consolidation doesn't move frontmatter golden output via the shadow-no-op; coordinate T-YBKU. Not a research question. |
| **S7 — edit-time perf at corpus scale** (landscape #7) | FOLLOWS-DECISION | Partially answered: mdast parse measured at 2.25 ms/file / 846 ms for 376 files. Benchmark matcher + N rules × M docs at LSP latency before wiring edit-time. Not a go/no-go for the library API. |
| **S8 — markdownlint-obsidian API + Bun-WASM** (landscape #3/#4) | FOLLOWS-DECISION (only if adopt-engine or tree-sitter reconsidered) | For adopt-engine: verify the `lint({globs,cwd})` API against an *installed* copy. For tree-sitter: smoke-test `web-tree-sitter` `Parser.init()` + grammar `.wasm` under Bun 1.2.21. Both are go/no-go *for those options* — moot if assemble-unified is chosen. |
| **S9 — section/table tree-sitter correctness on corpus** (review-discovered) | FOLLOWS-DECISION (tree-sitter only) | Spike #248/#242/#230 (blockquoted headings, pipe-table errors) against the live corpus; only relevant if tree-sitter is reconsidered. |

## Draft "Options considered" section

### Bespoke assembly on the in-repo substrate (assemble-unified)

One remark/mdast parse feeds three cooperating mechanisms: ajv-2020 for frontmatter, a ~200-line
content-model matcher for the canonicalized H2 sequence, and a Schematron-style named-rule registry
for cross-node/graph/claim checks — the Murata-justified split the codebase already approximates.
The Obsidian dialect (`^block-id`, pipe-alias wikilinks, `![[#^anchor]]`) is parsed by an in-house
micromark extension, the only path since nothing on npm covers it (verified against a fresh 2026
sweep). Dependency surface is the narrowest of the four — pure-ESM, no native binary, no young
single-maintainer COTS in the critical path — on the parser the round-trip gate already uses. The
owned cost is ~900-1200 LoC of extension on a bus-factor-1 substrate; the round-trip property is
read-only-safe, not "by construction." **Chosen** — it is the only option whose load-bearing
architecture survives adversarial review with its dependency surface intact, and its refuted claims
are correctable accounting, not structural failure.

### COTS engine adoption (adopt-engine)

markdownlint runs in-process as the body-lint engine under one config-driven `sdlc-section-contract`
rule; ajv keeps frontmatter; markdownlint-obsidian supplies Obsidian *resolution*. markdownlint
itself is healthy, decade-stable, Bun-clean, and ships at parity as a day-1 no-op for required
sections — there is no kill shot against it. But the *differentiating* capability rides
markdownlint-obsidian: 2★, 8 weeks old, one maintainer, transitively dragging markdown-it 14 + two
YAML readers + an XML parser into a repo whose premise is retiring duplicate slicers; its
integration API is undocumented and resolves against a `.obsidian` vault this repo lacks. The "0
day-1 failures" claim is false (28 tasks fail at parity). **Rejected** — strip the obsidian
dependency and the option collapses into assemble-unified with a heavier three-parser harness; its
one distinguishing feature does not work against this corpus without unbudgeted wiring.

### Structure-native second parser (tree-sitter-native)

tree-sitter-markdown is the only off-the-shelf parser with a real nesting `section` node, making
section-body and fence-awareness intrinsic — a genuine, verified advantage no other option has. But
the npm-installable grammar is frozen at 0.3.2 (Sep 2024); the claimed v0.5.2 is a source tag whose
WASM "does not work out of the box" (C external scanner); there has been no release in 16 months to
land fixes; and there are open correctness bugs in the precise two node types the option sells
(`section` in blockquotes, `pipe_table`). `web-tree-sitter` under Bun is undocumented by primary
sources, the ast-grep YAML dialect cannot ship in-process, and `^block-id` reintroduces a
hand-rolled scanner. **Rejected** — it trades six walkers the team owns and can patch for an
upstream C-scanner grammar that must be built in-house, can't be fixed upstream, and would
ultimately be forked; a strictly worse ownership position for the headline benefit.

### Template-IS-contract zipper (template-zipper)

One annotated `body-contract.md` per type both scaffolds new instances and is the validation
contract; parse contract and instance to mdast, walk in lockstep, holes become typed captures —
dissolving template-vs-manifest drift (REQ-25) by construction, a property no other option achieves.
The architecture is sound and edit-time latency is measured. But "round-trips by construction" is
contradicted by four open upstream serializer bugs and, decisively, by the corpus mixing `_` and `*`
emphasis — no single renderer config round-trips it, so the first render rewrites every decision;
the ~250-LoC extension is really ~900-1200; the substrate is bus-factor-1; the "0 day-1" claim
ignores folder-ADRs (REQ-23 scope) and 24+ AC failures. **Rejected as the primary** — its
distinguishing claim evaporates if the round-trip spike fails on the mixed-marker corpus;
**its template-derives-contract idea is grafted** into the winner for the authoring path.

## One-line summaries

- **assemble-unified** — Own a ~1k-LoC Obsidian extension on the in-repo mdast for the narrowest
  dependency surface; round-trip is read-only-safe, not free. *(chosen)*
- **adopt-engine** — Buy a decade-stable engine, but the one feature that justifies it rides a
  2★/8-week solo package dragging three extra parsers. *(rejected)*
- **tree-sitter-native** — Get a real `section` node, but from a grammar frozen on npm, buggy where
  it matters, and undocumented under Bun. *(rejected)*
- **template-zipper** — Dissolve template-drift with one artifact, but round-trip is impossible on
  the corpus's mixed emphasis markers. *(rejected as primary; idea grafted)*
