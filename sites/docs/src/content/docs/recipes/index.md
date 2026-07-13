---
title: Recipes
description: Task-shaped, end-to-end solutions to real markdown-contract jobs — start from a situation, not a feature.
---

The [examples](/examples/) teach markdown-contract one **mechanism** at a time —
the CLI, the combinators, the dialect. **Recipes** come at it from the other
direction: each one starts from a **situation** you actually have and shows the
whole solution end to end — the contract, the config, the command, and the CI
wiring — then links down into the mechanism examples and up into the
[reference](/reference/cli/) for the details.

Every contract and config on these pages is compiled through the real
declarative front-end, every terminal transcript is captured from the real CLI,
and every program's output is from a real run — what you read is what the tool
does.

## Guard a folder (or folders) in CI

- **[Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/)** — one folder,
  one contract, fail the build on any violation. Start here.
- **[Infer a contract from docs you already have](/recipes/infer-a-contract-with-init/)** —
  don't hand-write the contract; `init` reads the folder and writes one.
- **[Validate several doc types in one repo](/recipes/multiple-doc-types/)** —
  decisions, runbooks, and guides, each with its own shape, routed by one config.
- **[Strict for published docs, lenient for drafts](/recipes/strict-published-lenient-drafts/)** —
  two strictness levels in one tree, or carve drafts out entirely.
- **[Validate only the files changed in a PR](/recipes/check-only-changed-files/)** —
  scope a huge tree's gate to the PR's diff.
- **[Errors block, warnings annotate](/recipes/warnings-as-pr-annotations/)** —
  warn-level findings as code-scanning annotations via SARIF.
- **[Block bad docs at commit time](/recipes/pre-commit-hook/)** — the exit code
  as a pre-commit hook.
- **[Catch docs drifting from their shape](/recipes/catch-drift-with-init-check/)** —
  `init --check` as a CI drift gate.

## Content-level contracts for a site

- **[Check an Astro content collection's body](/recipes/astro-content-collections/)** —
  enforce the section structure and prose your frontmatter schema can't see.
- **[Every how-to needs a code block and a checklist](/recipes/require-code-and-checklist/)** —
  block-kind requirements inside sections.
- **[Tables your tooling can rely on](/recipes/typed-table-columns/)** — typed
  columns with per-cell constraints.
- **[Cap the summary and make it addressable](/recipes/summary-length-and-anchor/)** —
  `maxWords` plus a required `^anchor`.
- **[Require a phrase in a section, forbid one everywhere](/recipes/require-or-forbid-phrases/)** —
  declarative text constraints as editorial rules.

## Team doc templates

- **[Turn your ADR convention into an enforced template](/recipes/enforce-adr-template/)**
- **[Runbooks with an on-call owner and a real rollback](/recipes/runbook-owner-and-rollback/)**
- **[Postmortems with a timeline table and action items](/recipes/postmortem-timeline-and-actions/)**
- **[A Decision section must cite an alternative](/recipes/decision-must-cite-alternative/)**

## Obsidian / knowledge vaults

- **[Every vault note exposes a `^summary` block](/recipes/require-a-summary-anchor/)** —
  guarantee the anchors your transclusions depend on.

## Read markdown back as typed data

- **[Build an index from your docs' frontmatter and tables](/recipes/build-an-index-from-frontmatter/)**
- **[Assemble release notes from a changelog's sections](/recipes/assemble-release-notes/)** —
  repeatable sections as a positional array.
- **[Feed an agent prompt-cards guaranteed to parse](/recipes/prompt-cards-for-agents/)**

## Embed in your own tooling

- **[Run validation inside your own build script](/recipes/validate-in-your-own-build/)** —
  `runCorpus` in-process.
- **[Surface findings as editor diagnostics](/recipes/findings-to-editor-diagnostics/)** —
  `Finding[]` → LSP diagnostics.
- **[Fail only on new findings vs a baseline](/recipes/baseline-and-diff-findings/)** —
  adopt contracts on a legacy corpus without fixing 400 findings first.

## Cross-document governance

- **[Every document names a real owner](/recipes/enforce-owner-across-tree/)** —
  tree-wide frontmatter governance, honestly deployed.
- **[`depends_on` must point at documents that exist](/recipes/cross-document-references/)** —
  the cross-file check, assembled from the library.

:::note[Not here yet]
Two vault recipes (dead `[[wikilink]]` detection, `[[note#^anchor]]` resolution)
wait on a small library export and are tracked in the backlog. If a job you have
isn't covered, the [example catalog](/examples/) almost certainly has the
mechanism — the recipes just assemble those parts into a whole.
:::
