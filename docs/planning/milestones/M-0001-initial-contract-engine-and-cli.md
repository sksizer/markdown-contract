---
type: milestone
schema_version: '1'
id: M-0001
title: Initial release — the two-plane contract engine and CLI
status: closed/done
version: 0.1.0
created: '2026-06-21'
last_reviewed: '2026-06-21'
target_date: '2026-06-21'
tasks:
  - '[[T-7K2D-common-types]]'
  - '[[T-4QM9-framework-skeleton]]'
  - '[[T-9XB3-test-harness-and-fixtures]]'
  - '[[T-2HF6-projection-engine]]'
  - '[[T-8RJ5-structure-plane]]'
  - '[[T-5LW7-content-plane]]'
  - '[[T-3NC8-validate-and-finding-assembly]]'
  - '[[T-6PV4-consumption-object-model]]'
  - '[[T-J9TZ-cli-and-corpus-runner]]'
tags:
  - engine
  - cli
  - release
related:
  - '[[C-0001-contract-validation]]'
  - '[[C-0005-two-plane-contract-engine]]'
completion_note: >-
  Shipped the complete two-plane contract engine and its CLI to `main` (v0.1.0) across
  nine implementation tasks (#17 + #18): projection → DocTree with an in-house Obsidian
  dialect, the structure and content planes, the one-pass validator, the typed consumption
  model, and a config-driven corpus runner + CLI. Every module carries a peer
  contract-demonstrating test; the full suite is green (275 tests, 0 skipped) and the
  build ships no tests into `dist/`. The six design ADRs are accepted, the engine-scope
  posture is recorded (D-0007), and D-0002's dialect sourcing is resolved in-house.
---
# Initial release — the two-plane contract engine and CLI

## Goal

Ship the first working slice of markdown-contract: a generic, SDLC-agnostic engine that
turns one markdown parse into both **validation** (structural + content findings with
source positions) and a **typed model** you can read, plus a config-driven CLI that gates
a directory tree. This is the engine the rest of the project — and any outside consumer —
builds on; it proves the core bet (one parse, three cooperating mechanisms) end to end.

## Success criteria

- [x] `parse() → validate() → read()` works end to end over the provenance corpus; the
  full suite is green (**275 tests, 0 skipped**) on `main`.
- [x] The structure plane (tree grammar over sections + block kinds) and the content plane
  (Zod leaves + frontmatter) cooperate over one positioned `DocTree`.
- [x] The engine is a **generic core** — it carries no SDLC/corpus knowledge; contracts are
  data fed to it — with strictly one-way layering (`cli → runner → core`).
- [x] A config-driven CLI validates a directory tree with `human` / `json` / `sarif`
  output and a meaningful exit code.
- [x] Every module ships a peer **contract-demonstrating** test (input → exact output);
  the build emits no `*.test.*` into `dist/`.
- [x] The design is settled in accepted ADRs: the six original decisions plus the
  engine-scope posture (D-0007), with D-0002's dialect sourcing resolved.

## Deliverables

### Implementation (one task per component)

- [x] [[T-7K2D-common-types]] — the public type surface every layer shares.
- [x] [[T-4QM9-framework-skeleton]] — single-package lib+CLI skeleton + failing-test harness.
- [x] [[T-9XB3-test-harness-and-fixtures]] — fixture-driven suite, peer-`.md` fixtures,
  incremental-greening harness, and the peer-test / module conventions in `CLAUDE.md`.
- [x] [[T-2HF6-projection-engine]] — `parse()` → positioned `DocTree`; in-house Obsidian
  dialect (anchors + wikilinks); invariants D2–D4; `structure/heading-depth-jump`.
- [x] [[T-8RJ5-structure-plane]] — tree grammar + `structure/*` findings.
- [x] [[T-5LW7-content-plane]] — Zod content leaves + position-aware frontmatter.
- [x] [[T-3NC8-validate-and-finding-assembly]] — one-pass merge / sort / gate + `read()`.
- [x] [[T-6PV4-consumption-object-model]] — typed model (dual-key views, `byAnchor`, `Infer`).
- [x] [[T-J9TZ-cli-and-corpus-runner]] — config-driven corpus runner + `markdown-contract` CLI.

### Decisions (accepted)

- [x] [[D-0001-finding-model]], [[D-0002-projection-and-dialect]] (dialect sourcing resolved
  in-house), [[D-0003-structure-plane]], [[D-0004-content-plane]],
  [[D-0005-consumption-oom]], [[D-0006-packaging]].
- [x] [[D-0007-engine-scope-and-fidelity]] — read-only / repair-free / LLM-free posture, lifted out of
  D-0006.

### Capabilities (verified)

- [x] [[C-0001-contract-validation]], [[C-0002-typed-consumption]], [[C-0003-corpus-cli]],
  [[C-0004-dialect-aware-projection]], [[C-0005-two-plane-contract-engine]].

### Conventions

- [x] `CLAUDE.md` — `index.ts`-as-barrel + functional module decomposition; peer unit tests;
  fixture markdown as peer `.md`; "tests express the contract, not just edge cases."

## Out of scope

- **Dogfooding the engine on this project's own SDLC planning corpus** (the flagship
  [[DR-0005-validate-sdlc-corpus]] use case) — authoring the per-entity contracts and the
  dir→contract config for this repo is a later milestone.
- Repair / normalization and any LLM-assisted tier (out of the engine by [[D-0007-engine-scope-and-fidelity]]).
- Publishing to the npm registry (the package is built and registry-installable but unpublished).

## Risks / open questions

- Round-trip fidelity is **construct-survival**, not byte-exact: `remark-stringify`
  normalizes whitespace / list markers / emphasis, so the guarantee is that the dialect
  constructs (`^anchor`, `[[wikilink]]`, `![[transclusion]]`) survive a parse → stringify →
  re-parse cycle — not a byte-identical render (see [[D-0002-projection-and-dialect]]).
- The self-hosting validation (this corpus checked by its own engine) is not yet wired; it
  is the next milestone and the truest test of the generic-core bet.
