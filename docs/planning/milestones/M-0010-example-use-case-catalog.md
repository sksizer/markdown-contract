---
type: milestone
schema_version: '1'
id: M-0010
title: Example use-case catalog — the categorized basis for the docs and marketing site
status: open/active
created: '2026-06-28'
tasks:
  - '[[T-ROUT-runcorpus-first-match-routing]]'
  - '[[T-SITE-bootstrap-docs-website]]'
tags:
  - docs
  - examples
  - website
  - dx
  - marketing
related:
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[D-0010-distribution-single-exec-and-web-ui]]'
  - '[[T-9XB3-test-harness-and-fixtures]]'
  - '[[B-DRAG-docrule-runcorpus-aggregation]]'
  - '[[B-DREF-dialect-referential-integrity]]'
  - '[[B-DANF-dialect-anchor-fragment-edges]]'
  - '[[B-IOUT-init-out-placement]]'
  - '[[C-0009-declarative-text-constraints]]'
  - '[[D-0011-declarative-text-constraints]]'
contains: []
need_human_review: true
---

# Example use-case catalog — the categorized basis for the docs and marketing site

## Goal

Produce a single, categorized, **additive, test-cross-referenced catalog of example use
cases** for markdown-contract — the content basis for the project's public documentation
and marketing website. The catalog *is* the deliverable here; turning it into a site is a
downstream build aspect — a new project in the [moon](https://moonrepo.dev) monorepo
alongside `packages/core` (library + CLI) and `apps/web` (daemon + UI), per
[[D-0010-distribution-single-exec-and-web-ui]] § D7 and [[T-MOON-adopt-moon-monorepo]].

Every example is a small, self-contained demonstration that **builds additively** on the
one before it, so the catalog doubles as a learning path: a reader can climb a category
top-to-bottom, each step adding exactly one idea.

## Summary

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
  existing_coverage, recommend_test) — see *Example entry schema*.
- **The review produced six follow-ups:** a task to pin first-match routing
  ([[T-ROUT-runcorpus-first-match-routing]]), four backlog notes for the remaining gaps,
  and a task to build the site ([[T-SITE-bootstrap-docs-website]]).
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

- Building the actual website — scoped to [[T-SITE-bootstrap-docs-website]].
- Writing the recommended missing tests — scoped to
  [[T-ROUT-runcorpus-first-match-routing]] and the backlog notes.
- Examples for the not-yet-built `daemon` / local web-UI surface
  ([[D-0010-distribution-single-exec-and-web-ui]], proposed) — a future catalog addition
  once that surface ships.
- Finalizing the illustrative artifacts as *runnable, regression-checked* docs. The
  sketches are accurate to real flags/API but a few carry flagged corrections (see
  *Test-coverage review*) to resolve during the site build.

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
- [ ] Human review of the chosen axis, the category boundaries, and the follow-up split.

## Deliverables

### How the axis was chosen

Four lenses proposed schemes in parallel:

- **Library surface & feature area** &rarr; CLI quickstart: validate from the terminal, Scaffolding & drift: init, inference, and conformance checks, Declarative YAML contracts (no TypeScript), Programmatic API: parse, contract, validate, read, The three validation planes in depth: structure, content, rules, Typed consumption: reading the document as a model, Dialect features: anchors, wikilinks, and vault references, Embedding the runner & real-world document schemas
- **User goal / journey / persona** &rarr; Lint your markdown in CI (the five-minute start), Adopt the tool on an existing vault or repo, Read your markdown as typed data, Author and enforce a house schema (no TypeScript), Tame your Obsidian vault: links, anchors, and dialect, Build custom and cross-document rules, Feed markdown to AI agents reliably, Embed validation in your own platform
- **Progressive teaching curriculum** &rarr; Rung 1 — First Run: validate from the command line, Rung 2 — One Parse, One Tree: the DocTree and the dialect, Rung 3 — Validating Structure: the section-and-block grammar, Rung 4 — Validating Content: Zod over frontmatter and blocks, Rung 5 — Custom and Cross-cutting Rules, Rung 6 — Consuming as Typed Data: the payoff, Rung 7 — Declarative Authoring: contracts and config in YAML, Rung 8 — Whole-Corpus and CI: scaling from one document to a guarded tree
- **Novel & real-world applications** &rarr; Quickstart: Validate and Scaffold a Folder from the Command Line, Engineering Doc Templates as Enforced Contracts, Knowledge Bases and Obsidian Vaults, Markdown as a Typed Data Pipeline, CI Gates, Code Scanning, and Pull-Request Enforcement, AI- and Agent-Readable Documents and Prompt Libraries, Cross-Document Governance at Scale

The synthesis chose **A progressive curriculum spine, sub-keyed by tool surface: one additive learning path that climbs from a CLI-first, zero-TypeScript entry point to embedded, whole-corpus governance — where each rung is a single, mutually-distinct surface or capability (CLI validate, init/inference, declarative YAML, the three validation planes in code, typed consumption, dialect, runner+CI, real-world schemas) so every example lands in exactly one home.**

> Proposal 3 (curriculum) had the strongest backbone: it orders both ACROSS and WITHIN categories additively, and it deliberately delays the slogan ("validation and consumption are the same contract") until the reader has climbed to it. But its pure-rung framing scattered single surfaces across multiple rungs (the three planes spread over rungs 3-5; the DocTree split from consumption) which hurts mutual distinctness and makes an example hard to place. So I merged in Proposal 1's surface boundaries — which mirror the module boundaries the codebase already enforces (cli -> runner -> core, plus declarative and dialect, confirmed by the src/ tree) — to make each rung exactly one adoptable surface. That keeps adjacent categories from colliding: CHECKING (cli, planes, runner) stays separate from READING (consume-as-data) and from DECLARING (declarative-yaml). Proposals 2 (persona) and 4 (applied jobs) are excellent framing but fail as the TOP axis: persona scatters the same act (check vs read vs declare) across many categories, producing overlap. I folded their best material — ADR/RFC/runbook templates, the Obsidian vault story, AI-agent feeds, and cross-document governance — into the capstone real-world-schemas category and the dialect category, where applied end-to-end examples belong, rather than letting them drive the spine. The result is CLI-first (the project's required entry point), no-code for the first three rungs (cli, init, YAML), then crossing into code for the planes and consumption, then the advanced embedding/at-scale rungs, ending on the self-hosted SDLC corpus the project dogfoods. Eight categories, mutually distinct by which capability each introduces, collectively near-exhaustive over every surface in the spec, comfortably holding 70+ examples.

### Example entry schema

The data structure each catalog example states — the contract for an "example":

| Field | Meaning |
|-------|---------|
| `id` | Stable catalog id, `CATEGORY-NN` (e.g. `CLI-03`). |
| `name` | Short, action-oriented title. |
| `demonstrates` | The single capability the example teaches (one sentence). |
| `rank` | Additive position within its category (1 = simplest entry point). |
| `builds_on` | The example id this one extends — the additive link. |
| `artifact_kind` | `cli` \| `yaml` \| `code` \| `markdown` \| `mixed`. |
| `artifact` | The concrete, copy-pasteable sketch (command / snippet / document). |
| `surfaces` | The library features / functions it exercises. |
| `needs_test` | `yes` \| `maybe` \| `no` — should the behavior have an automated test. |
| `coverage_status` | `covered` \| `partial` \| `uncovered` vs the existing corpus. |
| `existing_coverage` | Link(s) to the fixture/test that already covers it. |
| `recommend_test` | Whether to add a new test (the actionable gap). |

Each category below renders this as a **table** (the index + coverage matrix) followed by
the **additive sketches**. The two coverage columns answer the review questions directly:
*Needs test* (and, where flagged, the follow-up entity that will add it) and *Matches an
existing fixture/test?* (status + link).

### Catalog at a glance

Counts are over **shipped** examples; the **Planned** column is the upcoming declarative text constraints (C-0009 / D-0011), tracked separately.

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

### 1. CLI Quickstart: Validate from the Terminal — `cli`

The CLI-first front door and the project owner's required entry point. Every example is a `markdown-contract validate <path>` invocation — zero TypeScript, no library import, no hand-authored config required. Readers see a real finding with a source line:col printed in the terminal, learn the output formats one at a time (human, then json, then sarif), the exit-code contract (0 clean, 1 error-level findings, 2 usage/config error) as the basis for shell and CI gating, single-file vs directory runs, --include/--exclude glob scoping, auto-discovery of markdown-contract.yaml from the working dir, and the --contract/--path and --config overrides. This rung exists to make someone successful in two minutes before they understand planes or models.

**Additive ladder.** Start at the floor: validate one clean file, see exit 0. Then a file with one obvious problem, read a single human-formatted finding with line/col. Add --format json, then --format sarif for code-scanning uploads. Scale up: validate a directory, narrow it with --include/--exclude, lean on an auto-discovered markdown-contract.yaml, then override discovery with --contract/--path and --config. Close with exit-code-driven shell gating wiring the same command into a pre-commit hook. Each example adds exactly one flag or one step to the same validate loop.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **CLI-01** Validate one clean file, see exit 0 | Running validate on a conforming document prints "No findings." and exits 0. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts; tests/inference.cli.test.ts; src/declarative/config.test.ts |
| 2 | **CLI-02** Read a single human finding with line:col | A file that breaks its contract prints one human-formatted finding with id, level, and source line. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts |
| 3 | **CLI-03** Switch to JSON output | --format json emits the raw Finding[] array for machine parsing. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts |
| 4 | **CLI-04** Emit SARIF for code scanning | --format sarif produces a SARIF 2.1.0 log ready to upload to GitHub code scanning. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts |
| 5 | **CLI-05** Validate a whole directory | Passing a directory validates every markdown file the discovered config routes, aggregating findings. | yes | &#10003; covered — src/cli/index.test.ts; src/declarative/config.test.ts; src/runner/corpus.ts |
| 6 | **CLI-06** Narrow the run with --include | --include scopes a directory run to a glob, validating only the matching subset. | yes | &#10003; covered — src/declarative/config.test.ts |
| 7 | **CLI-07** Carve out files with --exclude | --exclude drops matching files from the run, here skipping archived entities. | yes | &#10003; covered — src/declarative/config.test.ts |
| 8 | **CLI-08** Lean on auto-discovered config | With a markdown-contract.yaml in the working dir, validate routes each glob to its contract with no flags. | yes | &#10003; covered — src/declarative/config.test.ts; tests/inference.cli.test.ts; src/declarative/load.test.ts |
| 9 | **CLI-09** Apply one contract inline with --contract | --contract validates a tree against a single YAML contract directly, no config file needed. | yes | &#10003; covered — src/declarative/config.test.ts |
| 10 | **CLI-10** Route contracts to dirs with --contract/--path pairs | Paired --contract and --path flags map each contract to its own directory in one run. | yes | &#10003; covered — src/declarative/config.test.ts |
| 11 | **CLI-11** Override discovery with --config | --config points validate at an explicit config file instead of auto-discovering one. | yes | &#10003; covered — src/declarative/config.test.ts; src/cli/index.test.ts |
| 12 | **CLI-12** Gate a pre-commit hook on the exit code | The 0/1/2 exit-code contract wires validate straight into a shell gate or git hook. | yes | &#10003; covered — src/cli/index.test.ts; src/declarative/config.test.ts |

**Sketches**

**CLI-01 — Validate one clean file, see exit 0**  
_Running validate on a conforming document prints "No findings." and exits 0._

```bash
$ markdown-contract validate docs/planning/decisions/D-0008.md
No findings.
$ echo $?
0
```
`surfaces:` validate subcommand; auto-discovered markdown-contract.yaml; formatHuman empty case; exit code 0 (clean)

**CLI-02 — Read a single human finding with line:col** · _builds on CLI-01_  
_A file that breaks its contract prints one human-formatted finding with id, level, and source line._

```bash
$ markdown-contract validate docs/planning/decisions/D-0008.md
docs/planning/decisions/D-0008.md:7 error structure/missing-section — required section "Decision" not found

1 finding(s): 1 error, 0 warn, 0 report
$ echo $?
1
```
`surfaces:` formatHuman per-finding line (path:line level id — message); Finding {id,level,path,pos}; exit code 1 (error-level findings)

> &#9888; **Review note:** Illustrative finding id 'structure/missing-section' does not exist; the real id is 'structure/section-missing'.

**CLI-03 — Switch to JSON output** · _builds on CLI-02_  
_--format json emits the raw Finding[] array for machine parsing._

```bash
$ markdown-contract validate docs/planning/decisions/D-0008.md --format json
[
  {
    "id": "structure/missing-section",
    "level": "error",
    "path": "docs/planning/decisions/D-0008.md",
    "pos": { "line": 7, "col": 1 },
    "message": "required section \"Decision\" not found"
  }
]
```
`surfaces:` --format json; formatJson (Finding[] verbatim, JSON.parse round-trips)

> &#9888; **Review note:** Illustrative finding id 'structure/missing-section' does not exist; real id is 'structure/section-missing'.

**CLI-04 — Emit SARIF for code scanning** · _builds on CLI-03_  
_--format sarif produces a SARIF 2.1.0 log ready to upload to GitHub code scanning._

```bash
$ markdown-contract validate docs/planning --format sarif > results.sarif
# results.sarif: { version: "2.1.0", runs: [{ tool.driver.name: "markdown-contract",
#   results: [{ ruleId, level, message.text, locations[].physicalLocation.region.startLine }] }] }
$ gh api ... # or upload-sarif Action consumes results.sarif
```
`surfaces:` --format sarif; formatSarif (SARIF 2.1.0, driver.rules, physicalLocation.region.startLine); error→error, warn→warning, report→note

**CLI-05 — Validate a whole directory** · _builds on CLI-02_  
_Passing a directory validates every markdown file the discovered config routes, aggregating findings._

```bash
$ markdown-contract validate docs/planning
docs/planning/tasks/T-0042.md:3 error content/enum — status not in {open/ready,...}
docs/planning/milestones/L0.md:12 warn structure/unknown-section — unexpected section "Notes"

2 finding(s): 1 error, 1 warn, 0 report
```
`surfaces:` validate <dir>; runner aggregates findings across files; findings deterministically ordered by path then line

> &#9888; **Review note:** Illustrative ids 'content/enum' and 'structure/unknown-section' do not exist (real: 'frontmatter/enum', 'frontmatter/unknown-key').

**CLI-06 — Narrow the run with --include** · _builds on CLI-05_  
_--include scopes a directory run to a glob, validating only the matching subset._

```bash
$ markdown-contract validate docs/planning --include 'tasks/**/*.md'
docs/planning/tasks/T-0042.md:3 error content/enum — status not in {open/ready,...}

1 finding(s): 1 error, 0 warn, 0 report
```
`surfaces:` --include glob (run-root-relative; --glob is its alias); runner include filter

> &#9888; **Review note:** Illustrative id 'content/enum' does not exist (real: 'frontmatter/enum').

**CLI-07 — Carve out files with --exclude** · _builds on CLI-06_  
_--exclude drops matching files from the run, here skipping archived entities._

```bash
$ markdown-contract validate docs/planning --exclude '**/archive/**'
No findings.
$ echo $?
0
```
`surfaces:` --exclude glob (run-root-relative); runner exclude filter; exit 0 when nothing left fails

