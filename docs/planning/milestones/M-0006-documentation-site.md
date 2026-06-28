---
type: milestone
schema_version: '1'
id: M-0006
title: Published documentation site
status: open/planned
created: '2026-06-28'
related:
  - '[[D-0010-monorepo-tooling]]'
  - '[[M-0007-example-use-case-catalog]]'
  - '[[PR-0002-markdown-contract-cli]]'
  - '[[PR-0001-markdown-contract]]'
contains:
  - '[[T-7UTE-astro-docs-site]]'
tags:
  - docs
  - website
  - astro
  - dx
  - marketing
  - milestone
need_human_review: true
---

# Published documentation site

## Summary

- Stand up and publish a documentation / marketing website for markdown-contract (Astro), building as a project in the moon monorepo ([[D-0010-monorepo-tooling]]). Sequenced ahead of the full example use-case catalog ([[M-0007-example-use-case-catalog]]), which becomes its content basis. ^summary
- This is the **public docs/marketing site** (Astro), distinct from the local daemon web UI (a later/tbd Nuxt `apps/web` surface).

## Outcome

A live, published docs site — the public face of the project — building from the monorepo and ready to be populated by the use-case catalog.

## Scope

**In:** the Astro docs-site app in the workspace; its build + deploy pipeline; initial information architecture and a minimal published set of pages.
**Out:** the full categorized use-case catalog ([[M-0007-example-use-case-catalog]]); the local daemon web UI / vault dashboard (later/tbd — a separate Nuxt app).

## Success criteria

- An Astro docs site builds as a moon project in the monorepo and is published to a public URL.
- The site renders the core docs (what it is, install, CLI usage) and is wired for catalog content to land into.
- Build/deploy runs in CI via moon.
