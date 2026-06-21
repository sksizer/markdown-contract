---
type: decision
schema_version: '1'
id: D-0006
status: open/proposed
title: Fidelity and packaging — a generic core, one package, three layers
created: '2026-06-20'
related:
  - '[[C-0003-corpus-cli]]'
  - '[[PR-0001-markdown-contract]]'
  - '[[PR-0002-markdown-contract-cli]]'
tags:
  - packaging
  - architecture
  - cli
  - fidelity
need_human_review: true
---
# Fidelity and packaging — a generic core, one package, three layers

## Summary

- The core engine is **generic**: it knows nothing about SDLC, entities, or Obsidian vaults — SDLC
  contracts are just data fed to it.
- This repo ships **one npm package** — `exports` → the library, `bin` → the CLI — over three layers
  (engine / runner / cli) with strictly one-way imports (cli → runner → core).
- Standard Node ESM + npm: build to `dist/` via `tsc`, registry-installable; the raw mdast is
  retained and exposed (`tree.mdast`) for fidelity / round-trip (F1).
- The engine is LLM-free and read-only; repair / normalization is a separate pass.
- The Obsidian dialect parser (`micromark-extension-obsidian`) is packaged as an independent published
  package vs an in-repo module — an Options-considered choice.

^summary

## Context

The original ask was a *generic, configurable* library, and the consuming corpus (SDLC's planning set)
must remain just one data set fed to it — not baked in. That shapes both the layering (a core that knows
only markdown / mdast / Zod) and the packaging (a library other projects install, plus a CLI that gates a
corpus). This repo is the extraction of that engine from the prior in-repo design, so the package shape is
decided here, fresh, rather than inherited.

## Decision

### Layering — a generic core, SDLC as data

```text
src/
  core/      # the engine — projection, grammar, leaves, validate, model, finding; knows markdown/mdast/Zod only
  runner/    # corpus runner — directory→contract config, tree walk, finding aggregation; library API
  cli/       # the bin — arg parsing, human/json/sarif formatting; a thin shell over the runner
```

Imports are strictly one-way: **cli → runner → core**. The core never imports the runner or cli; the
runner never imports the cli. SDLC-specific knowledge (entity types, per-type contracts) lives entirely in
*data* — contract modules a consumer supplies — never in the engine.

### Packaging — one package, two entry points

A single npm package exposes both surfaces:

- `exports` → the library (the core engine + the runner as importable API).
- `bin` → the CLI (`markdown-contract validate <path> [--format human|json|sarif]`).

Standard Node ESM and npm: TypeScript built to `dist/` via `tsc`, registry-installable, no bespoke build
substrate. The runner is library API, so other consumers reuse it in-process rather than shelling out to
the bin.

### Fidelity (F1)

The raw mdast is retained and exposed as `tree.mdast` so the parse is round-trippable and unmodelled
constructs are analysable. The engine is **read-only**: it never mutates or normalizes a document. Repair
and normalization are a distinct downstream pass, out of this engine's scope. The engine is also
**LLM-free** — deterministic candidate emission only.

### Migration touchpoints (§8)

Extracting this engine retires the prior in-repo machinery: `validateBody` + `extractH2Headings` (→ the
grammar over the projection), `body-schema.yaml` (→ a `contract.ts` per type), the line scanners and the
three alias tables (→ `oneOf` + named rules), and the duplicated `FRONTMATTER_RE` slicers (→ the package's
single `parse`). Each per-type `contract.ts` becomes just data fed to the generic engine.

## Why

- **A generic core pays back three ways.** It is unit-testable against plain fixture markdown with zero
  SDLC scaffolding; it is reusable outside this repo; and the SDLC-specific knowledge stays where it
  belongs — in per-type contract *data*, not in the engine. Keeping SDLC as data is the difference between
  a library and a one-corpus tool.
- **One package because the surfaces are one engine.** The CLI is a thin shell over the runner, and the
  runner is the core's public API — splitting them into separate packages would version-couple two halves
  of one build for no isolation gain. `exports` + `bin` from one package is the standard Node shape for
  "library that also has a CLI".
- **Read-only and LLM-free by construction.** The validator's job is to *describe*, not to mutate or to
  judge; binding repair to a separate pass and keeping the LLM out of the engine keeps the determinism the
  CLI and CI depend on.

## Options considered

### Packaging the engine + CLI — one package vs split packages

#### Option A: one package, `exports` + `bin` (chosen framing)

A single `markdown-contract` package exposes the library via `exports` and the CLI via `bin`, with the
runner as shared library API. The CLI and library version together (they are one engine), one publish, one
build, one dependency set. The slight cost — a library consumer pulls the CLI's arg-parsing dependency tree
— is marginal and avoidable with care, and is outweighed by never having to keep two packages' versions in
lockstep by hand.

#### Option B: split packages (`markdown-contract` library + `markdown-contract-cli` bin)

A separate CLI package depending on the library. Cleaner dependency isolation for pure-library consumers,
and the CLI can iterate its UX independently. But it introduces a version-coupling seam (the CLI must track
the library's API), a second publish/release cadence, and a cross-package import boundary for what is one
engine with two front doors. Rejected for this repo: the isolation gain does not pay for the coordination
cost when the runner is already the clean library API the CLI shells over.

### The Obsidian dialect parser — independent package vs in-repo module

The dialect parser (`micromark-extension-obsidian`, the build-vs-adopt subject of
[[D-0002-projection-and-dialect]]) can be an **independently published package** — reusable by any
unified/remark consumer, versioned on its own, the natural home for an ecosystem-general extension — or an
**in-repo module** under the core, simpler to evolve in lockstep while the dialect's shape is still
settling. The lean is toward an independent package (the extension is genuinely general-purpose), but it is
not load-bearing for the engine's packaging and can start in-repo and graduate; the dialect's
build-vs-adopt question is settled first in [[D-0002-projection-and-dialect]].

## Consequences

- A non-SDLC consumer installs the package and feeds it their own contracts; the engine carries no corpus
  assumptions, so it is a true general-purpose markdown-contract library.
- The runner being library API means in-process consumers (report ops, other tools) reuse it without a
  subprocess; the CLI is genuinely thin.
- Read-only + LLM-free binds the repair / normalization track to a separate pass and keeps a future LLM tier
  outside the engine — the determinism the CLI exit code and CI gate rely on.
- Retiring the prior scanners / alias tables / slicers consolidates onto the single `parse`, but binds the
  extraction to porting each per-type contract into `contract.ts` data.

## Open questions

- Whether `micromark-extension-obsidian` ships as an independent published package from day one or starts
  in-repo and graduates — gated on the [[D-0002-projection-and-dialect]] build-vs-adopt outcome.

## References

- [[C-0003-corpus-cli]] — the CLI capability this ADR governs.
- [[PR-0001-markdown-contract]] — the library product.
- [[PR-0002-markdown-contract-cli]] — the CLI product.
- [[D-0002-projection-and-dialect]] — the dialect parser's build-vs-adopt and `tree.mdast` retention.
- [[D-0001-finding-model]] — the finding stream the runner aggregates and the CLI formats.
- `provenance/d0014/research/decision-package.md` — packaging / landscape grounding for the engine extraction.
- `provenance/d0014/questions/F1-read-and-value.md` — `tree.mdast` retention / read doors.
- `provenance/d0014/proposed-shape.md` §1, §8 — layering and migration touchpoints.
