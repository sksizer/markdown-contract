---
type: milestone
schema_version: '1'
id: M-0007
title: Example use-case catalog — the categorized basis for the docs and marketing site
status: closed/done
created: '2026-06-28'
tasks:
  - '[[T-CTLG-example-catalog-finalize]]'
  - '[[T-CCLI-catalog-cli]]'
  - '[[T-CINF-catalog-inference-init]]'
  - '[[T-CDYL-catalog-declarative-yaml]]'
  - '[[T-CVPL-catalog-validation-planes]]'
  - '[[T-CCON-catalog-consume-as-data]]'
  - '[[T-CDIA-catalog-dialect]]'
  - '[[T-CEMB-catalog-embed-and-ci]]'
  - '[[T-CRWS-catalog-real-world-schemas]]'
  - '[[T-ROUT-runcorpus-first-match-routing]]'
  - '[[T-DRAG-docrule-runcorpus-aggregation]]'
  - '[[T-DREF-dialect-referential-integrity]]'
  - '[[T-DANF-dialect-anchor-fragment-edges]]'
  - '[[T-IOUT-init-out-placement]]'
tags:
  - docs
  - examples
  - website
  - dx
  - marketing
related:
  - '[[M-0006-documentation-site]]'
  - '[[T-SITE-bootstrap-docs-website]]'
  - '[[T-7UTE-astro-docs-site]]'
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[T-9XB3-test-harness-and-fixtures]]'
  - '[[C-0009-declarative-text-constraints]]'
  - '[[D-0011-declarative-text-constraints]]'
need_human_review: false
---

# Example use-case catalog — the categorized basis for the docs and marketing site

## Goal

Produce a single, categorized, **additive, test-cross-referenced catalog of example use
cases** for markdown-contract — the content basis for the project's public documentation
and marketing website. The catalog *is* the deliverable here; turning it into a site is a
downstream build aspect — a new project in the [moon](https://moonrepo.dev) monorepo
alongside `packages/core` (library + CLI) and `apps/web` (daemon + UI), per
[[D-0010-monorepo-tooling]] and [[T-MOON-adopt-moon-monorepo]].

Every example is a small, self-contained demonstration that **builds additively** on the
one before it, so the catalog doubles as a learning path: a reader can climb a category
top-to-bottom, each step adding exactly one idea.

The catalog itself lives in [`docs/example-catalog.md`](../../example-catalog.md); this
milestone is its manifest and tracks the work to finalize it into verified, site-ready
data (`docs/catalog/<category>.yaml`) and to publish it ([[M-0006-documentation-site]]).

## Summary

- **Closed 2026-07-03.** All 14 member tasks shipped: the catalog umbrella
  ([[T-CTLG-example-catalog-finalize]]) with its eight per-category children —
  all eight `docs/catalog/<key>.yaml` files exist, corrections applied, and every
  shipped artifact is regression-checked against the real CLI/library by the
  site's `check-artifacts` gate — plus the five follow-up test tasks from the
  coverage review. The site (M-0006) publishes the catalog at
  <https://markdown-contract-docs.pages.dev/>.
- **How it was built.** A multi-agent workflow generated the catalog: four creative lenses
  (library-surface / user-journey / teaching-curriculum / novel-applications) proposed
  competing category schemes **in parallel**; a synthesis step chose the organizing axis
  and reported it; one agent per category drafted the additive example sketches; a
  **separate reviewer** cross-referenced every example against the real fixture corpus; a
  final pass consolidated the coverage gaps into follow-up entities.
- **Chosen axis** — *a progressive curriculum spine, sub-keyed by tool surface.* One
  additive path from a CLI-first, zero-TypeScript entry point up to whole-corpus
  governance, where each of the eight rungs is exactly **one adoptable surface**, so every
  example has a single home. (The four proposals and the rationale are in
  *How the axis was chosen* below.)
- **99 shipped examples across 8 categories**, CLI first, additive within
  each — plus **9 planned** examples previewing upcoming declarative text
  constraints (below).
- **Coverage against the existing tests:** 85 covered, 9 partial,
  5 uncovered; 8 are genuinely novel scenarios; 10 examples
  recommend a new test.
- **Each example states a fixed schema** (id, name, demonstrates, rank, builds_on,
  artifact, surfaces) plus a coverage verdict (needs_test, coverage_status,
  existing_coverage, recommend_test) — see *Example entry schema* in
  [`docs/example-catalog.md`](../../example-catalog.md).
- **The catalog is extracted to [`docs/example-catalog.md`](../../example-catalog.md)**
  so this milestone stays a manifest; the *Deliverables* table is the roll-up.
- **Finalizing it is decomposed into a parent + 8 per-category tasks**
  ([[T-CTLG-example-catalog-finalize]]) that turn each category into verified
  `docs/catalog/<key>.yaml` data.
- **The review's 10 test-worthy gaps are five follow-up tasks**
  ([[T-ROUT-runcorpus-first-match-routing]] and four siblings); building the site
  is [[T-SITE-bootstrap-docs-website]], now in [[M-0006-documentation-site]].
- **Upcoming features previewed (PR #50).** 9 examples preview **declarative text
  constraints** — the `requires:` / `forbids:` phrase vocabulary of
  [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]] — marked
  &#128679; *planned*, extending the Declarative-YAML, in-code, and real-world-schema
  categories. They compile to the engine's existing rule / docRule machinery (fixture
  `17-node-level-custom-rule.ts` is the hand-written seed) and stay out of the shipped
  coverage counts.

