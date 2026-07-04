# `tests/proposed/` — spec-level sketches of not-yet-built APIs

Fully-typed **example code for proposed features**, paired with `*.todo.test.ts`
suites that stay skipped until the feature lands. Each spec pins an API's *types*
now so the design is exercised by `tsc` before any implementation exists.

The convention mirrors `tests/harness.ts` (stubs throw "not implemented" until
their plane lands, so the types type-check while the tests stay skipped):

- **`*.proposed.ts`** — the proposed types/interfaces plus throwing runtime stubs.
- **`*.todo.test.ts`** — example usage that must type-check, with the behavioural
  cases under `describe.skip` (flip a local `IMPLEMENTED` flag when the code ships).

This directory is under `tests/` on purpose: it is type-checked
(`tsconfig.json` includes `tests`) but never built into `dist`
(`tsconfig.build.json` builds only `src`) and never counted against `src`
coverage (`vitest.config.ts` scopes coverage to `src/**`).

## Contents

| Spec | Capability / Decision |
|---|---|
| `document-scaffolding.proposed.ts` + `.todo.test.ts` | [[C-0011-document-scaffolding]] / [[D-0017-contract-to-document-generation]] — `scaffold(contract)` and the typed builder `template.create(contract)(values)` |
