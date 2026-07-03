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
tasks:
  - '[[T-7UTE-astro-docs-site]]'
  - '[[T-SHEL-docs-landing-and-ia]]'
  - '[[T-SITE-bootstrap-docs-website]]'
  - '[[T-PAGE-docs-pages-deploy]]'
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

**In:** the Astro docs-site app in the workspace ([[T-7UTE-astro-docs-site]]); its build + deploy pipeline; initial information architecture and a minimal published set of pages; and generating + publishing the example-catalog pages into that shell ([[T-SITE-bootstrap-docs-website]]).
**Out:** authoring / finalizing the use-case catalog *content* — that is [[M-0007-example-use-case-catalog]]'s job; this milestone consumes the catalog data it produces. Also out: the local daemon web UI / vault dashboard (later/tbd — a separate Nuxt app).

## Success criteria

- `sites/docs` builds as a **moon project** on the Bun toolchain — the shell scaffolded by [[T-7UTE-astro-docs-site]] (`moon run docs:build` emits a static site).
- The site publishes a **bare shell off the catalog critical path**: a hand-authored landing / overview page (what markdown-contract is) plus the sidebar IA slots ([[T-SHEL-docs-landing-and-ia]]).
- The example-catalog pages are **generated from the catalog data** (`docs/catalog/*.yaml`) into those slots — superseding the interim landing with the data-driven version ([[T-SITE-bootstrap-docs-website]], consuming [[M-0007-example-use-case-catalog]] via [[T-CTLG-example-catalog-finalize]]).
- A GitHub Pages deploy workflow builds via moon and publishes the site ([[T-PAGE-docs-pages-deploy]]). **The live publish is gated on GitHub Actions billing**; the milestone reaches "builds + workflow authored + green locally" independently and flips to "published to a public URL" once billing clears.

## Notes

- **Builds as a moon `sites/docs` project** (not a standalone site) — scaffolded by [[T-7UTE-astro-docs-site]], which depends on the workspace split [[T-WKSP-bun-workspace-split]] (M-0005, not yet landed).
- **Four tasks, in sequence:** [[T-7UTE-astro-docs-site]] scaffolds the shell → [[T-SHEL-docs-landing-and-ia]] adds the interim hand-authored landing + IA slots (publishable early, off the catalog critical path) → [[T-SITE-bootstrap-docs-website]] generates the data-driven catalog pages into those slots (consuming `docs/catalog/*.yaml` from [[T-CTLG-example-catalog-finalize]]) and supersedes the interim landing → [[T-PAGE-docs-pages-deploy]] wires the GitHub Pages deploy (after the scaffold).
- **Publishing is blocked on GitHub Actions billing** — isolated to [[T-PAGE-docs-pages-deploy]]'s publish step. The scaffold, the bare-shell landing, the catalog page-generation, and even the deploy *workflow file* can all be built / authored / reviewed now; only the live GitHub Pages deploy waits for billing to clear.
- **Example content is M-0007's job; publishing it is this milestone's.** This milestone delivers the site *shell* ([[T-7UTE-astro-docs-site]]) and the page-generation work ([[T-SITE-bootstrap-docs-website]], a member here); the catalog *content* it renders is finalized under [[M-0007-example-use-case-catalog]] as `docs/catalog/*.yaml`.
