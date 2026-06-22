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
  - '[[C-0007-declarative-corpus-meta-config]]'
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

- Author **one contract** — frontmatter schema, section grammar, and per-section content leaves — as a plain **versioned YAML file** with no TypeScript; a loader compiles it into the engine's existing `Contract`, so findings and the typed model are identical to a TS-authored contract. Binding a *corpus* of directories to contracts is the companion capability [[C-0007-declarative-corpus-meta-config]]. ^summary
- Lowers authoring from "write a TS module and build it" to "edit a data file", so CI configs, doc teams, and other repos can define markdown checks as data they can diff, share, and review.
- v1 covers the **frontmatter + structure + content** planes with an 80%-case declarative schema vocabulary — **pure declarative YAML**. The code escape hatch (a `$ref` to a Zod module) and cross-cutting rules are **deferred** to a later version.

## Statement

A consumer writes a contract as YAML — a `frontmatter` schema, a `body` section grammar, and per-section `content` leaves — and a versioned loader compiles it into the same `Contract` the engine combinators produce ([[C-0005-two-plane-contract-engine]]). Validation, findings, and the typed model are then indistinguishable from a contract authored in TypeScript. The engine is unchanged; this capability is a declarative front-end over it, not a second engine. Binding directory globs to these contracts across a corpus is split into the companion capability [[C-0007-declarative-corpus-meta-config]] (the YAML meta-config, the data form of the runner's directory → contract config), so this one stays focused on authoring a single contract.

## What it provides

- A versioned **YAML contract format** (`mcVersion: 1`, `kind: contract`) spanning frontmatter, structure, and content.
- A loader / compiler — `loadContract(yaml) → Contract` (a new subpath export) — so a YAML-authored contract drops straight into the engine and the CLI.
- A **CLI invocation that applies one contract to a target tree** — `markdown-contract validate <path> --contract <file.contract.yaml>` — the simplest way to run a contract, with no meta-config. Same binary as the meta-config mode ([[C-0003-corpus-cli]]), just a different flag; routing several contracts is [[C-0007-declarative-corpus-meta-config]].
- An **80%-case schema vocabulary** (`type` / `enum` / `const` / `min` / `max` / `pattern` / `format` / `array` / `object`) compiled to Zod, with a **broad** `format` set matching what Zod and JSON Schema expose out of the box. (A `$ref` **code escape hatch** for the richer cases is planned for a later version — see [[D-0008-declarative-contract-dsl]].)
- The YAML **meta-config** that maps globs → these contracts is the companion capability [[C-0007-declarative-corpus-meta-config]] (`loadConfig`, the CLI `.yaml` config, inline-or-file-ref contract resolution).

## Inputs

- A `*.contract.yaml` file describing one document type. (Binding many such files across a directory tree is [[C-0007-declarative-corpus-meta-config]].)

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

- The same `Contract` runtime object, and hence the same `Finding[]` and typed `Doc` — YAML authorship is invisible downstream.
- On the CLI those findings are rendered by an explicit **output parameter**, `--format human|json|sarif` (`human` is the console default) — the corpus CLI's existing output modes ([[C-0003-corpus-cli]]), unchanged for YAML-authored contracts.

```ts
import { loadContractFile } from "markdown-contract/declarative";

const ReleaseNote = loadContractFile("./release-note.contract.yaml"); // → Contract
//   (loadContract(text) compiles an in-memory YAML string instead of a file)
const result = ReleaseNote.validate(source, { path: "notes/r1.md" });
// result.findings, result.doc — identical to a TS-authored contract
```

## CLI usage

Apply a single contract to a directory tree — the simplest invocation, no meta-config:

```bash
# validate every *.md under ./notes/releases, print JSON
markdown-contract validate ./notes/releases --contract release-note.contract.yaml --format json
```

The positional `<path>` is a **directory** (the run root), **not** a glob: `--contract <file>` runs that one contract against **every markdown file in the subtree below `<path>`** (the synthesized rule is `include: ['**/*.md']`). Output is selected with `--format human|json|sarif` (`human` is the console default), and the findings and CI-meaningful exit code are exactly the corpus CLI's ([[C-0003-corpus-cli]]). Internally the CLI assembles a one-rule `CorpusConfig` and runs the same `runCorpus`, so the result is identical to a meta-config carrying a single catch-all rule. **Glob _scoping_** — validating only some files under the tree, or applying different contracts per subdirectory — is not expressed by the positional path; it comes from a meta-config's `include` / `exclude` rules (or the inline contract/target pairs), both owned by [[C-0007-declarative-corpus-meta-config]].

## Hook points

- **A code escape hatch (planned, later)** — a `$ref` to a named Zod export — will cover anything past the closed vocabulary (refinements, cross-field constraints, custom messages). v1 ships without it; richer contracts are authored in TypeScript until it lands. Runtime TypeScript is feasible (a TS loader or Node type-stripping), so the deferral is a scoping choice.
- **The version gate (`mcVersion`)** is the forward-compatibility seam: new format versions compile alongside old ones, and a JSON-Schema leaf dialect could be opted into per field later without breaking files.

## Underlying implementation

- A new front-end layer — a loader / compiler exposed as a subpath export — over `src/core` and `src/runner`; the engine ([[C-0005-two-plane-contract-engine]]) is untouched and imports stay one-way per [[D-0006-packaging]]. The CLI's config loader grows `.yaml` / `.yml` recognition beside `.js` / `.mjs`.
- The exact YAML → runtime mapping, the schema vocabulary, the versioning scheme, and the DSL-vs-JSON-Schema comparison are fixed by [[D-0008-declarative-contract-dsl]].
- Not yet built.

## Notes

- Builds on [[C-0005-two-plane-contract-engine]] (the runtime it compiles to); with its companion [[C-0007-declarative-corpus-meta-config]] (over [[C-0003-corpus-cli]]) it realizes the vision's "declarative dir → contract config validates an arbitrary tree." This capability is the contract half; C-0007 is the directory-binding half.
- v1 scope excludes cross-cutting `rule` / `docRule`s — explicitly deferred; see [[D-0008-declarative-contract-dsl]] § Out of scope. This work ships standalone contracts over dummy data; the SDLC corpus stays on TS contracts for now.