**CLI-08 — Lean on auto-discovered config** · _builds on CLI-05_  
_With a markdown-contract.yaml in the working dir, validate routes each glob to its contract with no flags._

```yaml
# markdown-contract.yaml (auto-discovered from cwd)
mcVersion: 1
kind: config
contracts:
  decisions: ./contracts/decisions.contract.yaml
  tasks: ./contracts/tasks.contract.yaml
rules:
  - include: ['decisions/**/*.md']
    contract: decisions   # first matching rule wins
  - include: ['tasks/**/*.md']
    contract: tasks
```
`surfaces:` auto-discovery of markdown-contract.yaml; kind:config; contracts map + rules (globs→contract, first match wins); loadConfigFile

**CLI-09 — Apply one contract inline with --contract** · _builds on CLI-08_  
_--contract validates a tree against a single YAML contract directly, no config file needed._

```bash
$ markdown-contract validate docs/planning/decisions \
    --contract contracts/decisions.contract.yaml
# applies decisions.contract.yaml to every *.md under the given path
No findings.
```
`surfaces:` --contract <yaml> (config-less parameterization); buildInlineConfig single-contract catch-all rule **/*.md; cannot combine with --config

**CLI-10 — Route contracts to dirs with --contract/--path pairs** · _builds on CLI-09_  
_Paired --contract and --path flags map each contract to its own directory in one run._

```bash
$ markdown-contract validate \
    --contract contracts/decisions.contract.yaml --path docs/planning/decisions \
    --contract contracts/tasks.contract.yaml     --path docs/planning/tasks
# one rule per pair: <dir>/**/*.md → its contract
```
`surfaces:` paired --contract/--path; buildInlineConfig paired routing (one rule per pair); each --contract needs a matching --path

**CLI-11 — Override discovery with --config** · _builds on CLI-08_  
_--config points validate at an explicit config file instead of auto-discovering one._

```bash
$ markdown-contract validate docs/planning --config ci/strict.yaml
# ci/strict.yaml is a kind:config router; --config and --contract are mutually exclusive
No findings.
```
`surfaces:` --config <file> override (.yaml/.yml/.js/.mjs); loadConfig explicit path; mutually exclusive with --contract

**CLI-12 — Gate a pre-commit hook on the exit code** · _builds on CLI-02_  
_The 0/1/2 exit-code contract wires validate straight into a shell gate or git hook._

```bash
#!/bin/sh
# .git/hooks/pre-commit
markdown-contract validate docs/planning || {
  echo 'contract findings present — commit blocked' >&2
  exit 1   # 0 clean, 1 error findings, 2 usage/config error
}
```
`surfaces:` exit-code contract (0 clean / 1 error-level findings / 2 usage-config error) as the shell + CI gating basis


### 2. Scaffold and Guard: init, Inference, and Drift Checks — `inference-init`

The init surface, still zero-TypeScript: point it at markdown you already have and it infers a tight-but-accepting contract and a markdown-contract.yaml that validate then auto-discovers. Examples turn 'I have a folder of notes' into 'I have a contract' without hand-authoring schema — single-directory and multi-directory runs, --dry-run to preview files without writing, --meta to emit the glob-to-contract corpus config, --depth, --relax, --infer-bounds and --inline to tune how strict and how split the inferred shape is, --out/--force for placement, and crucially --check as a drift detector that fails when a tree stops conforming, feeding straight back into the cli rung's CI gate.

**Additive ladder.** Begin with init over a single tidy folder; read the generated contract. Add --dry-run to preview without writing, then --meta to also emit the corpus config. Tighten with --infer-bounds, then --depth and --relax, then --inline vs split output and --out/--force placement. Flip the workflow: run --check on the unchanged tree (passes), mutate a document, re-run --check to catch drift. Each example adds one inference knob or closes one more loop from scaffold to ongoing guardrail.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **INFERENCE-INIT-01** Scaffold a contract from a folder of notes | init reads existing markdown and writes a tight-but-accepting contract plus a discoverable router, zero TypeScript. | yes | &#10003; covered — tests/inference.cli.test.ts, src/declarative/infer.test.ts, tests/fixtures/infer/01-flat-uniform/fixture.ts |
| 2 | **INFERENCE-INIT-02** Read the inferred contract | The generated YAML is a plain declarative contract — required vs optional sections, strict frontmatter, and value-ladder field types you can hand-tune. | yes | &#10003; covered — src/declarative/infer.test.ts, tests/fixtures/infer/01-flat-uniform/fixture.ts, tests/fixtures/infer/02-optional-sections/fixture. |
| 3 | **INFERENCE-INIT-03** Preview without writing using --dry-run | --dry-run prints every would-be file to stdout and writes nothing, so you can inspect the scaffold before committing it. | yes | &#10003; covered — tests/inference.cli.test.ts |
| 4 | **INFERENCE-INIT-04** Emit a corpus meta-config with --meta | --meta cuts the tree into one contract per top-level directory plus a glob-routed markdown-contract.yaml corpus config. | yes | &#10003; covered — tests/inference.cli.test.ts, src/declarative/infer.test.ts, tests/fixtures/infer/07-tree-depth1/fixture.ts |
| 5 | **INFERENCE-INIT-05** Tighten with --infer-bounds | --infer-bounds opts the value ladder into pattern/min/max inference for an even tighter generated schema. | maybe | &#10007; none |
| 6 | **INFERENCE-INIT-06** Move the cut with --depth | --depth N groups contracts at exactly N directories deep, warning about files stranded above a depth-2+ cut. | yes | &#10003; covered — src/declarative/infer.test.ts, tests/fixtures/infer/08-tree-depth2/fixture.ts, tests/fixtures/infer/10-stranded-depth/fixture.ts |
| 7 | **INFERENCE-INIT-07** Loosen the floor with --relax | --relax generates a permissive contract — order: none, allowUnknown: true, non-strict frontmatter, no enums — for evolving corpora. | yes | &#10003; covered — src/declarative/infer.test.ts, tests/fixtures/infer/11-relax/fixture.ts |
| 8 | **INFERENCE-INIT-08** Inline vs split, and place with --out/--force | --inline collapses the meta-config to one self-contained file, while --out and --force control where it lands and whether it overwrites. | yes · add &rarr; [[B-IOUT-init-out-placement]] | &#9680; partial — tests/inference.cli.test.ts, src/declarative/infer.test.ts |
| 9 | **INFERENCE-INIT-09** Guard the tree with --check | --check skips inference and verifies the existing scaffold still accepts the tree, exiting 0 when clean — a drift detector for CI. | yes | &#10003; covered — tests/inference.cli.test.ts |
| 10 | **INFERENCE-INIT-10** Catch drift after a document changes | Mutating a doc so it stops conforming makes the same --check fail with exit 1, closing the scaffold-to-guardrail loop. | yes | &#10003; covered — tests/inference.cli.test.ts |

**Sketches**

**INFERENCE-INIT-01 — Scaffold a contract from a folder of notes**  
_init reads existing markdown and writes a tight-but-accepting contract plus a discoverable router, zero TypeScript._

```bash
# infer the tightest contract that still accepts every *.md under ./notes
markdown-contract init ./notes
# writes notes.contract.yaml + markdown-contract.yaml (the router) in the cwd
# prints: init: inferred 1 contract(s); wrote 2 file(s)
#         self-check: clean (the scaffold accepts its own corpus)
```
`surfaces:` init verb (src/cli/run.ts runInit), inferConfig single-contract mode, mergeFiles router synthesis, post-write self-check

**INFERENCE-INIT-02 — Read the inferred contract** · _builds on INFERENCE-INIT-01_  
_The generated YAML is a plain declarative contract — required vs optional sections, strict frontmatter, and value-ladder field types you can hand-tune._

```yaml
# notes.contract.yaml (generated)
mcVersion: 1
kind: contract
frontmatter:
  strict: true            # key set is closed by construction
  fields:
    title: { type: string }
    created: { type: string, format: date }   # ladder rung 5
    status: { enum: [draft, published] }       # ladder rung 6
body:
  order: recognized-relative
  allowUnknown: false
  sections:
    - { section: Summary }
    - { section: Notes, optional: true }       # not present in every file
```
`surfaces:` inferFrontmatter (strict + value ladder: const/format/enum), inferBody (universal=required, detectOrder), declarative contract format

**INFERENCE-INIT-03 — Preview without writing using --dry-run** · _builds on INFERENCE-INIT-01_  
_--dry-run prints every would-be file to stdout and writes nothing, so you can inspect the scaffold before committing it._

```bash
markdown-contract init ./notes --dry-run
# stdout shows each file as a banner + body, e.g.:
# # notes.contract.yaml
# mcVersion: 1
# kind: contract
# ...
# # markdown-contract.yaml
# ...
# nothing is written to disk (exit 0)
```
`surfaces:` init --dry-run branch, renderDryRun (per-file banners + warnings trailer)

**INFERENCE-INIT-04 — Emit a corpus meta-config with --meta** · _builds on INFERENCE-INIT-01_  
_--meta cuts the tree into one contract per top-level directory plus a glob-routed markdown-contract.yaml corpus config._

```bash
markdown-contract init ./docs --meta
# writes a router that maps globs -> contracts (first match wins):
#   markdown-contract.yaml      (contracts registry + rules)
#   contracts/guides.contract.yaml
#   contracts/reference.contract.yaml
# plus a *.md root contract for files directly in ./docs
```
`surfaces:` inferConfig meta mode (inferMeta), depth-1 directory cut, emitMetaFiles split output, contracts registry + rules (first match wins)

**INFERENCE-INIT-05 — Tighten with --infer-bounds** · _builds on INFERENCE-INIT-02_  
_--infer-bounds opts the value ladder into pattern/min/max inference for an even tighter generated schema._

```bash
markdown-contract init ./notes --infer-bounds
# beyond the default const/format/enum/type ladder, opts into
# inferring numeric min/max and string pattern bounds where the
# corpus supports them — still accept-by-construction (never tighter
# than the observed data), verified by the post-write self-check
```
`surfaces:` InferOptions.inferBounds, value ladder (inferFieldSchema) bound inference, accept-by-construction self-check

> &#9888; **Review note:** --infer-bounds is accepted as a flag (parsed in src/cli/run.ts, surfaced as InferOptions.inferBounds) but is NEVER read in src/declarative/infer.ts; the code comment states min/max/pattern inference is 'a future phase'. The demonstrated bound-inference behavior does not exist yet, so the flag is currently a no-op.

**INFERENCE-INIT-06 — Move the cut with --depth** · _builds on INFERENCE-INIT-04_  
_--depth N groups contracts at exactly N directories deep, warning about files stranded above a depth-2+ cut._

```bash
markdown-contract init ./docs --meta --depth 2
# one contract per directory at depth 2, e.g.
#   contracts/api-v1.contract.yaml   (api/v1/**/*.md)
#   contracts/api-v2.contract.yaml   (api/v2/**/*.md)
# files in ./docs/api (between root and the cut) are reported:
#   warning: stranded: api/overview.md sits above the --depth 2 cut
```
`surfaces:` InferOptions.depth, inferMeta ancestorAt grouping, full-path slug naming (nameForDir), stranded-file warnings

**INFERENCE-INIT-07 — Loosen the floor with --relax** · _builds on INFERENCE-INIT-02_  
_--relax generates a permissive contract — order: none, allowUnknown: true, non-strict frontmatter, no enums — for evolving corpora._

```bash
markdown-contract init ./notes --relax
# loosens every knob to the permissive floor:
#   body.order: none, body.allowUnknown: true
#   frontmatter non-strict, every non-universal field optional
#   categorical fields stay {type: string} (enums dropped)
# good when the tree is still growing and you want headroom
```
`surfaces:` InferOptions.relax, inferBody (order none + allowUnknown), inferFrontmatter (non-strict), value ladder dropping rung-6 enums

**INFERENCE-INIT-08 — Inline vs split, and place with --out/--force** · _builds on INFERENCE-INIT-04_  
_--inline collapses the meta-config to one self-contained file, while --out and --force control where it lands and whether it overwrites._

```bash
# one self-contained markdown-contract.yaml (defs inline on each rule),
# written into ./config, overwriting any existing scaffold there
markdown-contract init ./docs --meta --inline --out ./config --force
# without --inline: a router + contracts/<name>.contract.yaml per group
# without --force: refuses to clobber an existing config (exit 2)
```
`surfaces:` InferOptions.inline (emitMetaFiles inline vs split), --out placement, --force clobber guard

**INFERENCE-INIT-09 — Guard the tree with --check** · _builds on INFERENCE-INIT-01_  
_--check skips inference and verifies the existing scaffold still accepts the tree, exiting 0 when clean — a drift detector for CI._

```bash
# run against the unchanged tree the scaffold was inferred from
markdown-contract init ./notes --check
# loads the existing markdown-contract.yaml, runs it over ./notes:
#   check /abs/notes: clean
# exit 0 — wire straight into the CI gate alongside `validate`
```
`surfaces:` init --check branch (runInitCheck), loadConfigFile + runCorpus, exit 0 clean / 1 drift

**INFERENCE-INIT-10 — Catch drift after a document changes** · _builds on INFERENCE-INIT-09_  
_Mutating a doc so it stops conforming makes the same --check fail with exit 1, closing the scaffold-to-guardrail loop._

```text
# add a frontmatter key the strict contract never saw, then re-check
#   ./notes/today.md: + reviewer: alex
markdown-contract init ./notes --check
# check /abs/notes: 1 error finding(s) — drifted
# exit 1 — CI fails the build until the doc or the contract is updated
```
`surfaces:` init --check drift path, runCorpus error-level findings (strict frontmatter unknown-key), exit code 1 as CI signal


### 3. Declarative YAML: Contracts and Corpus Config, No Code — `declarative-yaml`

The markdown-contract/declarative surface: author a full contract (mcVersion 1, kind contract) and a corpus meta-config (kind config) entirely in YAML, no TypeScript. Examples walk the schema vocabulary — type, enum, const, min/max, pattern, format, array, object, optional, default, nullable — each compiling to Zod, then build frontmatter field sets (strict vs open) and body section declarations. The config side maps globs to contracts with first-match-wins precedence. This is the portable, diff-able, reviewable authoring plane that produces exactly the same findings as the programmatic API, so it doubles as the bridge for readers who will never open a .ts file.

**Additive ladder.** Open with a minimal contract validating one required frontmatter field by type. Layer the vocabulary additively: enum/const, then min/max/pattern/format, then optional/default/nullable, then nested object and array fields. Move to the body: declare required sections, then required block kinds. Assemble a corpus config mapping one glob to one contract, then several globs with first-match-wins ordering, plus include/exclude. End by showing a YAML contract and its TypeScript equivalent producing identical findings. Each rung moves one more concept from code into data.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **DECLARATIVE-YAML-01** Validate one required frontmatter field by type | A minimal contract document (mcVersion 1, kind contract) that requires a single typed frontmatter field. | yes | &#10003; covered — src/declarative/load.test.ts; src/declarative/schema.test.ts; tests/fixtures/validation/07-frontmatter-only-zod.contract.yaml |
| 2 | **DECLARATIVE-YAML-02** Constrain with enum and const | Pinning a field to a fixed literal (const) or a closed set of allowed values (enum). | yes | &#10003; covered — src/declarative/schema.test.ts (enum, const cases) |
| 3 | **DECLARATIVE-YAML-03** Bound and shape strings with min/max, pattern, format | Adding numeric bounds, a regex pattern, and a named string format to a typed field. | yes | &#10003; covered — src/declarative/schema.test.ts (string+pattern+min, number+int+min/max, format email/date) |
| 4 | **DECLARATIVE-YAML-04** Make fields optional, defaulted, or nullable | The three field wrappers — optional, default, nullable — applied over a base schema. | yes | &#10003; covered — src/declarative/schema.test.ts (optional / default / nullable wrappers) |
| 5 | **DECLARATIVE-YAML-05** Toggle strict vs open frontmatter | Whether unlisted frontmatter keys are rejected (strict) or passed through (open). | yes | &#10003; covered — src/declarative/schema.test.ts (object+strict); src/declarative/load.test.ts (strict unknown-key); tests/fixtures/validation/07a-f |
| 6 | **DECLARATIVE-YAML-06** Declare array and nested object fields | Composite frontmatter — an array with an element schema (of) and a nested object with its own fields. | yes | &#10003; covered — src/declarative/schema.test.ts (array of string + min; object + strict via compileObjectSchema) |
| 7 | **DECLARATIVE-YAML-07** Declare required body sections | Moving to the body plane: a sections grammar listing the H2 headings a document must contain, with ordering and unknown-section policy. | yes | &#10003; covered — src/declarative/body.test.ts (v01, v05); tests/fixtures/validation/04-recognized-relative-order.contract.yaml; 05-strict-prefix-ga |
| 8 | **DECLARATIVE-YAML-08** Optional, alias, oneOf and gap section nodes | The remaining body-node vocabulary — optional sections, heading aliases, a oneOf choice, and a gap allowance. | yes | &#10003; covered — src/declarative/body.test.ts (v05 gap, v06 alias/oneOf); tests/fixtures/validation/03-optional-sections.contract.yaml; 05b-gap-bou |
| 9 | **DECLARATIVE-YAML-09** Declare required block kinds inside a section | Content leaves — requiring a typed table, a checkbox list, fenced code, or a word cap within a section. | yes | &#10003; covered — src/declarative/body.test.ts (v09 maxWords/anchor, v10 table, v11 typed cells, v12 list); tests/fixtures/validation/13-code-leaf-l |
| 10 | **DECLARATIVE-YAML-10** Map one glob to one contract (corpus config) | The config plane: a kind config document whose single rule routes a glob to a contract file. | yes | &#10003; covered — src/declarative/config.test.ts (loadConfigFile, named .yaml contract ref resolves + runCorpus); inline contract object case |
| 11 | **DECLARATIVE-YAML-11** Route several globs first-match-wins, with named contracts and exclude | A multi-rule config with a named contracts map, per-rule exclude, and first-match-wins precedence. | yes · add &rarr; [[T-ROUT-runcorpus-first-match-routing]] | &#9680; partial — src/declarative/config.test.ts (contracts name map; global runCorpus exclude) |
| 12 | **DECLARATIVE-YAML-12** Run a YAML config from the CLI | Feeding a declarative config into the validate command, which auto-discovers markdown-contract.yaml or takes an explicit --config. | yes | &#10003; covered — src/cli/index.test.ts (--config, --format json/sarif, exit 0/1/2, bad --format); tests/inference.cli.test.ts:51 (validate <dir> au |
| 13 | **DECLARATIVE-YAML-13** YAML contract and its TypeScript equivalent, identical findings | That a YAML-authored contract compiles to the same Contract as the combinator API, producing identical findings. | yes | &#10003; covered — tests/yaml-parity.test.ts (full corpus YAML<->TS parity); src/declarative/body.test.ts (expectParity); src/declarative/load.test.t |
| 14 | **DECLARATIVE-YAML-14** Require a phrase in a section | A section node carries requires: so its prose must contain a literal phrase (compiles to a node-local rule). | on impl | &#128679; planned — C-0009 / D-0011 · seed `tests/fixtures/validation/17-node-level-custom-rule.ts` |
| 15 | **DECLARATIVE-YAML-15** Forbid a phrase document-wide | forbids: on the body root asserts a phrase appears nowhere in the document (compiles to a docRule). | on impl | &#128679; planned — C-0009 / D-0011 |
| 16 | **DECLARATIVE-YAML-16** Match by regex instead of a literal | A regex: entry matches a pattern (here either of two markers) rather than a fixed substring. | on impl | &#128679; planned — C-0009 / D-0011 |
| 17 | **DECLARATIVE-YAML-17** Tune the match: normalize and ignoreCase | normalize folds whitespace (tolerating prose line-wrapping) and ignoreCase makes the match case-insensitive. | on impl | &#128679; planned — C-0009 / D-0011 |
| 18 | **DECLARATIVE-YAML-18** Bound occurrences with min / max | min and max constrain how many times a phrase may occur; max: 0 is the in-section forbids dual. | on impl | &#128679; planned — C-0009 / D-0011 |
| 19 | **DECLARATIVE-YAML-19** Annotate and downgrade: note + level | Each entry can carry an author note (appended to the message) and a level to warn instead of error. | on impl | &#128679; planned — C-0009 / D-0011 |
| 20 | **DECLARATIVE-YAML-20** Retire an invariants list across both scopes | Independent entries on the body root (whole-doc) and on a section node together replace an invariants.yaml linter. | on impl | &#128679; planned — C-0009 / D-0011 |

**Sketches**

**DECLARATIVE-YAML-01 — Validate one required frontmatter field by type**  
_A minimal contract document (mcVersion 1, kind contract) that requires a single typed frontmatter field._

```yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    title:
      type: string
