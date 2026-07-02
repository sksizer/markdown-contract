---
title: markdown-contract
description: Validate and consume markdown-as-data — declare a per-type contract and get both validation findings and a typed model from a single parse.
---

Markdown is the cheapest durable format a team will actually keep writing. The
moment you also want to *trust* its structure or *read it as data*, you reach for
ad-hoc regex, a bespoke linter, or a heavyweight CMS. **markdown-contract** is the
missing middle: declare a per-type **contract** and get back both **validation**
(structural and content findings with source positions) and a **typed model** you
can read — from one parse.

## Markdown as data

Validation and consumption are the same contract. The contract that *checks* a
document also *types* it: `validate()` returns findings, `read()` returns a typed
model. The engine is generic and reusable — not welded to any one corpus. A
declarative `dir → contract` config validates an arbitrary tree, and the engine
carries no repo knowledge.

## Three cooperating planes

markdown-contract does its work through three mechanisms over one parse:

- **Structure** — a regular tree grammar over sections *and* block kinds.
- **Content** — Zod over each block's data.
- **Rules** — a named-rule registry for cross-node / cross-file constraints.

Schema languages and tree grammars are formally incomparable (Murata), so we never
force one to do the other's job.

## Getting started

The publishable library and CLI live in `packages/core`. From a checkout of the
[source repository](https://github.com/sksizer/markdown-contract):

```sh
bun install                                  # resolve the workspace
bunx moon run core:build                     # tsc → packages/core/dist
bunx moon run core:test                      # vitest under Node
bunx moon run :build :typecheck :coverage    # what CI runs
```

For package layout, packaging, and the full toolchain, see the
[`packages/core` README](https://github.com/sksizer/markdown-contract/blob/main/packages/core/README.md).
