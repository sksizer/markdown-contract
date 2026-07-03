---
type: milestone
schema_version: '1'
id: M-0006
title: Published documentation site
status: closed/done
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
- The site **publishes to a public URL via Cloudflare Pages**: the `markdown-contract-docs` project, auto-deployed by git integration on push to `main` (build settings and required env vars documented in `sites/docs/README.md`). Live at <https://markdown-contract-docs.pages.dev/>. *(Supersedes the GitHub Pages plan: [[T-PAGE-docs-pages-deploy]] authored that workflow, but the repo is private so GitHub Pages can't be enabled; the workflow file has been removed.)*

## Notes

- **Builds as a moon `sites/docs` project** (not a standalone site) — scaffolded by [[T-7UTE-astro-docs-site]], which depended on the workspace split [[T-WKSP-bun-workspace-split]] (M-0005, shipped via #135).
- **Four tasks, in sequence:** [[T-7UTE-astro-docs-site]] scaffolds the shell → [[T-SHEL-docs-landing-and-ia]] adds the interim hand-authored landing + IA slots (publishable early, off the catalog critical path) → [[T-SITE-bootstrap-docs-website]] generates the data-driven catalog pages into those slots (consuming `docs/catalog/*.yaml` from [[T-CTLG-example-catalog-finalize]]) and supersedes the interim landing → [[T-PAGE-docs-pages-deploy]] wired the deploy workflow (authored for GitHub Pages; publishing has since moved to Cloudflare Pages — see the next note).
- **Publishing moved to Cloudflare Pages (2026-07-03).** The GitHub Pages route died when the repo stayed private — Pages can't be enabled, so [[T-PAGE-docs-pages-deploy]]'s workflow could never publish (its only run failed at `configure-pages`). The site now publishes as the Cloudflare Pages project `markdown-contract-docs` (<https://markdown-contract-docs.pages.dev/>) via **git integration**: pushes to `main` touching the build watch paths trigger a build and deploy. The build config — root directory `/`, `bun install && bunx moon run docs:build`, output `sites/docs/dist` — and the **required env vars** (`SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION`; Cloudflare's auto-install can't read the text `bun.lock` and falls back to npm, which chokes on `workspace:*`) are documented in `sites/docs/README.md`. `wrangler pages deploy sites/docs/dist` remains the manual fallback. T-PAGE stays closed: its authored deliverable shipped and was then superseded, and the dead workflow file is removed.
- **Example content is M-0007's job; publishing it is this milestone's.** This milestone delivers the site *shell* ([[T-7UTE-astro-docs-site]]) and the page-generation work ([[T-SITE-bootstrap-docs-website]], a member here); the catalog *content* it renders is finalized under [[M-0007-example-use-case-catalog]] as `docs/catalog/*.yaml`.
- **Closed 2026-07-03.** All four tasks shipped: the scaffold (#135-era shell via T-7UTE), the interim landing (T-SHEL), the deploy (T-PAGE, later superseded by Cloudflare), and the generated catalog pages (T-SITE, #196). The site is live with the data-driven landing and per-example pages at <https://markdown-contract-docs.pages.dev/>.
