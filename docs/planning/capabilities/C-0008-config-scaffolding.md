---
type: capability
schema_version: '1'
id: C-0008
kind: feature
title: Config scaffolding
status: open/planned
created: '2026-06-24'
parent_key: null
contains: []
related:
  - '[[D-0009-config-inference]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0007-declarative-corpus-meta-config]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0008-declarative-contract-dsl]]'
tags:
  - yaml
  - declarative
  - config
  - scaffolding
  - init
  - inference
need_human_review: true
---

# Config scaffolding

## Summary

- `markdown-contract init <dir>…` reads the markdown **already in** the target directories and **emits a relaxed starting config** — a meta-config plus one contract per inferred document type — that every existing file passes by construction. It mechanizes exactly the hand-work that produced this repo's dogfood config: survey the docs, find the common section spine and frontmatter keys, write the loosest contracts that still accept them. ^summary
- The output is a **scaffold to tighten, not a finished contract**: deliberately loose (`order: none`, `allowUnknown: true`, non-strict frontmatter, required = only what is *universal* across the group), so it accepts the corpus today and the author ratchets it down by hand — the on-ramp end of the project's "trivial to start, elegant offramps to more structure" principle.
- It is a **producer** of the YAML that [[C-0006-declarative-yaml-contracts]] and [[C-0007-declarative-corpus-meta-config]] define and that the engine already runs — not a new runtime. The inference algorithm, its grouping/looseness/value-type policies, and the CLI knobs are fixed by [[D-0009-config-inference]].

## Statement