```
`surfaces:` loadContract / loadContractFile; compileFrontmatter -> compileObjectSchema; type: string -> z.string()

**DECLARATIVE-YAML-02 — Constrain with enum and const** · _builds on DECLARATIVE-YAML-01_  
_Pinning a field to a fixed literal (const) or a closed set of allowed values (enum)._

```yaml
frontmatter:
  fields:
    type:
      const: decision
    status:
      enum: [open/ready, in-progress/active, closed/done]
```
`surfaces:` schema.ts base(): const -> z.literal(), enum -> z.enum()

**DECLARATIVE-YAML-03 — Bound and shape strings with min/max, pattern, format** · _builds on DECLARATIVE-YAML-02_  
_Adding numeric bounds, a regex pattern, and a named string format to a typed field._

```yaml
frontmatter:
  fields:
    id:       { type: string, pattern: '^D-\d{4}$' }
    title:    { type: string, min: 1, max: 80 }
    created:  { type: string, format: date }
    contact:  { type: string, format: email }
    weight:   { type: number, int: true, min: 0, max: 5 }
```
`surfaces:` schema.ts typed(): .min/.max, .regex(pattern), STRING_FORMATS (date/email -> z.iso.date()/z.email()), int -> z.int()

**DECLARATIVE-YAML-04 — Make fields optional, defaulted, or nullable** · _builds on DECLARATIVE-YAML-03_  
_The three field wrappers — optional, default, nullable — applied over a base schema._

```yaml
frontmatter:
  fields:
    last_reviewed: { type: string, format: date, optional: true }
    priority:      { type: number, default: 3 }
    archived_at:   { type: string, format: date, nullable: true }
```
`surfaces:` compileSchema() wrappers: .optional(), .default(value), .nullable()

**DECLARATIVE-YAML-05 — Toggle strict vs open frontmatter** · _builds on DECLARATIVE-YAML-04_  
_Whether unlisted frontmatter keys are rejected (strict) or passed through (open)._

```yaml
frontmatter:
  strict: true        # unknown keys become a finding (z.strictObject)
  fields:
    type:   { const: task }
    id:     { type: string }
    status: { enum: [open/ready, closed/done] }
```
`surfaces:` compileFrontmatter(): strict -> z.strictObject vs z.object

**DECLARATIVE-YAML-06 — Declare array and nested object fields** · _builds on DECLARATIVE-YAML-05_  
_Composite frontmatter — an array with an element schema (of) and a nested object with its own fields._

```yaml
frontmatter:
  fields:
    tags:
      type: array
      of: { type: string }
      min: 1
    owner:
      type: object
      strict: true
      fields:
        name:  { type: string }
        email: { type: string, format: email }
```
`surfaces:` typed() array -> z.array(compileSchema(of)) with .min; object -> compileObjectSchema(fields, strict)

**DECLARATIVE-YAML-07 — Declare required body sections** · _builds on DECLARATIVE-YAML-06_  
_Moving to the body plane: a sections grammar listing the H2 headings a document must contain, with ordering and unknown-section policy._

```yaml
body:
  order: strict          # none | recognized-relative | strict
  allowUnknown: false
  sections:
    - section: Summary
    - section: Context
    - section: Decision
    - section: References
```
`surfaces:` compileBody -> sections(opts, specs); order/allowUnknown LevelOpts; section()

**DECLARATIVE-YAML-08 — Optional, alias, oneOf and gap section nodes** · _builds on DECLARATIVE-YAML-07_  
_The remaining body-node vocabulary — optional sections, heading aliases, a oneOf choice, and a gap allowance._

```yaml
body:
  order: recognized-relative
  sections:
    - section: Summary
      aliases: [Overview, TL;DR]
    - oneOf: [Decision, Proposal]
    - section: Out of scope
      optional: true
    - gap: { min: 0, max: 2 }
```
`surfaces:` compileNode: section(names with aliases), oneOf(), optional(spec), gap({min,max})

**DECLARATIVE-YAML-09 — Declare required block kinds inside a section** · _builds on DECLARATIVE-YAML-08_  
_Content leaves — requiring a typed table, a checkbox list, fenced code, or a word cap within a section._

```yaml
body:
  sections:
    - section: Summary
      anchor: summary
      content: { maxWords: 120 }
    - section: Files to touch
      content:
        table:
          columns: [Location, Kind, Change]
          cells: { Kind: { enum: [new, modify, delete] } }
    - section: Acceptance criteria
      content: { list: { everyItem: checkbox } }
```
`surfaces:` compileContent/compileLeaf: maxWords(), table({columns,cells}), list({everyItem}); cells reuse compileSchema

**DECLARATIVE-YAML-10 — Map one glob to one contract (corpus config)** · _builds on DECLARATIVE-YAML-09_  
_The config plane: a kind config document whose single rule routes a glob to a contract file._

```yaml
mcVersion: 1
kind: config
rules:
  - include: ["docs/planning/decisions/**/*.md"]
    contract: ./contracts/decision.contract.yaml
```
`surfaces:` loadConfig/loadConfigFile -> CorpusConfig; compileRule include + contract path resolution

**DECLARATIVE-YAML-11 — Route several globs first-match-wins, with named contracts and exclude** · _builds on DECLARATIVE-YAML-10_  
_A multi-rule config with a named contracts map, per-rule exclude, and first-match-wins precedence._

```yaml
mcVersion: 1
kind: config
contracts:
  task: ./contracts/task.contract.yaml
  decision: ./contracts/decision.contract.yaml
rules:
  - include: ["**/tasks/**/*.md"]
    exclude: ["**/_archive/**"]
    contract: task          # earliest matching rule wins
  - include: ["**/decisions/**/*.md"]
    contract: decision
```
`surfaces:` compileConfig: contracts name map, compileRule exclude, first-match-wins rule order in runCorpus

**DECLARATIVE-YAML-12 — Run a YAML config from the CLI** · _builds on DECLARATIVE-YAML-11_  
_Feeding a declarative config into the validate command, which auto-discovers markdown-contract.yaml or takes an explicit --config._

```bash
# auto-discovers markdown-contract.yaml in the working dir:
markdown-contract validate docs/planning

# or point at one explicitly, JSON findings, exit 1 on errors:
markdown-contract validate docs/planning --config markdown-contract.yaml --format json
```
`surfaces:` CLI validate <path> --config --format; loadConfigFile -> runCorpus; exit 0 clean / 1 errors / 2 usage

**DECLARATIVE-YAML-13 — YAML contract and its TypeScript equivalent, identical findings** · _builds on DECLARATIVE-YAML-12_  
_That a YAML-authored contract compiles to the same Contract as the combinator API, producing identical findings._

```text
# YAML
frontmatter:
  strict: true
  fields:
    id:     { type: string, pattern: '^T-[0-9A-Z]{4}$' }
    status: { enum: [open/ready, closed/done] }

// TypeScript — same contract, same findings
contract({ frontmatter: z.object({
  id: z.string().regex(/^T-[0-9A-Z]{4}$/),
  status: z.enum(["open/ready", "closed/done"]),
}).strict() })
```
`surfaces:` loadContract vs contract({frontmatter}); both yield a Contract whose validate() emits the same frontmatter/* findings

**DECLARATIVE-YAML-14 — Require a phrase in a section** · _builds on DECLARATIVE-YAML-13_  &#128679; PLANNED  
_A section node carries requires: so its prose must contain a literal phrase (compiles to a node-local rule)._

```yaml
mcVersion: 1
kind: contract
body:
  sections:
    - section: Output contract
      requires:
        - pattern: "DONE pr="          # this section's text must contain it
          note: "primary success signal"
```
`surfaces:` requires: on a section node -> a node-local rule; text/requires finding at the section heading

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery. Seed (hand-written): `tests/fixtures/validation/17-node-level-custom-rule.ts`.

**DECLARATIVE-YAML-15 — Forbid a phrase document-wide** · _builds on DECLARATIVE-YAML-14_  &#128679; PLANNED  
_forbids: on the body root asserts a phrase appears nowhere in the document (compiles to a docRule)._

```yaml
mcVersion: 1
kind: contract
body:
  forbids:
    - pattern: "}scripts/"     # must appear nowhere in the document
      normalize: false         # exact bytes, no whitespace folding
      note: "route through the op substrate"
  sections:
    - section: Notes
```
`surfaces:` forbids: on the body root -> a whole-document docRule; text/forbids finding at the offending line

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.

**DECLARATIVE-YAML-16 — Match by regex instead of a literal** · _builds on DECLARATIVE-YAML-14_  &#128679; PLANNED  
_A regex: entry matches a pattern (here either of two markers) rather than a fixed substring._

```yaml
body:
  sections:
    - section: Output contract
      requires:
        - regex: "LEASE-(CONFLICT|MISSING) ref="   # matches either marker
          note: "lease failure markers"
```
`surfaces:` regex: entry (the alternative to pattern:) in a match spec

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.

**DECLARATIVE-YAML-17 — Tune the match: normalize and ignoreCase** · _builds on DECLARATIVE-YAML-14_  &#128679; PLANNED  
_normalize folds whitespace (tolerating prose line-wrapping) and ignoreCase makes the match case-insensitive._

```yaml
body:
  requires:
    - pattern: "sdlc task close-commit"
      normalize: true     # collapse whitespace runs; tolerate line-wrapping (default)
      ignoreCase: true    # case-insensitive (default false)
