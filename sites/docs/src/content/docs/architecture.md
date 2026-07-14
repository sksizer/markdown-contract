---
title: Architecture
description: The pipeline from source to findings, the three one-way layers of the package, and how the wider workspace fits around the engine.
sidebar:
  order: 4
---

This page describes the shape of the software: what happens to a document on
its way to a verdict, how the package is layered, and what else lives in the
repository around the core engine.

## The pipeline

One document flows through five stages, all off a single parse:

```text
source ──► projection ──► structure plane ──► merged, sorted findings
 (.md)      (DocTree)  └─► content plane   ─┘        │
                       └─► rule plane      ─┘        └─► typed model (Doc)
                                                         built only when clean
```

1. **Projection.** The document is parsed once (remark/mdast, plus the
   [dialect](/reference/dialect/)) and projected into a `DocTree` — a nested
   section tree with flattened blocks, where every node carries its source
   position.
2. **Planes.** The contract's expectations run over that tree: the structure
   plane matches the section grammar, the content plane runs Zod over
   frontmatter and content leaves, and the rule plane runs named custom rules.
3. **Findings.** Every plane emits the same finding shape; the results are
   merged and deterministically sorted (line, then column, then plane).
4. **Model.** If no error-level finding exists, the typed `Doc` is available —
   built lazily, as a facade over the same projection. The validator never
   depends on the model; the model is the reward for a valid document.

The engine is **read-only** (it never rewrites a document), **deterministic**
(same input, same findings, same order), and **pure** — no file system, no
`process`, no network.

## Three layers, one import direction

The published package is three layers, and imports flow only one way:

| Layer | Role |
|---|---|
| `core` | One document × one contract → findings + tree + doc. Pure. |
| `runner` | A corpus config (globs → contracts) → aggregated findings across a tree of files, with first-match routing. |
| `cli` | The `markdown-contract` bin: argv → runner → format → exit code. A thin shell over the library. |

`cli → runner → core`, never the reverse. Two consequences worth knowing:

- **Everything the CLI does is library API.** `runCorpus`, the formatters, and
  the contract engine are all exported; embedding validation in your own
  tooling is a function call, not a subprocess. See the
  [automate examples](/appendix/examples/automate/).
- **The engine knows nothing about your repository.** Corpora are described
  declaratively — a config maps directories and globs to contracts — so the
  same engine validates any tree.

Two sibling modules sit beside the layers:

- **`declarative`** — the YAML front-end. It compiles `kind: contract` /
  `kind: config` documents into the *same* runtime objects the TypeScript
  combinators build — a compiler, not a second engine — so YAML-authored and
  code-authored contracts produce identical findings and identical models. It
  also houses `init`'s inference: read a folder, emit the tightest config that
  accepts it.
- **`dialect`** — the in-house recognition passes for `^block-id` anchors and
  `[[wikilinks]]` / `![[transclusions]]`, built into the projection because no
  maintained package parses these constructs.

## The workspace around the engine

The repository is a monorepo; the npm package above is its canonical product,
and everything else is built over it:

| Path | What it is |
|---|---|
| `packages/core` | The `markdown-contract` library + CLI described above — the published artifact. |
| `crates/markdown-contract-engine` | A matched **Rust engine** for the declarative validation plane, held to finding-for-finding parity with the TypeScript engine by a shared fixture corpus (the same golden `*.expected.json` files check both). |
| `apps/web` | One binary, two faces: the CLI when run bare, and a `daemon` mode serving a local vault dashboard (a web UI showing live validation status for tracked folders). |
| `apps/desktop` | A desktop app (Tauri + Nuxt) over the Rust engine: multi-vault tracking with watching, schedules, and notifications. |
| `packages/ui` | The shared Vue component kit the web and desktop apps draw from. |
| `sites/docs` | This documentation site. The example pages are generated from a YAML catalog and every example artifact is regression-checked against the real CLI and library on each build. |

The library and CLI, the declarative YAML surface, text constraints, and
repeatable sections are shipped and stable. The single-binary distribution,
vault dashboard, desktop app, and Rust engine are working but younger — treat
them as the direction of travel rather than the settled surface.

## Where the rules of the design live

Every load-bearing choice on this page traces to a decision record in the
repository (`docs/planning/decisions/`): the finding model, the
projection/dialect split, the two planes, packaging, the declarative DSL,
config inference, and the rest. The corpus that holds them is itself validated
by markdown-contract on every push — the tool's own planning docs are its
hardest test fixture. See [the dogfood
example](/appendix/examples/automate/automate-04/).
