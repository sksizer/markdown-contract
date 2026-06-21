---
type: capability
schema_version: '1'
id: C-0006
kind: feature
title: Declarative YAML contracts
status: open/planned
created: '2026-06-21'
parent_key: null
contains: []
related:
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[C-0001-contract-validation]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0004-content-plane]]'
  - '[[D-0006-packaging]]'
tags:
  - yaml
  - declarative
  - config
  - dsl
  - authoring
need_human_review: true
---

# Declarative YAML contracts

## Summary

- Author a contract — frontmatter schema, section grammar, and per-section content leaves — as a plain **versioned YAML file** with no TypeScript, and map directories to contracts in a YAML meta-config; a loader compiles both into the engine's existing `Contract` / `CorpusConfig` objects, so findings and the typed model are identical to a TS-authored contract. ^summary
- Lowers authoring from "write a TS module and build it" to "edit a data file", so CI configs, doc teams, and other repos can define markdown checks as data they can diff, share, and review.
- v1 covers the **frontmatter + structure + content** planes with an 80%-case declarative schema vocabulary — **pure declarative YAML**. The code escape hatch (a `$ref` to a Zod module) and cross-cutting rules are **deferred** to a later version.

## Statement

A consumer writes a contract as YAML — a `frontmatter` schema, a `body` section grammar, and per-section `content` leaves — and a versioned loader compiles it into the same `Contract` the engine combinators produce ([[C-0005-two-plane-contract-engine]]). Validation, findings, and the typed model are then indistinguishable from a contract authored in TypeScript. A separate YAML **meta-config** maps directory globs to contract files — the data form of the runner's directory → contract config ([[C-0003-corpus-cli]]). The engine is unchanged; this capability is a declarative front-end over it, not a second engine.

## What it provides

- A versioned **YAML contract format** (`mcVersion: 1`, `kind: contract`) spanning frontmatter, structure, and content.
- A loader / compiler — `loadContract(yaml) → Contract` and `loadConfig(yaml) → CorpusConfig` (a new subpath export) — plus `markdown-contract validate` accepting a `.yaml` config.
- An **80%-case schema vocabulary** (`type` / `enum` / `const` / `min` / `max` / `pattern` / `array` / `object`) compiled to Zod. (A `$ref` **code escape hatch** for the richer cases is planned for a later version — see [[D-0008-declarative-contract-dsl]].)
- A YAML **meta-config** (`kind: config`) mapping globs → YAML contract files. (Referencing code-authored contracts is part of the deferred code escape, so a corpus can later mix declarative and TS contracts.)

## Inputs

- A `*.contract.yaml` file describing one document type (or an inline contract for tiny cases).
- A `markdown-contract.yaml` meta-config mapping directory globs → contracts.

```yaml
# release-note.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    title:  { type: string, min: 1 }
    status: { enum: [draft, released] }
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
```

## Outputs

- The same `Contract` / `CorpusConfig` runtime objects, and hence the same `Finding[]` and typed `Doc` — YAML authorship is invisible downstream.

```ts
import { loadContract } from "markdown-contract/declarative";

const ReleaseNote = loadContract("./release-note.contract.yaml"); // → Contract
const result = ReleaseNote.validate(source, { path: "notes/r1.md" });
// result.findings, result.doc — identical to a TS-authored contract
```

## Hook points

- **A code escape hatch (planned, later)** — a `$ref` to a named Zod export — will cover anything past the closed vocabulary (refinements, cross-field constraints, custom messages). v1 ships without it; richer contracts are authored in TypeScript until it lands. Runtime TypeScript is feasible (a TS loader or Node type-stripping), so the deferral is a scoping choice.
- **Contract refs are `.yaml` contracts in v1.** Referencing a code-authored contract module (`.js` / `.mjs`, or `.ts` via a loader) is part of the deferred code escape — it will let a corpus mix declarative and TS contracts and migrate one type at a time.
- **The version gate (`mcVersion`)** is the forward-compatibility seam: new format versions compile alongside old ones, and a different schema dialect could be adopted later without breaking files.

## Underlying implementation

- A new front-end layer — a loader / compiler exposed as a subpath export — over `src/core` and `src/runner`; the engine ([[C-0005-two-plane-contract-engine]]) is untouched and imports stay one-way per [[D-0006-packaging]]. The CLI's config loader grows `.yaml` / `.yml` recognition beside `.js` / `.mjs`.
- The exact YAML → runtime mapping, the schema vocabulary, the versioning scheme, and the DSL-vs-JSON-Schema comparison are fixed by [[D-0008-declarative-contract-dsl]].
- Not yet built.

## Notes

- Builds on [[C-0003-corpus-cli]] (the directory → contract config) and [[C-0005-two-plane-contract-engine]] (the runtime it compiles to); realizes the vision's "declarative dir → contract config validates an arbitrary tree."
- v1 scope excludes cross-cutting `rule` / `docRule`s — explicitly deferred; see [[D-0008-declarative-contract-dsl]] § Out of scope. This work ships standalone contracts over dummy data; the SDLC corpus stays on TS contracts for now.