```
`surfaces:` normalize (default true) and ignoreCase (default false) on a match spec

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.

**DECLARATIVE-YAML-18 — Bound occurrences with min / max** · _builds on DECLARATIVE-YAML-15_  &#128679; PLANNED  
_min and max constrain how many times a phrase may occur; max: 0 is the in-section forbids dual._

```yaml
body:
  sections:
    - section: Output contract
      requires:
        - pattern: "DONE pr="
          min: 1            # present at least once (the default)
        - pattern: "WARNING"
          max: 0            # must NOT appear in this section (forbids dual)
```
`surfaces:` min/max occurrence count; forbids == requires{max:0}; text/count finding

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.

**DECLARATIVE-YAML-19 — Annotate and downgrade: note + level** · _builds on DECLARATIVE-YAML-15_  &#128679; PLANNED  
_Each entry can carry an author note (appended to the message) and a level to warn instead of error._

```yaml
body:
  forbids:
    - pattern: "TODO"
      level: warn          # downgrade from the default error
      note: "ship without TODOs (warning only)"
```
`surfaces:` per-entry level (error\|warn) and note appended to the finding message

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.

**DECLARATIVE-YAML-20 — Retire an invariants list across both scopes** · _builds on DECLARATIVE-YAML-18_  &#128679; PLANNED  
_Independent entries on the body root (whole-doc) and on a section node together replace an invariants.yaml linter._

```yaml
mcVersion: 1
kind: contract
body:
  forbids:
    - { pattern: "}validators/", normalize: false }    # forbidden_phrases
  requires:
    - { pattern: "conventions/commit-messages.md" }    # required tool-ref, anywhere
  sections:
    - section: Output contract
      requires:
        - { pattern: "ALREADY-CLOSED" }                # required phrase, this section
        - { pattern: "STALE-PR pr=" }
```
`surfaces:` multiple independent entries across two scopes (section subtree + whole doc); 1:1 map from invariants.yaml

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.


### 4. Authoring Contracts in Code: Structure, Content, and Custom Rules — `validation-planes`

The programmatic API as the engine that powers all three validation planes from one parse. Starts from parse(md) returning a DocTree, then contract({frontmatter, body, rules}) assembled from body combinators (sections/section/optional/oneOf/gap) and content leaves (table/list/code/maxWords), checked via contract.validate(src,{path}) returning {findings, doc, tree}. STRUCTURE is the regular tree grammar over sections AND block kinds; CONTENT is Zod over each block's data and over frontmatter; RULES are node-level rule() and cross-document docRule(). Examples isolate each plane, show the Finding shape {id, level error|warn|report, path, pos?, message, fix?}, and demonstrate deterministic ordering by line, then col, then plane.

**Additive ladder.** Begin with parse(md) to show the raw DocTree, then the smallest contract — one required section — and validate to get a structural finding. Grow structure with ordering, optional, oneOf, gap, then block-kind constraints (require a table, a list, code). Cross into content: a one-field Zod frontmatter schema, then enum/format/min-max, then typed table columns and a per-row constraint and maxWords. Then custom rule() on one node with a level and a fix, then docRule() spanning documents. Close with several findings from all three planes arriving in one deterministic order. Each example adds exactly one combinator, schema, or rule.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **VALIDATION-PLANES-01** Parse markdown into a DocTree | parse(md) returns the raw DocTree of frontmatter, sections, and positions before any contract exists. | yes | &#10003; covered — src/core/projection.test.ts |
| 2 | **VALIDATION-PLANES-02** The smallest contract: one required section | contract({body: sections([section(...)])}).validate(src) emits a single structure-plane Finding for a missing section. | yes | &#10003; covered — tests/fixtures/validation/01-single-required-section.ts, tests/fixtures/validation/01a-single-section-missing.ts |
| 3 | **VALIDATION-PLANES-03** Constrain section order | sections({order:'strict'}) makes out-of-order headings a positioned structure/section-order finding. | yes | &#10003; covered — tests/fixtures/validation/05a-strict-prefix-violated.ts, tests/fixtures/validation/04a-recognized-relative-out-of-order.ts |
| 4 | **VALIDATION-PLANES-04** Make a section optional | optional(section(...)) lets a slot be absent without a finding while the rest of the order still holds. | yes | &#10003; covered — tests/fixtures/validation/03-optional-sections.ts, tests/fixtures/validation/05-strict-prefix-gap-tail.ts |
| 5 | **VALIDATION-PLANES-05** Allow interchangeable headings with oneOf | oneOf([...]) accepts any one of several spellings at a single position as one logical slot. | yes | &#10003; covered — tests/fixtures/validation/06-alias-sets-oneof.ts, tests/fixtures/validation/06a-oneof-none-present.ts, tests/fixtures/validation/0 |
| 6 | **VALIDATION-PLANES-06** Admit unknown sections with a bounded gap | gap({max}) permits a counted window of unrecognized sections between required ones, flagging overflow as structure/gap-count. | yes | &#10003; covered — tests/fixtures/validation/05b-gap-bounds.ts |
| 7 | **VALIDATION-PLANES-07** Require a block kind: a table | section(..., {content: table({columns})}) makes the structure plane require a table block of that shape inside the section. | yes | &#10003; covered — tests/fixtures/validation/10-table-leaf-columns-minrows.ts, tests/fixtures/validation/10b-table-missing-column.ts, tests/fixtures/ |
| 8 | **VALIDATION-PLANES-08** Require a list of checkboxes | list({everyItem:'checkbox', minItems}) requires a list block and constrains each item, reporting offenders at their own line. | yes | &#10003; covered — tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts, tests/fixtures/validation/12a-non-checkbox-list-item.ts, tests/fixtur |
| 9 | **VALIDATION-PLANES-09** Require a fenced code block in a language | code({lang}) requires a fenced block and pins its language, separating the structural kind-gate from the content check. | yes | &#10003; covered — tests/fixtures/validation/13-code-leaf-lang.ts, tests/fixtures/validation/13a-code-wrong-lang.ts |
| 10 | **VALIDATION-PLANES-10** Cross into content: a one-field frontmatter schema | contract({frontmatter: z.object({...})}) runs Zod over the parsed frontmatter, line-mapping each issue to its key. | yes | &#10003; covered — tests/fixtures/validation/07-frontmatter-only-zod.ts |
| 11 | **VALIDATION-PLANES-11** Frontmatter enum, format, and bounds | Zod enum/date/min refinements over frontmatter surface as positioned frontmatter-plane findings. | yes | &#10003; covered — tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.ts |
| 12 | **VALIDATION-PLANES-12** Typed table columns with a per-row constraint | table({columns, cells, minRows}) types each named column with Zod and flags a bad cell at that row's source line. | yes | &#10003; covered — tests/fixtures/validation/11-typed-cells-enum-pattern.ts, tests/fixtures/validation/11a-cell-enum-violation.ts |
| 13 | **VALIDATION-PLANES-13** Bound a paragraph's word count | maxWords(n) constrains a section's prose, emitting content/max-words at the paragraph's line when exceeded. | yes | &#10003; covered — tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.ts, tests/fixtures/validation/09a-maxwords-exceeded.ts |
| 14 | **VALIDATION-PLANES-14** A custom node rule with its own level | rule(id, fn) attached via SectionOpts.rules runs on its bound section node and mints a finding at a level it chooses. | yes | &#10003; covered — tests/fixtures/validation/17-node-level-custom-rule.ts, tests/fixtures/validation/17a-node-rule-violation-with-pos.ts |
| 15 | **VALIDATION-PLANES-15** A cross-cutting docRule over the whole doc | docRule(id, fn) sees the typed Doc (frontmatter and body together) to enforce relationships no single plane can. | yes | &#10003; covered — tests/fixtures/validation/16-cross-plane-docrule.ts, tests/fixtures/validation/16a-docrule-violation.ts, src/core/validate.test.ts |
| 16 | **VALIDATION-PLANES-16** All three planes in one deterministic order | One validate() merges frontmatter, structure, content, and rule findings and sorts them by line, then col, then plane. | yes | &#10003; covered — src/core/validate.test.ts, tests/fixtures/validation/08a-both-planes-fail-merged.ts |
| 17 | **VALIDATION-PLANES-17** The same checks in code (TS-API parity) | Library predicate builders give a combinator-authored contract the same text checks the YAML compiles to. | on impl | &#128679; planned — C-0009 / D-0011 · seed `tests/fixtures/validation/17-node-level-custom-rule.ts` |

**Sketches**

**VALIDATION-PLANES-01 — Parse markdown into a DocTree**  
_parse(md) returns the raw DocTree of frontmatter, sections, and positions before any contract exists._

```ts
import { parse } from "markdown-contract";

const tree = parse("---\nid: T-1\n---\n## Summary\n\nShips today.\n");
tree.frontmatter.data;        // { id: "T-1" }
tree.root.sections[0].name;   // "Summary"
tree.root.sections[0].pos;    // { line: 4, col: 1 }
tree.root.sections[0].blocks; // [{ kind: "paragraph", text: "Ships today." }]
```
`surfaces:` parse(); DocTree.frontmatter/root/mdast; SectionNode.name/pos/blocks

**VALIDATION-PLANES-02 — The smallest contract: one required section** · _builds on VALIDATION-PLANES-01_  
_contract({body: sections([section(...)])}).validate(src) emits a single structure-plane Finding for a missing section._

```ts
import { contract, sections, section } from "markdown-contract";

const c = contract({ body: sections({}, [section("Summary")]) });
const { findings } = c.validate("## Overview\n", { path: "doc.md" });
// findings[0] = { id: "structure/section-missing", level: "error",
//   path: "doc.md", message: "required section ‘Summary’ is missing" }
```
`surfaces:` contract(); sections(); section(); Contract.validate(); Finding {id,level,path,message}

**VALIDATION-PLANES-03 — Constrain section order** · _builds on VALIDATION-PLANES-02_  
_sections({order:'strict'}) makes out-of-order headings a positioned structure/section-order finding._

```ts
const c = contract({ body: sections({ order: "strict" }, [
  section("Summary"),
  section("Details"),
]) });
c.validate("## Details\n\n## Summary\n", { path: "doc.md" }).findings;
// [{ id: "structure/section-order", level: "error", pos: { line: 3 }, ... }]
```
`surfaces:` sections() LevelOpts.order; structure/section-order; Finding.pos

**VALIDATION-PLANES-04 — Make a section optional** · _builds on VALIDATION-PLANES-03_  
_optional(section(...)) lets a slot be absent without a finding while the rest of the order still holds._

```ts
import { optional } from "markdown-contract";

const c = contract({ body: sections({ order: "strict" }, [
  section("Summary"),
  optional(section("Notes")),  // may be absent
  section("Details"),
]) });
// "Summary" then "Details" (no "Notes") validates clean
```
`surfaces:` optional(); OptionalSpec; strict order with a skippable slot

**VALIDATION-PLANES-05 — Allow interchangeable headings with oneOf** · _builds on VALIDATION-PLANES-03_  
_oneOf([...]) accepts any one of several spellings at a single position as one logical slot._

```ts
import { oneOf } from "markdown-contract";

const c = contract({ body: sections({ order: "strict" }, [
  oneOf(["Summary", "Overview"]),  // either heading fills the slot
  section("Details"),
]) });
// "## Overview" then "## Details" validates clean
```
`surfaces:` oneOf(); OneOfSpec; one slot, multiple accepted names

**VALIDATION-PLANES-06 — Admit unknown sections with a bounded gap** · _builds on VALIDATION-PLANES-03_  
_gap({max}) permits a counted window of unrecognized sections between required ones, flagging overflow as structure/gap-count._

```ts
import { gap } from "markdown-contract";

const c = contract({ body: sections({ order: "strict" }, [
  section("Summary"),
  gap({ max: 2 }),     // up to 2 unknown sections here
  section("Decision"),
]) });
// 3+ unknown sections between them → structure/gap-count
```
`surfaces:` gap(); GapSpec min/max; structure/gap-count; doc.body.unknown partition

**VALIDATION-PLANES-07 — Require a block kind: a table** · _builds on VALIDATION-PLANES-02_  
_section(..., {content: table({columns})}) makes the structure plane require a table block of that shape inside the section._

```ts
import { table } from "markdown-contract";

const c = contract({ body: sections({}, [
  section("Changes", { content: table({ columns: ["File", "Kind"] }) }),
]) });
// "Changes" with no table → structure/block-missing
// a block that is not a table → structure/block-kind
```
`surfaces:` table() content leaf; SectionOpts.content; structure/block-missing; structure/block-kind

**VALIDATION-PLANES-08 — Require a list of checkboxes** · _builds on VALIDATION-PLANES-07_  
_list({everyItem:'checkbox', minItems}) requires a list block and constrains each item, reporting offenders at their own line._

```ts
import { list } from "markdown-contract";

const c = contract({ body: sections({}, [
  section("Acceptance criteria", {
    content: list({ everyItem: "checkbox", minItems: 1 }),
  }),
]) });
// a plain (non-checkbox) bullet → a content finding at that item's line
```
`surfaces:` list() leaf; everyItem 'checkbox'; minItems; per-item content finding

**VALIDATION-PLANES-09 — Require a fenced code block in a language** · _builds on VALIDATION-PLANES-07_  
_code({lang}) requires a fenced block and pins its language, separating the structural kind-gate from the content check._

````ts
import { code } from "markdown-contract";

const c = contract({ body: sections({}, [
  section("Example", { content: code({ lang: "ts" }) }),
]) });
// no fenced block → structure/block-missing
// a ```js block where ```ts is required → content finding
````
`surfaces:` code() leaf; lang pin; structure (kind-gate) vs content (lang) split

**VALIDATION-PLANES-10 — Cross into content: a one-field frontmatter schema** · _builds on VALIDATION-PLANES-02_  
_contract({frontmatter: z.object({...})}) runs Zod over the parsed frontmatter, line-mapping each issue to its key._

```ts
import { z } from "zod";

const c = contract({
  frontmatter: z.object({ id: z.string() }),
  body: sections({}, [section("Summary")]),
});
// frontmatter missing `id` → frontmatter/required,
//   pos line resolved via tree.lineForPath(["id"])
```
`surfaces:` ContractDef.frontmatter (Zod); frontmatter/required; DocTree.lineForPath

**VALIDATION-PLANES-11 — Frontmatter enum, format, and bounds** · _builds on VALIDATION-PLANES-10_  
_Zod enum/date/min refinements over frontmatter surface as positioned frontmatter-plane findings._

```ts
const c = contract({
  frontmatter: z.strictObject({
    id: z.string().min(1),
    status: z.enum(["open", "closed"]),
    created: z.string().date(),
  }),
});
// status: "bogus" → frontmatter/enum at the status line
// an unexpected key → frontmatter/unknown-key (strictObject)
```
`surfaces:` z.enum/.date/.min; z.strictObject; frontmatter/enum; frontmatter/unknown-key

**VALIDATION-PLANES-12 — Typed table columns with a per-row constraint** · _builds on VALIDATION-PLANES-07_  
_table({columns, cells, minRows}) types each named column with Zod and flags a bad cell at that row's source line._

```ts
const c = contract({ body: sections({}, [
  section("Changes", { content: table({
    columns: ["File", "Kind"],
    cells: { Kind: z.enum(["add", "modify", "delete"]) },
    minRows: 1,
  }) }),
]) });
// a row whose Kind is "tweak" → content finding at that row's line
```
`surfaces:` table() cells/minRows; per-column Zod; row-pinned content finding

**VALIDATION-PLANES-13 — Bound a paragraph's word count** · _builds on VALIDATION-PLANES-02_  
_maxWords(n) constrains a section's prose, emitting content/max-words at the paragraph's line when exceeded._

```ts
import { maxWords } from "markdown-contract";

