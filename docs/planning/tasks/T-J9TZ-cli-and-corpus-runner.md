---
type: task
schema_version: '5'
id: T-J9TZ
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped the config-driven corpus runner and the `markdown-contract` CLI with human / json / sarif output. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0003-corpus-cli]]'
- '[[D-0006-packaging]]'
- '[[DR-0003-markdown-quality-cli]]'
depends_on:
- '[[T-3NC8-validate-and-finding-assembly]]'
tags:
- cli
- runner
- ci
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# Implement the corpus runner and the markdown-contract CLI — config-driven tree validation with human/json/sarif output and CI exit codes

## Goal

Implement the second product (`C-0003` / `D-0006`): the exported `runCorpus` over a
directory → contract config, and the thin `markdown-contract` CLI that wraps it. Together they
turn the library into enforceable markdown quality — a single command that validates a whole
tree and fails CI on error-level findings, with no bespoke linter. The CLI stays a thin shell;
the runner is library API so other consumers reuse it in-process.

## Today

`runCorpus` and the CLI `validate` command are stubs.

| Location | Role today |
|---|---|
| `src/runner/corpus.ts` | `runCorpus` stub (from `T-4QM9`) |
| `src/cli/index.ts` | `parseArgs` + a stub `validate` dispatch; the only `process.exit` site |
| `src/core/validate.ts` | The assembled validate path (from `T-3NC8`) the runner drives |
| `package.json` | `bin` → `dist/cli/index.js`; `cli` script |

## Proposed

`src/runner/corpus.ts` implements `runCorpus(config, opts)` → `{ findings, exitCode }`:
traverse the tree per an `include` / `exclude` → contract config, validate each file, aggregate
findings, and compute a CI-meaningful exit code. `src/cli` implements arg parsing, config
loading, the `human` / `json` / `sarif` formatters, and `process.exit(code)` — the only place
that exits. `markdown-contract validate <path> [--format ...]` works end-to-end over a fixture
corpus, including an SDLC-style tree, proving the dogfood.

## Approach

1. Define and load the `CorpusConfig` (directory / glob → contract); document the format
   (its exact shape is the `D-0006` packaging decision).
2. Implement `runCorpus`: traverse, validate each file against its mapped contract, aggregate
   findings, apply the exit-code policy (0 clean / 1 error-level / 2 usage).
3. Implement the `human` / `json` / `sarif` formatters.
4. Wire the CLI: parse args, load config, run, format, `process.exit` — only here.
5. Add e2e CLI tests: run the built bin over a fixture tree; assert output + exit code for a
   clean and a failing corpus.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/runner/corpus.ts` | modify | Implement `runCorpus` (traverse + aggregate + exit code) |
| `src/runner/index.ts` | modify | Export the runner + `CorpusConfig` |
| `src/cli/index.ts` | modify | Args, config load, dispatch, `process.exit` |
| `src/cli/format.ts` | new | `human` / `json` / `sarif` formatters |
| `tests/cli.test.ts` | new | e2e: run the bin over a fixture tree, assert output + exit code |

## Acceptance criteria

- [x] AC-1: `runCorpus(config)` traverses `include` / `exclude` globs, validates each file
  against its mapped contract, and returns aggregated findings + an `exitCode`.
- [x] AC-2: Exit code is 0 with no error-level findings, 1 when any error-level finding is
  present, and 2 on usage / config error.
- [x] AC-3: `--format human|json|sarif` each produce well-formed output; `json` and `sarif` are
  machine-parseable.
- [x] AC-4: `process.exit` is called only in `src/cli`; `runCorpus` is pure library API
  reusable in-process.
- [x] AC-5: An e2e test runs the built bin over a fixture tree and asserts output + exit code
  for a clean corpus and a failing one.
- [x] AC-6: `markdown-contract validate <path>` works end-to-end against an SDLC-style fixture
  corpus.

## Out of scope

- Document repair / auto-fix; an LSP server; a watch mode.
- Publishing to the npm registry (a release task in its own right).

## Dependencies

- Needs the assembled validate path from `[[T-3NC8-validate-and-finding-assembly]]`.
