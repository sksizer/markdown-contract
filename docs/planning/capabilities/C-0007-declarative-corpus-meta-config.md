---
type: capability
schema_version: '1'
id: C-0007
kind: feature
title: Declarative corpus meta-config
status: open/planned
created: '2026-06-22'
parent_key: null
contains: []
related:
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0006-packaging]]'
tags:
  - yaml
  - declarative
  - config
  - corpus
  - meta-config
need_human_review: true
---

# Declarative corpus meta-config

## Summary

- Bind a whole directory tree to contracts as a single **versioned YAML meta-config** (`mcVersion: 1`, `kind: config`): a `rules` list mapping `include` / `exclude` globs to a contract, the data form of the runner's directory → contract config ([[C-0003-corpus-cli]]). A loader compiles it into the engine's existing `CorpusConfig`, and `markdown-contract validate --config x.yaml` runs it end to end. ^summary
- A contract is bound **either fully inlined** as a nested definition (the zero-pathing on-ramp — one file, no second artifact) **or referenced** as a separate `.yaml` contract file by name or path (the shareable offramp) — both first-class, so a config starts self-contained and graduates contracts to their own files by a mechanical, non-breaking move.
- Sits **on top of** [[C-0006-declarative-yaml-contracts]] (which authors one contract); this capability is the corpus-binding half. Referencing code-authored contract modules is part of the deferred code escape ([[D-0008-declarative-contract-dsl]] § Out of scope).

## Statement

A consumer maps a corpus to contracts in one YAML file — a `rules` list of `include` / `exclude` glob sets, each pointing at a contract — and a versioned loader compiles it into the same `CorpusConfig` the runner already consumes ([[C-0003-corpus-cli]]). First match wins, exactly as the runtime runner does, so behaviour is identical to a TS `defineConfig({ rules })`. Each contract in a rule is resolved one of three ways, all first-class: a **name** into an optional `contracts` registry, a **`.yaml` file path**, or a **fully inlined** contract definition. This capability is a thin declarative front-end over the runner; it composes the single-contract authoring of [[C-0006-declarative-yaml-contracts]] into a directory-level binding without touching the engine.

## What it provides

- A versioned **YAML meta-config format** (`mcVersion: 1`, `kind: config`): a `rules` list (`include` / `exclude` globs + `contract`) plus an optional `contracts` name registry.
- A loader / compiler — `loadConfig(yaml) → CorpusConfig` (part of the `markdown-contract/declarative` subpath export) — plus `markdown-contract validate` accepting a `.yaml` / `.yml` config beside the existing `.js` / `.mjs`.
- **Three first-class contract-ref forms** — inline definition, `.yaml` path, or registry name — with paths resolved relative to the config file and **first-match-wins** traversal matching the runner.

## Inputs

- A `markdown-contract.yaml` (or any `--config`-named) meta-config mapping directory globs → contracts.

```yaml
# markdown-contract.yaml
mcVersion: 1
kind: config

# A named registry of reusable contract files (the offramp):
contracts:
  release-note: ./contracts/release-note.contract.yaml
  guide:        ./contracts/guide.contract.yaml

rules:
  # …reference a registered contract by name…
  - include: ['notes/releases/**/*.md']
    contract: release-note
  # …or point a rule straight at a contract file…
  - include: ['docs/guides/**/*.md']
    exclude: ['**/_*.md']
    contract: ./contracts/guide.contract.yaml
  # …or fully inline the contract here — no second file, no paths (the on-ramp):
  - include: ['notes/quick/**/*.md']
    contract:                          # an inline contract is just { frontmatter?, body? } —
      frontmatter:                     # no mcVersion/kind envelope inline; the config carries it
        fields:
          title: { type: string, min: 1 }
      body:
        order: none
        sections:
          - section: Summary
            content: { maxWords: 80 }
```

## Outputs

- The same `CorpusConfig` runtime object the runner consumes — and hence the same `Finding[]` and CI-meaningful exit code — whether authored in YAML or TypeScript.

```ts
import { loadConfig } from "markdown-contract/declarative";

const config = loadConfig("./markdown-contract.yaml"); // → CorpusConfig
// feed to runCorpus, or just: markdown-contract validate ./docs --config markdown-contract.yaml
```

## Hook points

- **Inline ↔ file-ref is a non-breaking move.** A self-contained config that inlines every contract is complete and valid; splitting a contract out to its own `.yaml` file (referenced by name or path) changes nothing downstream — the "trivial to start, elegant offramps to more structure" on-ramp principle.
- **Code-authored contract refs are deferred.** Referencing a code-authored contract module (`.js` / `.mjs`, or `.ts` via a loader) is part of the deferred code escape ([[D-0008-declarative-contract-dsl]]); it is the interop seam that will let a corpus mix declarative and TS contracts and migrate one type at a time.
- **The version gate (`mcVersion`)** applies to the meta-config too: new format versions compile alongside old ones.

## Underlying implementation

- Part of the same front-end layer as [[C-0006-declarative-yaml-contracts]] — the `markdown-contract/declarative` subpath export over `src/core` and `src/runner`; the engine and runner are untouched and imports stay one-way per [[D-0006-packaging]]. The CLI's config loader grows `.yaml` / `.yml` recognition beside `.js` / `.mjs`.
- The exact meta-config shape, the three contract-ref forms, and the versioning scheme are fixed by [[D-0008-declarative-contract-dsl]] § The meta-config file.
- Not yet built.

## Notes

- Decomposed out of [[C-0006-declarative-yaml-contracts]] so the single-contract authoring surface and the corpus-binding surface plan, and ship, as separate workstreams — mirroring how the implementation already separates the contract loader from the config loader.
- Builds on [[C-0003-corpus-cli]] (the directory → contract config it puts in data form) and composes [[C-0006-declarative-yaml-contracts]] (the contracts it binds). This work ships standalone configs over dummy data; the SDLC corpus stays on TS contracts for now.