const c = contract({ body: sections({}, [
  section("Summary", { content: maxWords(25) }),
]) });
// a 40-word Summary paragraph → content/max-words at its line
```
`surfaces:` maxWords() leaf; content/max-words; paragraph-pinned finding

**VALIDATION-PLANES-14 — A custom node rule with its own level** · _builds on VALIDATION-PLANES-02_  
_rule(id, fn) attached via SectionOpts.rules runs on its bound section node and mints a finding at a level it chooses._

```ts
import { rule } from "markdown-contract";

const c = contract({ body: sections({}, [
  section("Goal", { rules: [
    rule("goal/non-empty", (node, ctx) =>
      node.blocks.length ? []
        : [ctx.finding({ id: "goal/non-empty", level: "warn",
            message: "Goal has no body", pos: node.pos })]),
  ] }),
]) });
// (Finding.fix is an optional descriptor on the finding shape for repair tools)
```
`surfaces:` rule(); SectionOpts.rules; ctx.finding level/pos; Finding.fix (optional)

**VALIDATION-PLANES-15 — A cross-cutting docRule over the whole doc** · _builds on VALIDATION-PLANES-14_  
_docRule(id, fn) sees the typed Doc (frontmatter and body together) to enforce relationships no single plane can._

```ts
import { docRule } from "markdown-contract";

const c = contract({
  frontmatter: z.object({ status: z.enum(["open", "closed"]) }),
  body: sections({}, [section("Goal")]),
  rules: [
    docRule("task/closed-needs-note", (doc, ctx) =>
      doc.frontmatter.status === "closed" && !doc.body.section("Completion")
        ? [ctx.finding({ id: "task/closed-needs-note",
            message: "closed tasks need a Completion section" })] : []),
  ],
});
```
`surfaces:` docRule(); ContractDef.rules; Doc.frontmatter + body.section() in one rule

**VALIDATION-PLANES-16 — All three planes in one deterministic order** · _builds on VALIDATION-PLANES-15_  
_One validate() merges frontmatter, structure, content, and rule findings and sorts them by line, then col, then plane._

```ts
const { findings } = c.validate(src, { path: "doc.md" });
// sorted by line, then col, then plane:
// [ { id: "doc/always",       level: "error" },              // no pos → first
//   { id: "frontmatter/enum", pos: { line: 3 } },
//   { id: "structure/section-order", pos: { line: 6 } },
//   { id: "content/max-words",       pos: { line: 9 } } ]
```
`surfaces:` Contract.validate(); ValidationResult.findings; deterministic line→col→plane sort

**VALIDATION-PLANES-17 — The same checks in code (TS-API parity)** · _builds on VALIDATION-PLANES-16_  &#128679; PLANNED  
_Library predicate builders give a combinator-authored contract the same text checks the YAML compiles to._

```ts
import { contract, sections, section, requires, forbids } from "markdown-contract";
// (planned) predicate builders — the same checks the requires:/forbids: YAML compiles to
const c = contract({
  body: sections({}, [
    section("Output contract", { rules: [requires([{ pattern: "DONE pr=" }])] }),
  ]),
  rules: [forbids([{ pattern: "}scripts/", normalize: false }])],   // document-level
});
// same text/requires + text/forbids findings as the YAML form
```
`surfaces:` TS-API parity: library-supplied requires()/forbids()/textRule() builders compiling to rule/docRule (exact API named at implementation)

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery. Seed (hand-written): `tests/fixtures/validation/17-node-level-custom-rule.ts`.


### 5. Consume as Typed Data: Reading the Document as a Model — `consume-as-data`

The payoff and the inverse of checking — the same contract that validated the document hands it back as a typed, navigable Doc. Examples use contract.read(src,{path}) (returns a Doc, throws ContractError on error-level findings) versus contract.validate (findings plus doc and tree), then walk the consumption model: typed Doc.frontmatter; dual-key section access (doc.body.summary and doc.body.section('Summary')); SectionView.text('prose'|'all'), .tables/.table, .lists, .anchors, nested .sections; TableView iterating typed rows with .column(name)/.find(pred)/.rowPos(i); doc.byAnchor('id'); and doc.body.unknown for sections outside the contract. The throughline: consumption code stays in sync with validation because it is the same contract.

**Additive ladder.** Start with read() and pull one typed frontmatter field — the 'no separate types file' aha. Read one section's prose two ways (dual-key). Iterate a TableView's typed rows, then .column/.find/.rowPos for targeted access. Add doc.byAnchor lookups and nested .sections traversal, then doc.body.unknown for tolerated extras. Contrast validate (collect all findings, never throws) with read (typed Doc or ContractError) on the same document. End with a small end-to-end program that reads a real document into typed data and does something with it. Each example consumes one more facet of the same Doc.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **CONSUME-AS-DATA-01** Open the read() door for typed frontmatter | contract.read returns a typed Doc whose frontmatter fields you pull with no separate types file. | yes | &#10003; covered — tests/fixtures/consumption/01-read-the-model-door.ts, tests/fixtures/consumption/02-validate-doc-and-tree.ts, src/core/validate.te |
| 2 | **CONSUME-AS-DATA-02** Read one section's prose two ways | The same SectionView is reachable by camelCase key and by the exact .section(name) accessor. | yes | &#10003; covered — tests/fixtures/consumption/03-dual-key-section-access.ts, src/core/model.test.ts |
| 3 | **CONSUME-AS-DATA-03** Walk a SectionView's content surface | A SectionView exposes name, pos, anchors, text(scope), tables/table and lists, with absent optionals reading as undefined. | yes | &#10003; covered — tests/fixtures/consumption/04-sectionview-content.ts, src/core/model.test.ts |
| 4 | **CONSUME-AS-DATA-04** Iterate a TableView's typed rows | A section whose sole content is a table promotes to a TableView you iterate as typed rows. | yes | &#10003; covered — tests/fixtures/consumption/05-tableview-typed-rows.ts, src/core/model.test.ts |
| 5 | **CONSUME-AS-DATA-05** Target rows with column / find / rowPos | TableView offers column(name), find(pred), and rowPos(i) for column slices, predicate lookups, and per-row source positions. | yes | &#10003; covered — tests/fixtures/consumption/05-tableview-typed-rows.ts, src/core/model.test.ts |
| 6 | **CONSUME-AS-DATA-06** Name two tables in one section | A section's content record yields several independently-named TableViews, each its own typed view. | yes | &#10003; covered — tests/fixtures/consumption/06-named-tables-content-record.ts |
| 7 | **CONSUME-AS-DATA-07** Look blocks up by anchor | doc.byAnchor(id) and section-scoped byAnchor resolve any ^anchor to a kind-discriminated BlockView, declared or not. | yes | &#10003; covered — tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts, src/core/model.test.ts |
| 8 | **CONSUME-AS-DATA-08** Traverse nested subsections | SectionView.sections is itself a dual-key group of the nested H3 subsections. | yes | &#10003; covered — tests/fixtures/consumption/08-nested-subsections.ts, src/core/model.test.ts |
| 9 | **CONSUME-AS-DATA-09** Collect tolerated extra sections | Sections outside the contract (via gap()/allowUnknown) partition into doc.body.unknown as a positional SectionView[]. | yes | &#10003; covered — tests/fixtures/consumption/09-unknown-sections.ts, src/core/model.test.ts |
| 10 | **CONSUME-AS-DATA-10** Contrast validate() with read() | validate() returns {findings, doc, tree} and never throws, while read() hands back a typed Doc or throws ContractError on error-level findings. | yes | &#10003; covered — src/core/validate.test.ts, tests/fixtures/consumption/02-validate-doc-and-tree.ts, tests/fixtures/consumption/10-contracterror-doo |
| 11 | **CONSUME-AS-DATA-11** Read a real task into typed data | One contract reads a live Task end-to-end — frontmatter, a TableView, a list, and absent optionals — then does work with the typed result. | yes | &#10003; covered — tests/fixtures/consumption/11-real-task-consumed.ts |

**Sketches**

**CONSUME-AS-DATA-01 — Open the read() door for typed frontmatter**  
_contract.read returns a typed Doc whose frontmatter fields you pull with no separate types file._

```ts
import { contract, sections, section } from "markdown-contract";
import { z } from "zod";

const c = contract({
  frontmatter: z.object({ id: z.string(), status: z.string() }).strict(),
  body: sections({ allowUnknown: true }, [section("Summary")]),
});

const doc = c.read(src, { path: "notes/note.md" }); // Doc, or throws ContractError
console.log(doc.frontmatter.id); // typed from the same contract that validated
```
`surfaces:` contract(), contract.read(src,{path}), Doc.frontmatter typed from the frontmatter Zod schema

**CONSUME-AS-DATA-02 — Read one section's prose two ways** · _builds on CONSUME-AS-DATA-01_  
_The same SectionView is reachable by camelCase key and by the exact .section(name) accessor._

```ts
const doc = c.read(src, { path: "notes/note.md" });

// Dual-key: dotted camelCase field...
const a = doc.body.summary.text();
// ...and the exact-heading accessor resolve the same SectionView.
const b = doc.body.section("Summary").text();

console.log(a === b); // true — one view, two keys
```
`surfaces:` Doc.body dual-key access (doc.body.summary and doc.body.section("Summary")), SectionView.text("prose")

**CONSUME-AS-DATA-03 — Walk a SectionView's content surface** · _builds on CONSUME-AS-DATA-02_  
_A SectionView exposes name, pos, anchors, text(scope), tables/table and lists, with absent optionals reading as undefined._

```ts
const s = doc.body.summary;
s.name;            // "Summary"
s.pos;             // { line: 1, col: 1 } — heading SourcePos
s.anchors;         // ["summary"] — its ^block-ids
s.text("all");     // prose + block text flattened
s.tables;          // TableView[]  (s.table for the sole one)
s.lists;           // ListView[]
doc.body.why?.text(); // undefined — absent optional section short-circuits
```
`surfaces:` SectionView.name/.pos/.anchors, .text("prose"\|"all"), .tables/.table, .lists, absent-optional reads

**CONSUME-AS-DATA-04 — Iterate a TableView's typed rows** · _builds on CONSUME-AS-DATA-03_  
_A section whose sole content is a table promotes to a TableView you iterate as typed rows._

```ts
const c = contract({ body: sections({}, [
  section("Files", { content: table({
    columns: ["File", "Kind", "Location"],
    cells: { Kind: z.enum(["add", "modify", "delete"]) },
  }) }),
])});

const files = c.read(src, { path: "task.md" }).body.files; // promoted TableView
for (const row of files) console.log(row.File, row.Kind);  // row.Kind is the enum union
console.log(files.rowCount, files.columns);
```
`surfaces:` section() content: table(), TableView promotion, iteration over typed rows, .rowCount, .columns

**CONSUME-AS-DATA-05 — Target rows with column / find / rowPos** · _builds on CONSUME-AS-DATA-04_  
_TableView offers column(name), find(pred), and rowPos(i) for column slices, predicate lookups, and per-row source positions._

```ts
const files = doc.body.files;
files.column("File");                       // ["grammar.ts", "leaves.ts", "legacy.ts"]
files.find(r => r.Kind === "delete")?.File; // "legacy.ts" — typed predicate
files.find((_r, i) => i === 0)?.File;       // "grammar.ts" — index available too
files.rowPos(2);                            // { line: 7, col: 1 } — that row's SourcePos
```
`surfaces:` TableView.column(name), .find(pred) with row+index, .rowPos(i) returning SourcePos

**CONSUME-AS-DATA-06 — Name two tables in one section** · _builds on CONSUME-AS-DATA-05_  
_A section's content record yields several independently-named TableViews, each its own typed view._

```ts
const c = contract({ body: sections({}, [
  section("Decision", { content: {
    components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
    risks: table({ anchor: "risks", columns: ["Risk", "Mitigation"] }),
  } }),
])});

const d = c.read(src, { path: "README.md" }).body.decision;
d.components.column("Component"); // ["projection", "grammar"]
d.risks.find(r => r.Risk.includes("gfm"))?.Mitigation; // "pin in spike S6"
```
`surfaces:` section() content record of named table() leaves, per-field TableView access, .column/.find

**CONSUME-AS-DATA-07 — Look blocks up by anchor** · _builds on CONSUME-AS-DATA-06_  
_doc.byAnchor(id) and section-scoped byAnchor resolve any ^anchor to a kind-discriminated BlockView, declared or not._

```ts
const doc = c.read(src, { path: "README.md" });

const extra = doc.byAnchor("extra");      // doc-wide; an UNdeclared ^extra table
if (extra?.kind === "table") extra.rows[1].Option; // narrow on .kind, then read

doc.byAnchor("components")?.kind;          // "table" — declared anchors resolve too
doc.body.decision.byAnchor("missing");     // undefined — scoped to one section
```
`surfaces:` doc.byAnchor(id) doc-wide, SectionView.byAnchor(id) scoped, BlockView .kind discriminant + narrowing

**CONSUME-AS-DATA-08 — Traverse nested subsections** · _builds on CONSUME-AS-DATA-03_  
_SectionView.sections is itself a dual-key group of the nested H3 subsections._

```ts
const c = contract({ body: sections({ allowUnknown: true }, [
  optional(section("Post-mortem", { children: sections({ order: "strict" }, [
    section("Acceptance criteria coverage"),
    section("What worked"),
  ]) })),
])});

const pm = c.read(src, { path: "T-AB12.md" }).body.postMortem;
pm.sections.whatWorked.text();              // camelCase key
pm.sections.section("What worked").text();  // exact-heading accessor — same view
```
`surfaces:` section() children: sections(), nested SectionView.sections dual-key group, optional()

**CONSUME-AS-DATA-09 — Collect tolerated extra sections** · _builds on CONSUME-AS-DATA-02_  
_Sections outside the contract (via gap()/allowUnknown) partition into doc.body.unknown as a positional SectionView[]._

```ts
const c = contract({ body: sections({ order: "strict" }, [
  section("Title"), section("Overview"), section("Status"), gap(),
])});

const doc = c.read(src, { path: "status.md" });
doc.body.status.text();                    // declared section, typed key
doc.body.unknown.length;                   // 1 — e.g. an un-modeled "## Risks"
doc.body.unknown.map(s => s.name);         // ["Risks"] — heading is the handle
```
`surfaces:` gap(), sections order:"strict", doc.body.unknown SectionView[] read by index/iteration/.name

**CONSUME-AS-DATA-10 — Contrast validate() with read()** · _builds on CONSUME-AS-DATA-01_  
_validate() returns {findings, doc, tree} and never throws, while read() hands back a typed Doc or throws ContractError on error-level findings._

```ts
// Collect everything, never throw:
const { findings, doc, tree } = c.validate(src, { path: "decision.md" });
findings.forEach(f => console.log(f.level, f.path, f.message));
if (doc) doc.frontmatter.id; // doc present only when valid