^summary

## Scope

**In**

- The categorized catalog: eight broad categories, ~tens of examples, each with a concrete,
  copy-pasteable sketch grounded in the real CLI / API.
- The **example-entry data structure** (the schema each example states).
- The **test-coverage review**: for every example, whether it needs a test and whether an
  existing fixture/test already covers it (with a link), plus an add-a-test recommendation
  for the genuine gaps.
- The **follow-up entities** for the real test gaps and the site build.
- **Upcoming features**, where they extend a category, included as &#128679; *planned*
  examples — the [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]]
  text-constraint vocabulary (PR #50) — kept separate from the shipped coverage counts.

**Out**

- Building / publishing the website — scoped to [[T-SITE-bootstrap-docs-website]]
  and the docs-site shell [[T-7UTE-astro-docs-site]], both in [[M-0006-documentation-site]].
- Writing the recommended missing tests — scoped to
  [[T-ROUT-runcorpus-first-match-routing]] and its four sibling follow-up tasks.
- Examples for the not-yet-built `daemon` / local web-UI surface
  ([[D-0012-distribution-single-exec-and-web-ui]], proposed) — a future catalog addition
  once that surface ships.

Note: turning the illustrative sketches into *runnable, regression-checked* data
**is in scope** here — it is the work of the per-category finalize tasks
([[T-CTLG-example-catalog-finalize]]), which apply the flagged corrections and
verify each sketch against real CLI/library output.

## Workstreams

1. **Explore & propose** — four parallel lenses each propose a category scheme.
2. **Synthesize** — pick/blend the strongest axis and report it.
3. **Fill** — one agent per category drafts the additive example sketches, grounded in the
   real source.
4. **Review** — a separate reviewer cross-references each example against the fixture
   corpus (covered / partial / uncovered + link).
5. **Consolidate gaps** — group the novel, uncovered, test-worthy behaviors into follow-up
   entities.
6. **(Downstream) Build the site** — stand the catalog up as a moon project
   ([[T-SITE-bootstrap-docs-website]]); the catalog's structure (categories → sections,
   examples → documented units, `builds_on` → ordered ladder) maps directly onto the site.

## Success criteria

- [x] Catalog spans broad categories with tens of examples — CLI first, additive within
  each. (99 shipped + 9 planned examples across 8 categories; CLI is rung 1.)
- [x] Every example states the example-entry schema fields.
- [x] Every example carries a coverage verdict: *needs a test* and *matches an existing
  fixture/test* (with a link where one exists).
- [x] Novel, uncovered behaviors are identified, with an add-a-test recommendation for each.
- [x] Follow-up entities exist for the genuine test gaps and the site build, linked from
  the catalog.
- [x] This milestone validates against `contracts/milestones.contract.yaml`.
- [x] Human review of the chosen axis, the category boundaries, and the follow-up split (done 2026-06-28).

## Deliverables

The full catalog — the example-entry schema, the eight per-category index tables,
the additive sketches, and the coverage review — lives in
[`docs/example-catalog.md`](../../example-catalog.md), extracted from this
milestone so the milestone stays a manifest. This section is the at-a-glance
roll-up plus the work that finalizes the catalog into verified, site-ready data.

### Catalog at a glance

