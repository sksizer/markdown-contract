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
declarative front-end, and every terminal transcript is captured from the real
CLI, so what you read is what the tool does.

## Guard a folder (or folders) in CI

- **[Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/)** — one folder,
  one contract, fail the build on any violation.
- **[Validate several doc types in one repo](/recipes/multiple-doc-types/)** —
  decisions, runbooks, and guides, each with its own shape, routed by one config.

## Content-level contracts for a site

- **[Check an Astro content collection's body](/recipes/astro-content-collections/)** —
  enforce the section structure and prose your content-collection frontmatter
  schema can't see.

:::note[More on the way]
This section is being built out from a backlog of use-case recipes (guard drift,
strict-vs-lenient folders, code-scanning annotations, Obsidian dead-link checks,
ADR/runbook templates, reading docs as typed data, embedding the runner). If a
job you have isn't here yet, the [example catalog](/examples/) almost certainly
has the mechanism — the recipes just assemble those parts into a whole.
:::