// Or take the typed door and let errors stop you:
try { const d = c.read(src, { path: "decision.md" }); }
catch (e) { /* ContractError carries the error-level findings */ }
```
`surfaces:` contract.validate(src,{path}) → {findings, doc, tree}, Finding.level/.path/.message, contract.read + ContractError

**CONSUME-AS-DATA-11 — Read a real task into typed data** · _builds on CONSUME-AS-DATA-10_  
_One contract reads a live Task end-to-end — frontmatter, a TableView, a list, and absent optionals — then does work with the typed result._

```ts
const doc = TaskContract.read(src, { path: "docs/planning/tasks/T-AB12.md" });

const { id, status } = doc.frontmatter;          // typed
const changed = [...doc.body.filesToTouch]        // promoted TableView
  .filter(r => r.Kind !== "delete").map(r => r.Location);
const acs = doc.body.acceptanceCriteria.lists[0].items.length;
const worked = doc.body.postMortem !== undefined; // absent on an open task

console.log(`${id} [${status}] touches ${changed.length} files, ${acs} ACs, worked=${worked}`);
```
`surfaces:` contract.read end-to-end, Doc.frontmatter, promoted TableView iteration, SectionView.lists, absent-optional postMortem


### 6. Dialect: Anchors, Wikilinks, and Vault References — `dialect`

The dialect layered on GitHub-flavored markdown, recognized during the single parse. Examples cover caret block-id anchors (^block-id) binding a block or section heading and resolving via doc.byAnchor, and the Obsidian-style reference family: wikilinks [[page]], transclusions ![[page]], heading and anchor fragments [[page#heading]] and [[page#^anchor]], and aliases [[page|alias]] — all extractable via extractVaultRefs. This enables link-graph and referential-integrity use cases over a vault of interlinked documents, the applied home for Obsidian/PKM readers and for note-type contracts (daily-notes, references, records).

**Additive ladder.** Open with a single ^anchor on a block and a byAnchor lookup that resolves it. Anchor a section heading next. Introduce wikilinks: a bare [[page]], then [[page|alias]], then #heading and #^anchor fragments, then ![[page]] transclusions. Build to extractVaultRefs harvesting every reference from a document, then across a directory for a reference inventory. Add a contract rule that validates the dialect (flag a link to a missing page or an anchor resolving nowhere). Finish by combining extractVaultRefs with a cross-document docRule to validate every wikilink target exists across a vault. Each example moves from extract, to resolve, to validate, to vault-scale.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **DIALECT-01** Anchor a block, resolve it with byAnchor | A caret block-id (^id) terminating a block binds it for doc.byAnchor lookup. | yes | &#10003; covered — tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts, src/core/model.test.ts |
| 2 | **DIALECT-02** Anchor a section, read it from .anchors | A standalone ^id under a heading binds at section level and surfaces via SectionView.anchors (not byAnchor). | yes · add &rarr; [[B-DANF-dialect-anchor-fragment-edges]] | &#9680; partial — src/core/model.test.ts, src/core/projection.test.ts, tests/fixtures/consumption/04-sectionview-content.ts |
| 3 | **DIALECT-03** Extract a bare wikilink | extractVaultRefs recognizes a bare [[page]] and returns its target. | yes | &#10003; covered — src/core/dialect/wikilinks.test.ts |
| 4 | **DIALECT-04** Read a wikilink alias | A [[page\|alias]] splits into target plus the display alias. | yes | &#10003; covered — src/core/dialect/wikilinks.test.ts |
| 5 | **DIALECT-05** Read heading and anchor fragments | A #heading or #^anchor fragment is parsed out as VaultRef.fragment. | yes · add &rarr; [[B-DANF-dialect-anchor-fragment-edges]] | &#9680; partial — src/core/dialect/wikilinks.test.ts, src/core/projection.test.ts |
| 6 | **DIALECT-06** Recognize a transclusion | ![[page]] is recognized as a transclusion via VaultRef.kind. | yes | &#10003; covered — src/core/dialect/wikilinks.test.ts |
| 7 | **DIALECT-07** Harvest every reference in a document | extractVaultRefs over a document's text returns every wikilink and transclusion in order. | yes | &#10003; covered — src/core/dialect/wikilinks.test.ts, src/core/projection.test.ts |
| 8 | **DIALECT-08** Build a vault reference inventory | Running extractVaultRefs across a directory yields a from→to link edge list for the whole vault. | no | &#10007; none — src/core/dialect/wikilinks.test.ts |
| 9 | **DIALECT-09** Require an anchor with a contract | A declared section anchor emits structure/anchor-missing when no matching ^id resolves. | yes | &#10003; covered — tests/fixtures/validation/09b-anchor-missing.ts, tests/fixtures/validation/09b-anchor-missing.contract.yaml |
| 10 | **DIALECT-10** Flag a dead anchor with a docRule | A docRule pairs extractVaultRefs with byAnchor to flag a #^anchor fragment that resolves nowhere in the same doc. | yes · add &rarr; [[B-DREF-dialect-referential-integrity]] | &#10007; none |
| 11 | **DIALECT-11** Validate every wikilink across a vault | A cross-document docRule checks each wikilink target against the vault's page set under runCorpus. | yes · add &rarr; [[B-DREF-dialect-referential-integrity]] | &#10007; none |

**Sketches**

**DIALECT-01 — Anchor a block, resolve it with byAnchor**  
_A caret block-id (^id) terminating a block binds it for doc.byAnchor lookup._

```text
<!-- db.md -->
## Decision
| Choice | Owner |
| ------ | ----- |
| SQLite | Sam   |
^db-choice

// consume
const doc = c.read(src, { path: "db.md" });
doc.byAnchor("db-choice")?.kind;   // "table"
```
`surfaces:` ^block-id dialect (anchors.ts); Doc.byAnchor; BlockView.kind; contract.read

**DIALECT-02 — Anchor a section, read it from .anchors** · _builds on DIALECT-01_  
_A standalone ^id under a heading binds at section level and surfaces via SectionView.anchors (not byAnchor)._

```text
<!-- release.md -->
## Overview
^v2-overview

Ships the parser rewrite.

// consume
doc.body.section("Overview").anchors;  // ["v2-overview"]
doc.byAnchor("v2-overview");            // undefined — section ids live on .anchors
```
`surfaces:` SectionNode.anchors; SectionView.anchors; Doc.byAnchor (block-scoped)

**DIALECT-03 — Extract a bare wikilink** · _builds on DIALECT-01_  
_extractVaultRefs recognizes a bare [[page]] and returns its target._

```ts
import { extractVaultRefs } from "markdown-contract";

extractVaultRefs("See [[Project Atlas]] for context.");
// → [{ kind: "wikilink", target: "Project Atlas",
//      raw: "[[Project Atlas]]" }]
```
`surfaces:` extractVaultRefs; VaultRef.kind/target/raw (wikilinks.ts)

**DIALECT-04 — Read a wikilink alias** · _builds on DIALECT-03_  
_A [[page\|alias]] splits into target plus the display alias._

```ts
extractVaultRefs("Owned by [[People/Sam Rivera|Sam]].");
// → [{ kind: "wikilink", target: "People/Sam Rivera",
//      alias: "Sam", raw: "[[People/Sam Rivera|Sam]]" }]
```
`surfaces:` extractVaultRefs; VaultRef.alias

**DIALECT-05 — Read heading and anchor fragments** · _builds on DIALECT-03_  
_A #heading or #^anchor fragment is parsed out as VaultRef.fragment._

```ts
extractVaultRefs("[[Spec#Goals]] then [[Spec#^db-choice]]");
// → [{ target: "Spec", fragment: "Goals",  kind: "wikilink" },
//    { target: "Spec", fragment: "^db-choice", kind: "wikilink" }]
```
`surfaces:` extractVaultRefs; VaultRef.fragment (heading and ^anchor forms)

**DIALECT-06 — Recognize a transclusion** · _builds on DIALECT-03_  
_![[page]] is recognized as a transclusion via VaultRef.kind._

```ts
extractVaultRefs("![[Daily/2026-06-28]]");
// → [{ kind: "transclusion", target: "Daily/2026-06-28",
//      raw: "![[Daily/2026-06-28]]" }]
```
`surfaces:` extractVaultRefs; VaultRef.kind === "transclusion"

**DIALECT-07 — Harvest every reference in a document** · _builds on DIALECT-06_  
_extractVaultRefs over a document's text returns every wikilink and transclusion in order._

```ts
import { extractVaultRefs } from "markdown-contract";

const refs = extractVaultRefs(src);                 // all [[…]] / ![[…]]
const outgoing = [...new Set(refs.map(r => r.target))];
// outgoing = distinct pages this note links to
```
`surfaces:` extractVaultRefs (whole-document harvest); VaultRef[]

**DIALECT-08 — Build a vault reference inventory** · _builds on DIALECT-07_  
_Running extractVaultRefs across a directory yields a from→to link edge list for the whole vault._

```ts
import { readFileSync, globSync } from "node:fs";
import { extractVaultRefs } from "markdown-contract";

const edges = globSync("vault/**/*.md").flatMap(p =>
  extractVaultRefs(readFileSync(p, "utf8"))
    .map(r => ({ from: p, to: r.target }))
);
```
`surfaces:` extractVaultRefs across files; link-graph edge list

**DIALECT-09 — Require an anchor with a contract** · _builds on DIALECT-02_  
_A declared section anchor emits structure/anchor-missing when no matching ^id resolves._

```text
# summary.contract.yaml
mcVersion: 1
kind: contract
body:
  sections:
    - section: Summary
      anchor: summary      # a ^summary must resolve in this section

$ markdown-contract validate --contract summary.contract.yaml --path notes
# error  structure/anchor-missing  section 'Summary' is missing required block-id ^summary
```
`surfaces:` declarative contract section.anchor; structure/anchor-missing rule; validate CLI --contract/--path

**DIALECT-10 — Flag a dead anchor with a docRule** · _builds on DIALECT-09_  
_A docRule pairs extractVaultRefs with byAnchor to flag a #^anchor fragment that resolves nowhere in the same doc._

```ts
import { contract, docRule, sections, section, extractVaultRefs } from "markdown-contract";

const deadAnchor = docRule("dialect/dead-anchor", (doc, ctx) =>
  extractVaultRefs(doc.body.section("Notes").text("all"))
    .filter(r => r.fragment?.startsWith("^") && !doc.byAnchor(r.fragment.slice(1)))
    .map(r => ctx.finding({ id: "dialect/dead-anchor", message: `no block ${r.fragment}` })));

const c = contract({ body: sections({}, [section("Notes", {})]), rules: [deadAnchor] });
```
`surfaces:` docRule; Ctx.finding; extractVaultRefs + Doc.byAnchor referential integrity

**DIALECT-11 — Validate every wikilink across a vault** · _builds on DIALECT-10_  
_A cross-document docRule checks each wikilink target against the vault's page set under runCorpus._

```ts
const pages = new Set(globSync("vault/**/*.md").map(p => basename(p, ".md")));
const missingPage = docRule("dialect/missing-page", (doc, ctx) =>
  extractVaultRefs(doc.body.section("Notes").text("all"))
    .filter(r => !pages.has(r.target.split("/").pop()!))
    .map(r => ctx.finding({ id: "dialect/missing-page", level: "warn", message: `dangling → ${r.target}` })));

const cfg = defineConfig({ rules: [{ include: ["**/*.md"], contract: vaultContract }] });
const { findings, exitCode } = runCorpus(cfg, { cwd: "vault" });
```
`surfaces:` docRule (cross-document); extractVaultRefs; defineConfig/runCorpus over a vault; aggregated findings


### 7. Embed and Automate: the Runner Library and CI Gates — `embed-and-ci`

The reusable runner library plus the operational integration layer — the same engine the CLI wraps, embeddable in-process without shelling out. Examples use defineConfig(config) and runCorpus(config,{cwd,include,exclude}) returning {findings, exitCode} inside scripts, pre-commit hooks, server routes, docs-site builds, and test suites. The integration half wires findings into the places teams gate on: branching on exit codes in CI, --format sarif surfaced as GitHub code-scanning annotations on the exact line, init --check as a pre-merge drift gate, and the deterministic finding order (line, col, plane) keeping baselines and diffs stable.

**Additive ladder.** Start with defineConfig plus a single runCorpus call logging {findings, exitCode} from a script. Drive it with programmatic include/exclude and cwd to scope a subtree, then run it inside a vitest test as a programmatic gate. Pivot to hosts: a CI step relying on the nonzero exit code, then --format json parsed in a script, then --format sarif uploaded to code scanning. Add init --check as a drift gate, then surface findings as editor diagnostics via the positioned Finding model. Each example scales the same checks from one in-process call to a full embedded gate.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **EMBED-AND-CI-01** Run the corpus in-process | Calling runCorpus once with a defineConfig config and reading back {findings, exitCode}. | yes | &#10003; covered — src/cli/index.test.ts; src/declarative/config.test.ts; src/index.test.ts |
| 2 | **EMBED-AND-CI-02** Scope a subtree with cwd and globs | Narrowing a run to part of the tree with runCorpus's cwd plus programmatic include/exclude. | yes | &#10003; covered — src/declarative/config.test.ts |
| 3 | **EMBED-AND-CI-03** Route subtrees with first-match rules | Mapping different globs to different contracts in one config where the first matching rule wins. | yes · add &rarr; [[T-ROUT-runcorpus-first-match-routing]] | &#9680; partial — tests/fixtures/corpus/markdown-contract.config.mjs; src/cli/index.test.ts |
| 4 | **EMBED-AND-CI-04** Gate a vitest suite on findings | Asserting on runCorpus's findings inside a test so corpus drift fails the test run. | yes | &#10003; covered — src/cli/index.test.ts; src/declarative/config.test.ts |
| 5 | **EMBED-AND-CI-05** Fail CI on the exit code | Letting the CLI's nonzero exit on error-level findings fail a CI job with no parsing. | yes | &#9680; partial — src/cli/index.test.ts; src/declarative/config.test.ts |
| 6 | **EMBED-AND-CI-06** Pre-commit gate on staged docs | Scoping a validate run to staged markdown in a git hook so commits with errors are blocked. | no | &#10003; covered — src/declarative/config.test.ts |
| 7 | **EMBED-AND-CI-07** Parse JSON findings in a script | Emitting --format json and processing the stable Finding[] shape downstream. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts |
| 8 | **EMBED-AND-CI-08** Surface findings as code scanning | Producing --format sarif and uploading it so findings annotate the exact line on a PR. | yes | &#10003; covered — src/cli/format.test.ts; src/cli/index.test.ts |
| 9 | **EMBED-AND-CI-09** Drift-gate with init --check | Using init --check to verify a tree still conforms to its inferred config as a pre-merge gate. | yes | &#10003; covered — tests/inference.cli.test.ts |
| 10 | **EMBED-AND-CI-10** Map findings to editor diagnostics | Translating positioned Findings into editor diagnostics via Finding.pos and level. | no | &#10003; covered — src/cli/format.test.ts; src/core/finding.test.ts; src/core/validate.test.ts |
| 11 | **EMBED-AND-CI-11** Snapshot a stable baseline | Relying on the deterministic (line, col, plane) finding order to snapshot a baseline that diffs cleanly. | yes | &#9680; partial — src/core/validate.test.ts |

**Sketches**

**EMBED-AND-CI-01 — Run the corpus in-process**  
_Calling runCorpus once with a defineConfig config and reading back {findings, exitCode}._

```ts
import { contract, sections, defineConfig, runCorpus } from "markdown-contract";