A consumer points the tool at one or more directories of existing markdown. It parses each file (no contract needed — the engine's `parse` already yields the section tree and parsed frontmatter), clusters the files into document types, **generalizes** each cluster to the loosest contract that still accepts every file in it, and writes the contract files plus a meta-config that routes globs → contracts. The result is immediately runnable (`markdown-contract validate <dir>`) and — by a built-in self-check — guaranteed to report **no findings** against the corpus it was inferred from. From there the author tightens by hand: flip `order: none` → `recognized-relative`, promote an `optional:` section to required, close a `string` into an `enum`, add a `pattern`. The command drops the cost of *adopting* contracts onto an existing body of docs from "read every file and hand-author YAML" to one command, and gives every consumer the same on-ramp the dogfood config was for this repo.

This capability does not extend the format or the engine; it is a code path that *writes* well-formed [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML, then loads it back through the same loaders to prove the scaffold accepts its own corpus.

## What it provides

- A new CLI verb — **`markdown-contract init <dir>…`** — that infers a starting config from the markdown under one or more target directories and writes it to disk (default: a `markdown-contract.yaml` meta-config plus a `contracts/` directory of per-type contract files).
- A **relaxed-by-construction** inference: required sections are only those present in *every* file of a group; everything else observed is emitted as `optional:`; frontmatter is non-strict; bodies are `order: none` + `allowUnknown: true`. The corpus passes the scaffold immediately ([[D-0009-config-inference]] § Generalize).
- **Automatic grouping** of files into document types, by their path signature (containing directory and any `PREFIX-` filename token), named from the uniform frontmatter `type` value when there is one — reproducing the dogfood config's one-contract-per-doc-type shape — with a `--group dir|prefix|type|single` override.
- **Conservative value-type inference** for frontmatter fields: lossless, unambiguous facts only by default — `const` for a value that is identical across the group, `format: date` / `datetime` when every value matches, `type: number` / `boolean` / `array` when every value fits — and nothing tightening (`enum`, `pattern`, `min`/`max`) unless opted in. ([[D-0009-config-inference]] § Infer field schemas.)
- A **self-check / `--check` mode**: after emitting (or against an existing config), load and run it over the corpus; the scaffold must report zero findings — a build-time guarantee, and a CI signal that "a doc drifted from its inferred shape".
- Output as either the **meta-config + contract files** offramp shape (default) or a single **`--inline`** self-contained config — the same inline ↔ file-ref duality [[C-0007-declarative-corpus-meta-config]] makes first-class.

## Inputs

- One or more **target directories** of existing markdown, plus optional scoping/shape flags. The tool reads the files; it writes nothing the user does not ask for (overwrite is opt-in).

```bash
# infer a config for this repo's own planning docs (what produced the dogfood config, by hand)
markdown-contract init docs/planning
```

What it reads from each file (via the engine's `parse`, no contract required):

- the parsed **frontmatter** map (keys + values), and
- the **section spine** — the top-level heading names in document order.

## Outputs

- A runnable config on disk: a `markdown-contract.yaml` meta-config and a `contracts/*.contract.yaml` per inferred type — the same artifacts [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] define, byte-compatible with hand-authored ones.

```text
markdown-contract.yaml            # rules: glob → contract, one per inferred type
contracts/
  decision.contract.yaml          # relaxed: order:none, allowUnknown, required = universal sections
  capability.contract.yaml
  …
```

```yaml
# contracts/decision.contract.yaml  (generated — a starting point, tighten by hand)
mcVersion: 1
kind: contract
frontmatter:
  strict: false                    # rich frontmatter passes through; tighten when ready
  fields:
    type:    { const: decision }   # identical across the group ⇒ inferred as a const
    id:      { type: string }      # present in every file ⇒ required, but loosely typed
    created: { type: string, format: date }   # every value is an ISO date
    title:   { type: string }
    status:  { type: string }      # NOT an enum by default (would reject future-but-valid values)
body:
  order: none                      # relaxed: never fail on ordering…
  allowUnknown: true               # …or on extra sections
  sections:
    - section: Summary             # present in EVERY decision ⇒ required
    - section: Context
    - section: Decision
    - section: References
    - section: Open questions       # present in only SOME ⇒ emitted optional
      optional: true
```

The console reports what it inferred and what it deliberately left loose (groups, file counts, fields typed as `const`/`format`, sections marked optional), and the self-check result.

## CLI usage

Infer and write a config for a tree (default output: meta-config + `contracts/` files at the cwd):

```bash
markdown-contract init docs/planning
```

Useful flags (full surface in [[D-0009-config-inference]] § The CLI surface):

```bash
markdown-contract init docs api-docs        # several roots → one config covering all
markdown-contract init docs --out config/   # where to write
markdown-contract init docs --inline        # one self-contained file instead of contract/ files
markdown-contract init docs --group dir     # override grouping (dir | prefix | type | single)
markdown-contract init docs --dry-run       # print to stdout, write nothing
markdown-contract init docs --force         # overwrite an existing config
markdown-contract init docs --check         # don't write; verify an existing config still accepts the tree
```

`init` reuses the same **`--glob` / `--include` / `--exclude`** scoping as `validate` ([[C-0007-declarative-corpus-meta-config]]) to choose *which* files feed inference — so a run can skip fixtures or draft files exactly as a validation run would. By design `init` only *adds* a config; running it never validates beyond the self-check, and it refuses to clobber an existing config without `--force`.

## Hook points

- **The scaffold is the on-ramp; tightening is the offramp.** Generated YAML is ordinary [[C-0006-declarative-yaml-contracts]] — every loosening it emits (`order: none`, `optional:`, non-strict frontmatter, `string` over `enum`) is a knob the author turns by hand afterward. The tool's job ends at "accepts the corpus"; ratcheting is human.
- **`--check` is the drift guard.** The same inference that writes a config can re-verify one: in CI, `init --check` (or simply `validate`) catches a new or edited doc that no longer fits the inferred shape — turning the scaffold into a living lower bound on document structure.
- **Inference depth is opt-in, behind flags.** v1 infers structure presence + safe frontmatter value types. Richer inference — closed `enum`s from observed value sets, content-plane leaves (a `Changes` section that is always a table with columns `[Type, Description]`), `min`/`max`/`pattern` — are deliberate future opt-ins ([[D-0009-config-inference]] § Out of scope), so the default never over-constrains.
- **Producer of the same formats, so it tracks them.** As the [[D-0008-declarative-contract-dsl]] vocabulary grows (new `format`s, leaf types, a JSON-Schema leaf dialect), the inferer can emit more — it writes the format, it does not define it.

## Underlying implementation

- A new code path in the same front-end layer as the loaders — the `markdown-contract/declarative` subpath export over `src/core` and `src/runner` — plus a thin `init` verb in the CLI ([[C-0003-corpus-cli]]). Imports stay one-way `cli → runner → core` per [[D-0006-packaging]]; the engine is untouched.
- The reader side reuses **`parse`** (already exported from `core`) for the section tree + frontmatter and the runner's file walk for discovery; the writer side serializes the inferred model to YAML and then **loads it back through `loadConfig` / `loadContract`** and runs it through `runCorpus` for the accept-by-construction self-check — so the inferer is validated against the very loaders it targets.
- The exact algorithm (discover → group → generalize → infer field schemas → emit → self-check), the grouping/looseness/value-type policies, the glob synthesis, and the CLI flag surface are fixed by [[D-0009-config-inference]].
- Not yet built.

## Notes

- Builds directly on [[C-0006-declarative-yaml-contracts]] and [[C-0007-declarative-corpus-meta-config]] (the formats it writes) and [[C-0003-corpus-cli]] (the binary it adds a verb to). It is the natural sequel to those: they let you *author* contracts as data; this lets you *bootstrap* them from docs you already have.
- The dogfood config (`markdown-contract.yaml` + `contracts/*.contract.yaml` over `docs/planning`) is the worked target output — it was produced by hand and is the obvious golden test: `init docs/planning` should yield a config of the same shape, and any inferred config must pass `validate` over the corpus it came from.
