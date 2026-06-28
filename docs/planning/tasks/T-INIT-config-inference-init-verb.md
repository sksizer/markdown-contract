---
type: task
schema_version: '5'
id: T-INIT
status: closed/done
created: '2026-06-28'
completion_note: 'The core `markdown-contract init` verb shipped across the dyc-init-* branches (PRs #35–#39): single-contract mode and `--meta` tree mode cut at `--depth`; the value-type inference ladder (const / number / boolean / format / enum / string); `--inline` / `--check` / `--include` / `--exclude` / `--force` / `--dry-run` flags; and the accept-by-construction self-check that loads the emitted config back through loadConfig/loadContract and runs runCorpus to guarantee zero findings on the source corpus. Retroactive task — created so M-0003''s primary deliverable has a tracked entity (the verb merged without one). The value-ladder guards are tracked separately (T-2CSL, T-3MCE, T-NULL, T-KCOL); the run summary (T-RUNS) is the remaining open thread.'
related:
  - '[[D-0009-config-inference]]'
  - '[[C-0008-config-scaffolding]]'
  - '[[C-0007-declarative-corpus-meta-config]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0003-corpus-cli]]'
depends_on: []
tags:
  - init
  - infer
  - scaffolding
  - cli
  - config
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Implement the core `init` verb — infer a tight-but-accepting config from existing markdown (single + `--meta`)

## Goal

Ship `markdown-contract init <dir>…`: read the markdown already in the target directories and write a runnable config inferred from it — a **single contract** for one directory, or a **meta-config across a tree** cut at a configurable `--depth`. The output is the tightest contract that still accepts every file it was inferred from, guaranteed by an accept-by-construction self-check, per [[C-0008-config-scaffolding]] and [[D-0009-config-inference]].

## Today

Shipped (this is a retroactive record of delivered work). Before it landed, adopting contracts on an existing body of docs meant reading every file and hand-authoring YAML; there was no bootstrap path from docs you already have.

## Proposed

A new `init` verb on the CLI with two modes:

- **single contract** (default) — one `*.contract.yaml` generalized over all markdown in the target subtree.
- **meta-config** (`--meta`) — a `markdown-contract.yaml` router plus a `contracts/` directory, one contract per directory at the chosen `--depth`, each covering all markdown beneath it.

Required sections are those present in every file of a group; the rest are emitted `optional:`. Frontmatter values are typed as tightly as the data allows via the value-type ladder (const / number / boolean / `format` / enum / string), always admitting every value seen. Flags: `--depth`, `--inline`, `--check`, `--include`/`--exclude`, `--force`, `--dry-run`, `--out`, `--relax`.

## Approach

discover → parse → group-by-directory-and-depth → generalize → infer field schemas → emit YAML → self-check. The reader reuses `parse` (section spine + frontmatter) and the runner's file walk; the writer serializes the inferred model to YAML and loads it back through `loadConfig`/`loadContract`, then runs it through `runCorpus` so the scaffold is proven to accept its own corpus (zero findings) before the user sees it. Imports stay one-way `cli → runner → core`; the engine is untouched.

## Files to touch

- `src/declarative/infer.ts`, `src/declarative/config.ts`, `src/declarative/body.ts`, `src/declarative/load.ts` (+ peer tests) — the inference/generalization/emit code path under the `markdown-contract/declarative` subpath export.
- `src/cli/run.ts` — the `init` verb wiring, flag parsing, self-check reporting.
- `tests/inference.cli.test.ts` and fixtures — end-to-end coverage.

## Acceptance criteria

- [x] `markdown-contract init` produces a config that validates its own corpus with **zero findings**, in both single-contract and `--meta` modes.
- [x] The value ladder (const / number / boolean / `format` / enum / string) infers each field as tightly as the observed values permit while admitting every value seen.
- [x] `--depth` trades one broad contract for a per-directory mesh; depth 0 collapses to the single-contract case.
- [x] `--check` re-runs an existing config over the corpus as a CI drift guard (exit 1 when a doc drifts from the inferred shape); `--inline` emits one self-contained file; `--include`/`--exclude` scope which files feed inference; `init` refuses to clobber without `--force`.
- [x] The accept-by-construction self-check loads the emitted YAML back through the real loaders and runs `runCorpus` — the inferer is validated against the very loaders it targets.

## Out of scope

- Content-plane leaf inference and deep nested grammars ([[D-0009-config-inference]] § Out of scope).
- The value-ladder hardening guards (string-length cap, min-examples floor, nullable, heading key-collision) — tracked as T-2CSL, T-3MCE, T-NULL, T-KCOL.
- The `validate` run summary — tracked as T-RUNS.

## Dependencies

- Builds on the declarative loaders it writes for ([[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]]) and the corpus CLI/runner ([[C-0003-corpus-cli]]) it adds a verb to. No blocking dependencies — delivered.
