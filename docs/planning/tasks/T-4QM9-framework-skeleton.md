---
type: task
schema_version: '5'
id: T-4QM9
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped the single-package lib+CLI skeleton with stubbed entry points and the failing-test harness; every downstream component task built against it. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0001-contract-validation]]'
- '[[C-0003-corpus-cli]]'
- '[[C-0005-two-plane-contract-engine]]'
- '[[D-0006-packaging]]'
depends_on:
- '[[T-7K2D-common-types]]'
tags:
- skeleton
- architecture
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Stand up the engine/runner/CLI skeleton — every operation a typed stub, package builds and exports the full surface

## Goal

Create the module structure and wire every public operation as a stubbed function, so the
package compiles, all exports resolve, and later tasks can fill in one module at a time
against a frozen shape. This fixes the layering (`cli → runner → core`, one-way imports)
and the `ContractError` class, turning the API surface into a real — if hollow — package.

## Today

Bootstrap barrels only; no core modules, no runner/CLI bodies.

| Location | Role today |
|---|---|
| `src/core/index.ts` | Empty core barrel (types arrive in `T-7K2D`) |
| `src/runner/index.ts` | Runner stub barrel |
| `src/cli/index.ts` | CLI entry with `parseArgs`, exits with a TODO |
| `tests/smoke.test.ts` | Imports the package and asserts `VERSION` |
| `package.json` | `build` (tsc → dist), `typecheck`, `test` (vitest), `bin` → `dist/cli/index.js` |

## Proposed

Every core module exists with its functions exported as stubs (a body that throws
`not implemented`, or returns a typed placeholder where a stub must typecheck): `parse`,
`contract`, `sections`, `section`, `optional`, `oneOf`, `gap`, `rule`, `docRule`, `table`,
`list`, `code`, `maxWords`. `ContractError extends Error` lives in `finding.ts`. The runner
exports a stub `runCorpus`; the CLI parses args and dispatches a stub `validate` command,
and is the only layer that calls `process.exit`. `src/index.ts` re-exports the full public
surface. `npm run build` and `npm run typecheck` are green, and importing the package
yields every documented export.

## Approach

1. Create the core modules, each importing types from `src/core/types.ts` and exporting its
   functions as stubs: `projection.ts` (`parse`), `grammar.ts` (`contract`/`sections`/
   `section`/`optional`/`oneOf`/`gap`/`rule`/`docRule`), `leaves.ts` (`table`/`list`/`code`/
   `maxWords`), `validate.ts` (the `Contract.validate`/`read` entry), `model.ts` (the OOM
   entry), `finding.ts` (the `Finding` factory + `ContractError`).
2. Implement `ContractError extends Error` carrying `findings: Finding[]`.
3. Stub the runner `runCorpus` in `src/runner/corpus.ts`; barrel it.
4. CLI: keep `parseArgs`, dispatch a `validate` subcommand to a stub; `process.exit` only
   here.
5. Wire `src/index.ts` (library exports) and the bin; keep imports one-way `cli → runner → core`.
6. Green `build` + `typecheck`; extend the smoke test to assert every export is defined.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/projection.ts` | new | `parse` stub |
| `src/core/grammar.ts` | new | combinator stubs |
| `src/core/leaves.ts` | new | leaf-helper stubs |
| `src/core/validate.ts` | new | `validate`/`read` entry stubs |
| `src/core/model.ts` | new | OOM entry stub |
| `src/core/finding.ts` | new | `Finding` factory + `ContractError` |
| `src/runner/corpus.ts` | new | `runCorpus` stub |
| `src/core/index.ts` | modify | Barrel the core modules |
| `src/runner/index.ts` | modify | Export `runCorpus` |
| `src/cli/index.ts` | modify | Dispatch a stub `validate` command |
| `src/index.ts` | modify | Re-export the full public surface |
| `tests/smoke.test.ts` | modify | Assert every documented export is defined |

## Acceptance criteria

- [x] AC-1: Every public function from the `C-0001`..`C-0005` API sections exists as an
  exported stub with the correct signature.
- [x] AC-2: `ContractError extends Error` and carries `findings: Finding[]`.
- [x] AC-3: Imports flow one-way `cli → runner → core`; only `src/cli` calls `process.exit`.
- [x] AC-4: `npm run build` emits `dist/` and `npm run typecheck` passes with zero errors.
- [x] AC-5: A smoke test imports the package and asserts every documented export is defined.
- [x] AC-6: Calling any unimplemented op throws a clear `not implemented` error — no silent
  `undefined`.

## Out of scope

- Any real projection / validation / consumption logic — those are the implementation tasks.
- CLI output formatting and the corpus config format (land in `T-J9TZ`).
- Test fixtures (land in `T-9XB3`).

## Dependencies

- Needs the public type surface from `[[T-7K2D-common-types]]` to type the stubs.
