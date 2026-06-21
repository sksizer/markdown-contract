---
type: capability
schema_version: '1'
id: C-0003
kind: feature
title: Corpus CLI
status: open/verified
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[DR-0003-markdown-quality-cli]]'
  - '[[C-0001-contract-validation]]'
tags:
  - cli
  - quality
  - ci
need_human_review: true
---

# Corpus CLI

## Summary

- Validate a whole document tree from the command line against a declarative directory → contract config, emitting human / JSON / SARIF output with a CI-meaningful exit code. ^summary
- The CLI product's headline feature: enforceable markdown quality without a bespoke linter.

## Statement

A config maps directories / globs to the contracts that govern them. The CLI runs the library's corpus runner across the tree, aggregates findings, and reports them for humans or CI. The CLI is a thin shell over the runner; the runner is library API, so other consumers reuse it in-process rather than shelling out.

## What it provides

- The `markdown-contract` bin: `validate <path> [--format human|json|sarif]`.
- A directory → contract config format mapping a tree to its contracts.
- Aggregated findings plus a process exit code suitable for CI gating and commit hooks.

## Inputs

- A path to scan plus a config mapping directories / globs to the contracts that govern them.

```sh
# validate a tree with the default config (./markdown-contract.config.ts)
markdown-contract validate docs/

# choose a format and an explicit config; the exit code gates CI
markdown-contract validate docs/ --format sarif --config ./mc.config.ts > results.sarif
```

The config maps globs to contracts (themselves authored with the engine combinators, [[C-0005-two-plane-contract-engine]]):

```ts
// markdown-contract.config.ts   (exact shape fixed by D·packaging)
import { defineConfig } from "markdown-contract";
import { DecisionContract, TaskContract } from "./contracts";

export default defineConfig({
  rules: [
    { include: ["docs/planning/decisions/**/*.md"], contract: DecisionContract },
    { include: ["docs/planning/tasks/**/*.md"], exclude: ["**/_*.md"], contract: TaskContract },
  ],
});

interface CorpusConfig {
  rules: Array<{ include: string[]; exclude?: string[]; contract: Contract }>;
}
```

## Outputs

- Aggregated findings across the tree, rendered for humans or machines, plus a CI-meaningful exit code.

```sh
# exit 0  — no error-level findings (warnings allowed)
# exit 1  — one or more error-level findings
# exit 2  — usage / config error
```

- `--format human` for a terminal report, `json` for tooling, and `sarif` — the OASIS-standard JSON for static-analysis results that GitHub code scanning and many editors ingest natively, so findings surface as inline PR annotations and Security-tab alerts with no bespoke glue.

## Hook points

- The CLI is a thin shell over an exported runner — other consumers reuse it in-process rather than shelling out:

```ts
function runCorpus(config: CorpusConfig, opts?: { format?: "human" | "json" | "sarif" }):
  { findings: Finding[]; exitCode: number };
```

- The output formatters (human / json / sarif) are the extension surface for new report sinks.

## Underlying implementation

- Planned layering: `src/cli` (arg parse, the only `process.exit`) → `src/runner` (corpus traversal + aggregation, library API) → `src/core` ([[C-0001-contract-validation]]). One npm package, `bin` over `exports`.
- Fixed by the `D·packaging` ADR. Not yet built.

## Notes

Serves [[DR-0003-markdown-quality-cli]]; built on [[C-0001-contract-validation]] via the runner. The library / CLI shape (one package, `bin` over `exports`) is the `D·packaging` ADR. Status `open/planned`.