Counts are over **shipped** examples; **Planned** is the upcoming declarative text
constraints ([[C-0009-declarative-text-constraints]] /
[[D-0011-declarative-text-constraints]]), tracked separately.

| # | Category | Examples | Covered | Partial | Uncovered | Add tests | Planned |
|---|----------|:--------:|:-------:|:-------:|:---------:|:---------:|:-------:|
| 1 | **CLI Quickstart: Validate from the Terminal** `cli` | 12 | 12 | 0 | 0 | 0 | — |
| 2 | **Scaffold and Guard: init, Inference, and Drift Checks** `inference-init` | 10 | 8 | 1 | 1 | 1 | — |
| 3 | **Declarative YAML: Contracts and Corpus Config, No Code** `declarative-yaml` | 13 | 12 | 1 | 0 | 1 | 7 |
| 4 | **Authoring Contracts in Code: Structure, Content, and Custom Rules** `validation-planes` | 16 | 16 | 0 | 0 | 0 | 1 |
| 5 | **Consume as Typed Data: Reading the Document as a Model** `consume-as-data` | 11 | 11 | 0 | 0 | 0 | — |
| 6 | **Dialect: Anchors, Wikilinks, and Vault References** `dialect` | 11 | 6 | 2 | 3 | 4 | — |
| 7 | **Embed and Automate: the Runner Library and CI Gates** `embed-and-ci` | 11 | 8 | 3 | 0 | 1 | — |
| 8 | **Real-World Schemas: Document Templates and Cross-Document Governance** `real-world-schemas` | 15 | 12 | 2 | 1 | 3 | 1 |
| | **Total** | **99** | 85 | 9 | 5 | 10 | **9** |

### Finalize the catalog as structured, verified data

[[T-CTLG-example-catalog-finalize]] (parent) coordinates one child per category.
Each child extracts its category from `docs/example-catalog.md` into
`docs/catalog/<key>.yaml`, applies the flagged corrections, and verifies every
sketch against real CLI/library output:

- [x] `cli` — [[T-CCLI-catalog-cli]]
- [x] `inference-init` — [[T-CINF-catalog-inference-init]]
- [x] `declarative-yaml` — [[T-CDYL-catalog-declarative-yaml]]
- [x] `validation-planes` — [[T-CVPL-catalog-validation-planes]]
- [x] `consume-as-data` — [[T-CCON-catalog-consume-as-data]]
- [x] `dialect` — [[T-CDIA-catalog-dialect]]
- [x] `embed-and-ci` — [[T-CEMB-catalog-embed-and-ci]]
- [x] `real-world-schemas` — [[T-CRWS-catalog-real-world-schemas]]

### Recommended new tests (the coverage gaps)

The review flagged 10 test-worthy gaps, grouped into five follow-up tasks:

- [x] [[T-ROUT-runcorpus-first-match-routing]] — first-match precedence + per-rule exclude in `runCorpus`
- [x] [[T-DRAG-docrule-runcorpus-aggregation]] — docRule findings aggregate through `runCorpus` into `exitCode`
- [x] [[T-DREF-dialect-referential-integrity]] — dead in-doc anchors + dangling vault wikilinks
- [x] [[T-DANF-dialect-anchor-fragment-edges]] — section-id `byAnchor` negative + `#^anchor` fragment value
- [x] [[T-IOUT-init-out-placement]] — `init --out` scaffold placement

### Build & publish the site (M-0006)