const config = defineConfig({
  rules: [{ include: ["**/*.md"], contract: contract({ body: sections() }) }],
});

const { findings, exitCode } = runCorpus(config, { cwd: "docs" });
console.log(`${findings.length} finding(s); exit ${exitCode}`);
```
`surfaces:` runner: defineConfig, runCorpus; core: contract, sections; the {findings, exitCode} return

**EMBED-AND-CI-02 — Scope a subtree with cwd and globs** · _builds on EMBED-AND-CI-01_  
_Narrowing a run to part of the tree with runCorpus's cwd plus programmatic include/exclude._

```ts
const { findings, exitCode } = runCorpus(config, {
  cwd: "docs/planning",
  include: ["tasks/**/*.md"],
  exclude: ["**/_archive/**"],
});
// include/exclude pre-filter relative to cwd, AND-narrowed before rule matching
```
`surfaces:` runCorpus opts: cwd, include, exclude (the global pre-filter)

**EMBED-AND-CI-03 — Route subtrees with first-match rules** · _builds on EMBED-AND-CI-01_  
_Mapping different globs to different contracts in one config where the first matching rule wins._

```ts
const config = defineConfig({
  rules: [
    { include: ["tasks/**/*.md"], contract: taskContract },
    { include: ["decisions/**/*.md"], contract: decisionContract },
    { include: ["**/*.md"], contract: fallbackContract }, // catch-all, last
  ],
});
const { findings } = runCorpus(config, { cwd: "docs/planning" });
```
`surfaces:` CorpusConfig.rules ordering; first-match routing across multiple contracts

**EMBED-AND-CI-04 — Gate a vitest suite on findings** · _builds on EMBED-AND-CI-01_  
_Asserting on runCorpus's findings inside a test so corpus drift fails the test run._

```ts
import { expect, test } from "vitest";
import { runCorpus } from "markdown-contract";
import config from "./markdown-contract.config.js";

test("planning corpus has no error findings", () => {
  const { findings, exitCode } = runCorpus(config, { cwd: "docs/planning" });
  expect(findings.filter((f) => f.level === "error")).toEqual([]);
  expect(exitCode).toBe(0);
});
```
`surfaces:` runCorpus inside a test; Finding.level filtering; exitCode assertion

**EMBED-AND-CI-05 — Fail CI on the exit code**  
_Letting the CLI's nonzero exit on error-level findings fail a CI job with no parsing._

```yaml
- name: Validate planning corpus
  run: npx markdown-contract validate docs/planning
  # exit 0 clean, 1 on any error-level finding (fails the step), 2 usage/config error
```
`surfaces:` CLI validate; exit-code policy (0/1/2); auto-discovered markdown-contract.yaml

**EMBED-AND-CI-06 — Pre-commit gate on staged docs** · _builds on EMBED-AND-CI-05_  
_Scoping a validate run to staged markdown in a git hook so commits with errors are blocked._

```bash
#!/bin/sh
# .git/hooks/pre-commit
changed=$(git diff --cached --name-only --diff-filter=ACM -- '*.md')
[ -z "$changed" ] && exit 0
npx markdown-contract validate docs --include $(echo "$changed" | sed 's|^docs/||')
# nonzero exit aborts the commit
```
`surfaces:` CLI validate --include; exit code as the hook gate

**EMBED-AND-CI-07 — Parse JSON findings in a script** · _builds on EMBED-AND-CI-05_  
_Emitting --format json and processing the stable Finding[] shape downstream._

```bash
npx markdown-contract validate docs/planning --format json \
  | jq -r '.[] | select(.level=="error") | "\(.path):\(.pos.line) \(.id)"'
# each element is a Finding: { id, level, path, pos:{line,col}, message, fix? }
```
`surfaces:` CLI --format json; formatJson; Finding shape (id, level, path, pos, message)

**EMBED-AND-CI-08 — Surface findings as code scanning** · _builds on EMBED-AND-CI-07_  
_Producing --format sarif and uploading it so findings annotate the exact line on a PR._

```yaml
- name: Validate to SARIF
  run: npx markdown-contract validate docs --format sarif > mc.sarif || true
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mc.sarif
# `|| true` keeps the upload running even when findings set exit 1
```
`surfaces:` CLI --format sarif; formatSarif (SARIF 2.1.0, region.startLine from Finding.pos)

**EMBED-AND-CI-09 — Drift-gate with init --check** · _builds on EMBED-AND-CI-05_  
_Using init --check to verify a tree still conforms to its inferred config as a pre-merge gate._

```bash
# in CI, after checkout:
npx markdown-contract init docs/planning --check
# exit 0: tree still conforms to markdown-contract.yaml
# exit 1: a doc drifted from the inferred shape
# exit 2: no config present to check against
```
`surfaces:` CLI init --check (drift detection); runCorpus over the existing config; exit 0/1/2

**EMBED-AND-CI-10 — Map findings to editor diagnostics** · _builds on EMBED-AND-CI-02_  
_Translating positioned Findings into editor diagnostics via Finding.pos and level._

```ts
const { findings } = runCorpus(config, { cwd: workspaceRoot });
const diagnostics = findings.map((f) => ({
  uri: f.path,
  line: (f.pos?.line ?? 1) - 1, // editors are 0-based; whole-doc findings have no pos
  col: (f.pos?.col ?? 1) - 1,
  severity: f.level, // "error" | "warn" | "report"
  source: f.id,
  message: f.message,
}));
```
`surfaces:` runCorpus findings; Finding.pos {line, col}; level/id/path/message for diagnostics

**EMBED-AND-CI-11 — Snapshot a stable baseline** · _builds on EMBED-AND-CI-04_  
_Relying on the deterministic (line, col, plane) finding order to snapshot a baseline that diffs cleanly._

```ts
const { findings } = runCorpus(config, { cwd: "docs/planning" });
const baseline = findings.map((f) => `${f.path}:${f.pos?.line ?? 0} ${f.id}`);
// order is deterministic (sorted line, then col, then plane), so a committed
// baseline.json only changes when the findings actually change
expect(baseline).toMatchSnapshot();
```
`surfaces:` deterministic finding order (line, col, plane); stable baseline/diff over Finding[]


### 8. Real-World Schemas: Document Templates and Cross-Document Governance — `real-world-schemas`

The capstone where every surface converges on real documents. The applied half turns familiar prose conventions into machine-checked contracts: ADRs (Status/Context/Decision/Consequences), RFCs with a rejected-alternatives section, runbooks with a rollback step and oncall owner, changelogs grouped under Added/Changed/Fixed, postmortems with a timeline table and action items, and prompt-library cards for AI agents. The governance half is the project dogfooding itself: its SDLC planning corpus (tasks, decisions, milestones, drivers, capabilities) under /docs/planning validated against /contracts/*.contract.yaml, with a corpus meta-config routing globs to per-type contracts and docRule() enforcing cross-document invariants — a task's depends_on must resolve, a milestone's members must exist, no decision references a superseded one. These are the full-stack exemplars a reader copies to model their own domain.

**Additive ladder.** Begin with the simplest single template — an ADR checked only for its required sections in order. Layer in frontmatter typing (enum status, required date), then a content leaf (a typed table or required code block inside a named section), then a custom rule (a Decision must reference an alternative). Progress to richer single types (RFC, runbook, postmortem, prompt card). Then scale to a corpus: a two-type config with first-match-wins, frontmatter governance across the tree, the first docRule cross-document check (a dangling depends_on), then the full referential graph (milestone membership, decision supersession). Culminate in the complete self-hosted SDLC corpus validated end to end. Each example adds one document type or one cross-cutting invariant.

| # | Example | Demonstrates | Needs test | Matches existing test? |
|---|---------|--------------|------------|------------------------|
| 1 | **REAL-WORLD-SCHEMAS-01** ADR: require the four sections in order | A single document type whose body grammar pins required H2 sections in strict order. | yes | &#10003; covered — tests/fixtures/validation/05-strict-prefix-gap-tail.ts, tests/fixtures/validation/02-multiple-required-sequence.ts, tests/fixtures |
| 2 | **REAL-WORLD-SCHEMAS-02** Type the ADR frontmatter | Layering frontmatter typing onto the ADR: an enum status and a format-checked required date. | yes | &#10003; covered — tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.ts, src/declarative/schema.test.ts |
| 3 | **REAL-WORLD-SCHEMAS-03** Typed table inside Consequences | A content leaf: a typed table with an enum cell required inside a named section. | yes | &#10003; covered — tests/fixtures/validation/11-typed-cells-enum-pattern.ts, tests/fixtures/validation/11a-cell-enum-violation.ts, tests/fixtures/val |
| 4 | **REAL-WORLD-SCHEMAS-04** Validate one ADR from the CLI | Running a single contract over one document and reading the exit code. | yes | &#10003; covered — src/cli/index.test.ts, src/declarative/config.test.ts, src/cli/format.test.ts |
| 5 | **REAL-WORLD-SCHEMAS-05** Custom rule: Decision must cite an alternative | A node-local rule() emitting a finding when a section's prose lacks a required reference. | yes | &#10003; covered — tests/fixtures/validation/17-node-level-custom-rule.ts, tests/fixtures/validation/17a-node-rule-violation-with-pos.ts |
| 6 | **REAL-WORLD-SCHEMAS-06** RFC with a rejected-alternatives section | A richer single type using recognized-relative order and a mandatory Rejected alternatives section. | yes | &#10003; covered — tests/fixtures/validation/04-recognized-relative-order.ts, tests/fixtures/validation/03-optional-sections.ts, tests/fixtures/valid |
| 7 | **REAL-WORLD-SCHEMAS-07** Runbook with an oncall owner and a rollback checklist | An operational template binding a required owner field to a required Rollback checklist leaf. | yes | &#10003; covered — tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts, tests/fixtures/validation/20-real-task-contract-end-to-end.contract.y |
| 8 | **REAL-WORLD-SCHEMAS-08** Postmortem: timeline table plus action items | Two content leaves in one document: a required timeline table and an action-items checklist. | yes | &#10003; covered — tests/fixtures/validation/10-table-leaf-columns-minrows.ts, tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts, tests/fix |
| 9 | **REAL-WORLD-SCHEMAS-09** Prompt-library card for AI agents | A prompt card pinning a model enum and a fenced code block holding the system prompt. | yes | &#10003; covered — tests/fixtures/validation/13-code-leaf-lang.ts, tests/fixtures/validation/13a-code-wrong-lang.ts, src/declarative/schema.test.ts |
| 10 | **REAL-WORLD-SCHEMAS-10** Corpus config: route two types, first match wins | A meta-config mapping path globs to per-type contracts so a tree validates against the right contract. | yes | &#10003; covered — src/declarative/config.test.ts, src/cli/index.test.ts, tests/fixtures/corpus/markdown-contract.config.mjs |
| 11 | **REAL-WORLD-SCHEMAS-11** Frontmatter governance across the whole tree | A catch-all rule with an exclude that enforces a baseline contract on every remaining document. | yes · add &rarr; [[T-ROUT-runcorpus-first-match-routing]] | &#10007; none — src/declarative/config.test.ts |
| 12 | **REAL-WORLD-SCHEMAS-12** First cross-document check: dangling depends_on | A docRule that flags a task whose depends_on names an id no task defines. | yes · add &rarr; [[B-DRAG-docrule-runcorpus-aggregation]] | &#9680; partial — tests/fixtures/validation/16-cross-plane-docrule.ts, src/cli/index.test.ts |
| 13 | **REAL-WORLD-SCHEMAS-13** Referential graph: membership and supersession | docRules asserting a milestone's members all exist and no entity references a superseded id. | maybe · add &rarr; [[B-DRAG-docrule-runcorpus-aggregation]] | &#9680; partial — tests/fixtures/validation/16-cross-plane-docrule.ts, src/core/finding.test.ts, src/cli/format.test.ts |
| 14 | **REAL-WORLD-SCHEMAS-14** Scaffold and drift-check a corpus with init | Inferring a tight contract from existing docs and re-checking the tree for drift. | yes | &#10003; covered — tests/inference.cli.test.ts |
| 15 | **REAL-WORLD-SCHEMAS-15** Validate the self-hosted SDLC corpus end to end | Running the whole planning tree against its per-type contracts via an auto-discovered config. | yes | &#10003; covered — src/cli/index.test.ts, tests/inference.cli.test.ts |
| 16 | **REAL-WORLD-SCHEMAS-16** Retire an SDLC invariants.yaml prose linter onto a contract | The SDLC plugin's required/forbidden-phrase, required-section and tool-ref linter becomes one declarative contract. | on impl | &#128679; planned — C-0009 / D-0011 |

**Sketches**

**REAL-WORLD-SCHEMAS-01 — ADR: require the four sections in order**  
_A single document type whose body grammar pins required H2 sections in strict order._

```yaml
mcVersion: 1
kind: contract
body:
  order: strict
  allowUnknown: false
  sections:
    - section: Status
    - section: Context
    - section: Decision
    - section: Consequences
```
`surfaces:` declarative YAML contract; body.order: strict; allowUnknown: false; the structure plane over sections

**REAL-WORLD-SCHEMAS-02 — Type the ADR frontmatter** · _builds on REAL-WORLD-SCHEMAS-01_  
_Layering frontmatter typing onto the ADR: an enum status and a format-checked required date._

```yaml
frontmatter:
  strict: true
  fields:
    status:
      enum: [proposed, accepted, superseded, deprecated]
    date:
      type: string
      format: date
# (body: the strict Status/Context/Decision/Consequences sections from 01)
```
`surfaces:` declarative frontmatter.fields; enum + format: date (Zod under the hood); strict: true rejects unknown keys

**REAL-WORLD-SCHEMAS-03 — Typed table inside Consequences** · _builds on REAL-WORLD-SCHEMAS-02_  
_A content leaf: a typed table with an enum cell required inside a named section._

```yaml
    - section: Consequences
      content:
        table:
          columns: [Effect, Kind]
          minRows: 1
          cells:
            Kind:
              enum: [positive, negative, neutral]
```
`surfaces:` content plane: table leaf with columns / minRows / per-cell enum schema; the content plane validates each block's data

**REAL-WORLD-SCHEMAS-04 — Validate one ADR from the CLI** · _builds on REAL-WORLD-SCHEMAS-03_  
_Running a single contract over one document and reading the exit code._

```bash
markdown-contract validate docs/adr/0007-use-postgres.md \
  --contract contracts/adr.contract.yaml --format human
