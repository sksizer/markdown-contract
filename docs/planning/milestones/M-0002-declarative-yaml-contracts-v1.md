---
type: milestone
schema_version: '1'
id: M-0002
status: open/planned
title: Declarative YAML contracts — v1 loader, DSL, and meta-config
created: '2026-06-21'
related:
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[PR-0002-markdown-contract-cli]]'
contains: []
tags:
  - yaml
  - declarative
  - milestone
  - v1
need_human_review: true
---

# Declarative YAML contracts — v1 loader, DSL, and meta-config

## Summary

- Ship the v1 declarative front-end of [[C-0006-declarative-yaml-contracts]]: a versioned YAML loader that compiles a contract file into the engine's existing `Contract`, an 80%-case schema vocabulary compiled to Zod, a YAML meta-config mapping globs → YAML contracts, and `markdown-contract validate` accepting a `.yaml` config — all proven against a fixture suite of standalone, dummy-data contracts. v1 is pure declarative YAML.
- Scope is fixed by [[D-0008-declarative-contract-dsl]]: frontmatter + structure + content planes, `mcVersion` versioning from day one; cross-cutting rules deferred; the engine unchanged.

^summary

## Outcome

A consumer can author a contract and a corpus config entirely in YAML — no TypeScript, no build step — and get findings and a typed model identical to a TS-authored contract. The feature lands as a new front-end layer (a subpath export) over the engine and runner, with the CLI recognizing `.yaml` configs, and a fixture corpus that proves YAML-authored contracts behave exactly like their combinator-authored equivalents.

## Scope

**In**

- The YAML **contract format** (`mcVersion: 1`, `kind: contract`): frontmatter schema, body section grammar, per-section content leaves.
- The **schema vocabulary** (`type` / `enum` / `const` / `min` / `max` / `pattern` / `format` / `array` / `object` / `optional` / `default` / `nullable`) compiled to Zod.
- The YAML **meta-config** (`kind: config`): globs → contract files, with `.yaml` / `.ts` contract interop and first-match semantics.
- **`mcVersion` dispatch** and a friendly validation / error surface for malformed YAML.
- A **fixture suite** of dummy-data YAML contracts proving parity with TS contracts.

**Out** (per [[D-0008-declarative-contract-dsl]] § Out of scope)

- The **code escape hatch** (`$ref` to a Zod export; meta-config refs to code-authored contracts) — deferred to a later version; v1 is pure declarative YAML.
- Cross-cutting `rule` / `docRule`s in YAML (deferred to a later format version).
- Migrating the SDLC corpus to YAML contracts (stays on TS for now).
- Document repair / generation; non-YAML serializations.

## Workstreams

Decomposition for the follow-up task set (to be minted as `T-*` docs in a separate PR — tasks first, milestone second per the planning workflow):

1. **Loader scaffold + schema DSL → Zod.** The `markdown-contract/declarative` subpath export; compile the closed schema vocabulary to Zod. One-way layering preserved (the engine gains no YAML dependency).
2. **Body grammar + content-leaf compiler.** Compile `sections` / `section` / `aliases` / `oneOf` / `optional` / `gap` and the `table` / `list` / `code` / `maxWords` leaves from YAML into the combinators, reusing the schema DSL for `cells` / `everyItem`.
3. **Meta-config loader + CLI `.yaml` wiring.** `loadConfig(yaml) → CorpusConfig`; `.yaml` / `.yml` recognition in the CLI config loader beside `.js` / `.mjs`; `.ts` / `.yaml` contract-ref interop; first-match traversal.
4. **`mcVersion` dispatch + error surface.** Version-dispatched compilers, a meta-schema over the parsed YAML, and clear `config/version` style errors for unknown / missing versions.
5. **Fixture suite (dummy data).** Standalone YAML contracts paired with documents, asserting finding and typed-model parity against the equivalent TS contract.

## Success criteria

- [ ] A `*.contract.yaml` compiles to a `Contract` whose findings and typed model match the equivalent TS contract on a shared fixture corpus.
- [ ] The closed schema vocabulary covers string / number / boolean / array / object / enum / const with min / max / pattern / format / optional / default / nullable.
- [ ] A `markdown-contract.yaml` meta-config maps globs → contracts and `markdown-contract validate --config x.yaml` runs end-to-end with the correct exit code.
- [ ] `mcVersion` is required and dispatched; an unknown or missing version yields a clear config error, never a silent best-effort parse.
- [ ] The code escape hatch and cross-cutting rules remain out of scope and are documented as deferred.
- [ ] All fixtures use dummy data; the SDLC corpus is untouched.

## Dependencies

- The runtime surface this compiles to — the engine combinators and leaves ([[C-0005-two-plane-contract-engine]]) and the corpus runner / config ([[C-0003-corpus-cli]]) — which landed via [[M-0001-initial-contract-engine-and-cli]] (PRs #7–#18).

## References

- [[C-0006-declarative-yaml-contracts]] — the capability this milestone delivers.
- [[D-0008-declarative-contract-dsl]] — the format, API, versioning, and DSL-vs-JSON-Schema decision.
- [[C-0003-corpus-cli]] — the directory → contract config put in data form.
- [[C-0005-two-plane-contract-engine]] — the runtime the loader compiles to.
- [[PR-0002-markdown-contract-cli]] — the product this extends.