- [x] Generating and publishing the catalog pages into the docs-site shell is
  [[T-SITE-bootstrap-docs-website]], now a member of [[M-0006-documentation-site]]
  — it depends on the Astro shell [[T-7UTE-astro-docs-site]] and consumes the
  `docs/catalog/*.yaml` produced above. (Shipped via #196; M-0006 closed 2026-07-03.)

## Out of scope

- **The site shell / infrastructure.** Standing up the Astro docs-site shell and
  its deploy pipeline is [[T-7UTE-astro-docs-site]] / [[M-0006-documentation-site]];
  this milestone only produces the catalog content that shell consumes.
- **Publishing the catalog pages.** Generating the catalog pages into that shell is
  [[T-SITE-bootstrap-docs-website]], now an [[M-0006-documentation-site]] member.
- **Writing the recommended tests.** Tracked by the five follow-up tasks
  ([[T-ROUT-runcorpus-first-match-routing]], [[T-DRAG-docrule-runcorpus-aggregation]],
  [[T-DREF-dialect-referential-integrity]], [[T-DANF-dialect-anchor-fragment-edges]],
  [[T-IOUT-init-out-placement]]).
- **The `daemon` / local web-UI surface** ([[D-0012-distribution-single-exec-and-web-ui]]) —
  proposed, not shipped; it earns its own examples once built.
- **The moon adoption / workspace split itself** — [[T-MOON-adopt-moon-monorepo]] and
  [[D-0010-monorepo-tooling]] own that; this catalog only *targets* the monorepo as
  where the site lands.

## Risks / open questions

- **Sketches are illustrative, not yet regression-checked.** They use real flags/API, but
  carry flagged corrections and one documents an unimplemented flag. The per-category
  finalize tasks ([[T-CTLG-example-catalog-finalize]]) wire each artifact to real
  CLI/library output and apply the corrections, so the data ships honest.
- **A few examples straddle categories** — cross-document docRules and dialect referential
  integrity sit between *Real-world schemas* and *Dialect*; placement was the synthesis's
  call. Revisit if the site information-architecture wants otherwise.
- **Should novel behaviors become first-class features?** Some novel examples (vault-wide
  wikilink validation, in-doc dead-anchor checks) are compositions the engine *allows* but
  doesn't ship as fixtures — open question whether to promote any to supported, tested
  features beyond documenting them.
- **Milestone status.** Closed 2026-07-03: all 14 member tasks are `closed/done`
  (the catalog umbrella and its eight children, plus the five coverage follow-up
  test tasks). Originally marked `open/planned` when the content was drafted and
  human-reviewed (2026-06-28) with the member tasks queued.
- **Milestone number.** Numbered `M-0007` in the settled delivery order: it follows the docs-site
  milestone (which it supplies with content) and precedes single-exec distribution. `version`
  is intentionally unset, consistent with the other open milestones.

## Dependencies

- The **fixture corpus** the review cross-references — [[T-9XB3-test-harness-and-fixtures]]
  and the validation / consumption / inference fixtures under `tests/fixtures/` — is the
  baseline of "what's already tested."
- The **moon monorepo** the site will live in ([[T-MOON-adopt-moon-monorepo]]) and the
  distribution ([[D-0012-distribution-single-exec-and-web-ui]]) and build-aspects ([[D-0010-monorepo-tooling]]) decisions.

## References

- The capability surface the catalog covers — `docs/planning/vision.md` and the
  `cli` &rarr; `runner` &rarr; `core` surfaces plus `declarative` and `dialect`.
- [[D-0012-distribution-single-exec-and-web-ui]] — the single-exec + web-UI distribution
  decision.
- [[D-0010-monorepo-tooling]] — the moon workspace / monorepo-tooling decision.
- [[T-MOON-adopt-moon-monorepo]] — adopting moon as the task runner / toolchain manager.
- The extracted catalog: [`docs/example-catalog.md`](../../example-catalog.md) — the
  full per-category tables, sketches, and coverage review this milestone summarizes.
- Catalog finalize tasks: [[T-CTLG-example-catalog-finalize]] (parent) and the eight
  per-category children ([[T-CCLI-catalog-cli]], [[T-CINF-catalog-inference-init]],
  [[T-CDYL-catalog-declarative-yaml]], [[T-CVPL-catalog-validation-planes]],
  [[T-CCON-catalog-consume-as-data]], [[T-CDIA-catalog-dialect]],
  [[T-CEMB-catalog-embed-and-ci]], [[T-CRWS-catalog-real-world-schemas]]).
- Test follow-ups: [[T-ROUT-runcorpus-first-match-routing]],
  [[T-DRAG-docrule-runcorpus-aggregation]], [[T-DREF-dialect-referential-integrity]],
  [[T-DANF-dialect-anchor-fragment-edges]], [[T-IOUT-init-out-placement]].
- Site (M-0006): [[T-SITE-bootstrap-docs-website]] consumes the catalog data;
  [[T-7UTE-astro-docs-site]] is the shell.
- [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]] — the
  upcoming `requires` / `forbids` text-constraint vocabulary (PR #50), previewed here as
  &#128679; planned examples.
- Catalog generated by a 22-agent workflow on 2026-06-28 (4 proposal lenses → synthesis →
  8 category fills → 8 coverage reviews → gap consolidation); planned text-constraint
  examples added from PR #50.