# exit 0 = clean · 1 = error-level findings · 2 = usage/config error
# findings are deterministically ordered by line, then col, then plane
```
`surfaces:` CLI validate; --contract (config-less binding); --format human; exit codes 0/1/2

**REAL-WORLD-SCHEMAS-05 — Custom rule: Decision must cite an alternative** · _builds on REAL-WORLD-SCHEMAS-03_  
_A node-local rule() emitting a finding when a section's prose lacks a required reference._

```ts
import { contract, sections, section, rule } from "markdown-contract";
const adr = contract({ body: sections({ order: "strict" }, [
  section("Decision", { rules: [ rule("adr/cites-alternative", (node, ctx) =>
    /alternativ/i.test(node.blocks.map(b => b.kind === "paragraph" ? b.text : "").join(" "))
      ? []
      : [ctx.finding({ id: "adr/cites-alternative", level: "error",
          message: "Decision must reference an alternative" })]) ] }),
]) });
```
`surfaces:` programmatic contract(); section opts.rules; rule(id, fn) with node.blocks + ctx.finding; the rules plane

**REAL-WORLD-SCHEMAS-06 — RFC with a rejected-alternatives section** · _builds on REAL-WORLD-SCHEMAS-02_  
_A richer single type using recognized-relative order and a mandatory Rejected alternatives section._

```yaml
frontmatter:
  fields:
    status: { enum: [draft, review, final] }
body:
  order: recognized-relative
  allowUnknown: true
  sections:
    - section: Summary
    - section: Motivation
    - section: Detailed design
    - section: Rejected alternatives
    - section: Open questions
      optional: true
```
`surfaces:` body.order: recognized-relative; allowUnknown: true; optional section; enum frontmatter

**REAL-WORLD-SCHEMAS-07 — Runbook with an oncall owner and a rollback checklist** · _builds on REAL-WORLD-SCHEMAS-06_  
_An operational template binding a required owner field to a required Rollback checklist leaf._

```yaml
frontmatter:
  fields:
    oncall: { type: string }
    severity: { enum: [sev1, sev2, sev3] }
body:
  sections:
    - section: Detection
    - section: Mitigation
    - section: Rollback
      content:
        list: { everyItem: checkbox, minItems: 1 }
```
`surfaces:` list content leaf with everyItem: checkbox + minItems; required-field frontmatter; structure + content planes together

**REAL-WORLD-SCHEMAS-08 — Postmortem: timeline table plus action items** · _builds on REAL-WORLD-SCHEMAS-07_  
_Two content leaves in one document: a required timeline table and an action-items checklist._

```yaml
body:
  sections:
    - section: Summary
    - section: Timeline
      content:
        table:
          columns: [Time, Event]
          minRows: 1
    - section: Action items
      content:
        list: { everyItem: checkbox, minItems: 1 }
```
`surfaces:` table leaf (columns/minRows) + list leaf (checkbox) in one body; the content plane over multiple blocks

**REAL-WORLD-SCHEMAS-09 — Prompt-library card for AI agents** · _builds on REAL-WORLD-SCHEMAS-08_  
_A prompt card pinning a model enum and a fenced code block holding the system prompt._

```yaml
frontmatter:
  fields:
    model: { enum: [opus, sonnet, haiku] }
    temperature: { type: number, min: 0, max: 2 }
body:
  sections:
    - section: System prompt
      content:
        code: { lang: md }
    - section: Example output
```
`surfaces:` code content leaf pinned to lang; number frontmatter with min/max; enum field

**REAL-WORLD-SCHEMAS-10 — Corpus config: route two types, first match wins** · _builds on REAL-WORLD-SCHEMAS-06_  
_A meta-config mapping path globs to per-type contracts so a tree validates against the right contract._

```yaml
mcVersion: 1
kind: config
contracts:
  adr: ./contracts/adr.contract.yaml
  rfc: ./contracts/rfc.contract.yaml
rules:
  - include: ["docs/adr/**/*.md"]
    contract: adr
  - include: ["docs/rfc/**/*.md"]
    contract: rfc
```
`surfaces:` declarative kind: config; contracts name map; rules include globs; first-match-wins routing (the runner)

**REAL-WORLD-SCHEMAS-11 — Frontmatter governance across the whole tree** · _builds on REAL-WORLD-SCHEMAS-10_  
_A catch-all rule with an exclude that enforces a baseline contract on every remaining document._

```yaml
rules:
  - include: ["docs/adr/**/*.md"]
    contract: adr
  - include: ["**/*.md"]
    exclude: ["**/README.md", "**/node_modules/**"]
    contract: ./contracts/has-frontmatter.contract.yaml
```
`surfaces:` config rule exclude globs; first-match ordering (specific before catch-all); a baseline frontmatter contract over the tree

**REAL-WORLD-SCHEMAS-12 — First cross-document check: dangling depends_on** · _builds on REAL-WORLD-SCHEMAS-10_  
_A docRule that flags a task whose depends_on names an id no task defines._

```ts
import { contract, sections, section, docRule, runCorpus } from "markdown-contract";
const task = contract({
  frontmatter: z.object({ id: z.string(), depends_on: z.array(z.string()).default([]) }).strict(),
  body: sections({ allowUnknown: true }, [section("Goal")]),
  rules: [ docRule("task/depends-resolve", (doc, ctx) =>
    doc.frontmatter.depends_on.filter(d => !KNOWN_IDS.has(d)).map(d =>
      ctx.finding({ id: "task/depends-resolve", level: "error", message: `unknown dependency ${d}` }))) ],
});
await runCorpus({ rules: [{ include: ["docs/planning/tasks/**/*.md"], contract: task }] }, { cwd: "." });
```
`surfaces:` contract({rules}); docRule(id, (doc, ctx)) reading typed doc.frontmatter; runCorpus aggregating findings + exitCode

**REAL-WORLD-SCHEMAS-13 — Referential graph: membership and supersession** · _builds on REAL-WORLD-SCHEMAS-12_  
_docRules asserting a milestone's members all exist and no entity references a superseded id._

```ts
const milestone = contract({
  frontmatter: z.object({ id: z.string(), members: z.array(z.string()) }).strict(),
  rules: [
    docRule("milestone/members-exist", (doc, ctx) =>
      doc.frontmatter.members.filter(m => !TASK_IDS.has(m)).map(m =>
        ctx.finding({ id: "milestone/members-exist", level: "error", message: `member ${m} has no task` }))),
    docRule("decision/no-superseded-ref", (doc, ctx) =>
      doc.frontmatter.related.filter(r => SUPERSEDED.has(r)).map(r =>
        ctx.finding({ id: "decision/no-superseded-ref", level: "warn", message: `references superseded ${r}` }))),
  ],
});
```
`surfaces:` multiple docRule()s per contract; cross-document referential invariants; mixed error/warn finding levels

**REAL-WORLD-SCHEMAS-14 — Scaffold and drift-check a corpus with init** · _builds on REAL-WORLD-SCHEMAS-10_  
_Inferring a tight contract from existing docs and re-checking the tree for drift._

```bash
markdown-contract init docs/adr --out contracts --dry-run   # preview the inferred contract, write nothing
markdown-contract init docs/adr --out contracts             # write the scaffold + a markdown-contract.yaml router
markdown-contract init docs/adr --check                     # drift detection: nonzero exit if a doc diverged
```
`surfaces:` CLI init; --dry-run; --out; --check (self-check / drift); auto-written router config

**REAL-WORLD-SCHEMAS-15 — Validate the self-hosted SDLC corpus end to end** · _builds on REAL-WORLD-SCHEMAS-13_  
_Running the whole planning tree against its per-type contracts via an auto-discovered config._

```bash
# markdown-contract.yaml routes docs/planning globs to contracts/*.contract.yaml
markdown-contract validate docs/planning --format sarif > findings.sarif
# auto-discovers markdown-contract.yaml; exit 1 if any task's depends_on dangles,
# any milestone member is missing, or any decision references a superseded one
```
`surfaces:` CLI validate over a tree; auto-discovered markdown-contract.yaml; --format sarif; the full structure + content + rules planes from one parse

**REAL-WORLD-SCHEMAS-16 — Retire an SDLC invariants.yaml prose linter onto a contract** · _builds on REAL-WORLD-SCHEMAS-15_  &#128679; PLANNED  
_The SDLC plugin's required/forbidden-phrase, required-section and tool-ref linter becomes one declarative contract._

```yaml
# invariants.yaml (a bespoke SKILL.md linter)  ->  skill.contract.yaml
mcVersion: 1
kind: contract
body:
  forbids:
    - { pattern: "}scripts/", normalize: false }     # forbidden_phrases
  requires:
    - { pattern: "sdlc task close-commit" }          # required_tool_refs (anywhere)
  sections:
    - section: Output contract
      requires:
        - { pattern: "DONE pr=" }                    # required_phrases (section-scoped)
    - section: Notes                                 # required_h2_sections
```
`surfaces:` the SDLC invariants.yaml linter retired onto contracts (DR-0005): required/forbidden phrases + required sections + tool-refs as one declarative contract

> &#128679; **Planned (C-0009 / D-0011)** — the proposed declarative syntax, not yet shipped. Compiles to the engine's existing rule / docRule machinery.


### Test-coverage review and recommended tests

Cross-referenced all **99** examples against the fixture corpus (`tests/fixtures/**`) and the co-located unit tests (`src/**/*.test.ts`):

| Verdict | Count |
|---------|:-----:|
| Covered by an existing fixture/test | 85 |
| Partially covered (related, not exact) | 9 |
| Uncovered | 5 |
| Novel scenario (no existing representation) | 8 |
| **Recommended for a new test** | **10** |

**Recommended new tests** — the test-worthy gaps, grouped into follow-up entities:

| Follow-up | Kind | Priority | Covers | What it pins |
|-----------|------|----------|--------|--------------|
| [[T-ROUT-runcorpus-first-match-routing]] | task | high | DECLARATIVE-YAML-11, EMBED-AND-CI-03, REAL-WORLD-SCHEMAS-11 | Pin first-match-wins rule precedence and per-rule exclude in runCorpus |
| [[B-DRAG-docrule-runcorpus-aggregation]] | backlog | medium | REAL-WORLD-SCHEMAS-12, REAL-WORLD-SCHEMAS-13 | Aggregate docRule findings through runCorpus into exitCode (multi-rule, mixed levels) |
| [[B-DREF-dialect-referential-integrity]] | backlog | medium | DIALECT-10, DIALECT-11 | Dialect referential-integrity docRules: dead in-doc anchors and dangling vault wikilinks |
| [[B-DANF-dialect-anchor-fragment-edges]] | backlog | low | DIALECT-02, DIALECT-05 | Dialect edge cases: section-id byAnchor negative and #^anchor fragment value |
| [[B-IOUT-init-out-placement]] | backlog | low | INFERENCE-INIT-08 | init --out placement of the written scaffold |

**Corrections to apply before the snippets ship** (flagged by the reviewer; tracked in [[T-SITE-bootstrap-docs-website]]):

- `CLI-02`, `CLI-03` use `structure/missing-section`; the real id is `structure/section-missing`.
- `CLI-05`, `CLI-06` use `content/enum` / `structure/unknown-section`; the real ids are `frontmatter/enum` / `frontmatter/unknown-key`.
- `INFERENCE-INIT-05` (`--infer-bounds`): the flag is parsed but **not yet read** in `src/declarative/infer.ts` (min/max/pattern inference is a future phase) — document it as a no-op / planned, not as working behavior.

**Planned features (C-0009 / D-0011).** 9 examples are marked &#128679; *planned* (declarative text constraints — in the Declarative-YAML, in-code, and real-world-schema categories) and are **excluded from the counts above**. Each compiles to the engine's existing `rule` / `docRule` machinery, with `tests/fixtures/validation/17-node-level-custom-rule.ts` as the hand-written seed; when the feature lands ([[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]]) these examples become its fixtures.

## Out of scope

- **Building the website.** Tracked by [[T-SITE-bootstrap-docs-website]].
- **Writing the recommended tests.** Tracked by [[T-ROUT-runcorpus-first-match-routing]]
  and the backlog notes ([[B-DRAG-docrule-runcorpus-aggregation]],
  [[B-DREF-dialect-referential-integrity]], [[B-DANF-dialect-anchor-fragment-edges]],
  [[B-IOUT-init-out-placement]]).
- **The `daemon` / local web-UI surface** ([[D-0010-distribution-single-exec-and-web-ui]]) —
  proposed, not shipped; it earns its own examples once built.
- **The moon adoption / workspace split itself** — [[T-MOON-adopt-moon-monorepo]] and
  [[D-0010-distribution-single-exec-and-web-ui]] own that; this catalog only *targets* the
  monorepo as where the site lands.

## Risks / open questions

- **Sketches are illustrative, not yet regression-checked.** They use real flags/API, but
  five carry flagged corrections (above) and one documents an unimplemented flag. The site
  build should wire artifacts to real CLI/library output so docs stay honest.
- **A few examples straddle categories** — cross-document docRules and dialect referential
  integrity sit between *Real-world schemas* and *Dialect*; placement was the synthesis's
  call. Revisit if the site information-architecture wants otherwise.
- **Should novel behaviors become first-class features?** Some novel examples (vault-wide
  wikilink validation, in-doc dead-anchor checks) are compositions the engine *allows* but
  doesn't ship as fixtures — open question whether to promote any to supported, tested
  features beyond documenting them.
- **Milestone status.** Marked `open/active`: the catalog is delivered in this document, but
  the axis, boundaries, and follow-up split await human review (`need_human_review: true`).
- **Milestone number is a placeholder.** `M-0010` is provisional — to be renumbered once the
  surrounding milestone sequence (including the planned marketing-site milestone) is settled.

## Dependencies

- The **fixture corpus** the review cross-references — [[T-9XB3-test-harness-and-fixtures]]
  and the validation / consumption / inference fixtures under `tests/fixtures/` — is the
  baseline of "what's already tested."
- The **moon monorepo** the site will live in ([[T-MOON-adopt-moon-monorepo]]) and the
  distribution / build-aspects decision ([[D-0010-distribution-single-exec-and-web-ui]]).

## References

- The capability surface the catalog covers — `docs/planning/vision.md` and the
  `cli` &rarr; `runner` &rarr; `core` surfaces plus `declarative` and `dialect`.
- [[D-0010-distribution-single-exec-and-web-ui]] — the single-exec + web-UI distribution
  decision and the moon workspace (§ D7); PR #46.
- [[T-MOON-adopt-moon-monorepo]] — adopting moon as the task runner / toolchain manager.
- Follow-ups: [[T-ROUT-runcorpus-first-match-routing]],
  [[T-SITE-bootstrap-docs-website]], [[B-DRAG-docrule-runcorpus-aggregation]],
  [[B-DREF-dialect-referential-integrity]], [[B-DANF-dialect-anchor-fragment-edges]],
  [[B-IOUT-init-out-placement]].
- [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]] — the
  upcoming `requires` / `forbids` text-constraint vocabulary (PR #50), previewed here as
  &#128679; planned examples.
- Catalog generated by a 22-agent workflow on 2026-06-28 (4 proposal lenses → synthesis →
  8 category fills → 8 coverage reviews → gap consolidation); planned text-constraint
  examples added from PR #50.
