---
type: task
schema_version: '5'
id: T-VITE
status: open/ready
created: '2026-06-29'
related:
- T-4E9T-yaml-parity-glob-skips-peerless-fixtures
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Upgrade Vitest from 2.1.x to the latest 4.x to stay current and unlock the Test Annotations API

## Goal

Upgrade the test runner from Vitest `^2.1.0` (2.1.9) to the latest release, 4.1.9,
so the suite stays on the current major and so we gain the **Test Annotations API**
(`context.annotate(message, type)`, introduced in Vitest 3.0 and carried forward in
4.x). That API lets a test emit a non-failing annotation — including `type: 'warning'`
— that surfaces in the reporter (and as a `::warning` GitHub Actions workflow command
in CI) instead of forcing a hard pass/fail.

This directly enables the approach planned for
[[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]]: the always-on
`tests/yaml-parity.test.ts` "peers exist" consistency check currently can only
pass or fail, which is what forces a parity-peerless gated fixture to be tucked
into a glob-skipped subdirectory. With `context.annotate(..., 'warning')`
available, that check can report a missing-peer as a CI warning rather than a
test failure, removing the load-bearing coupling between a fixture's directory
and the parity harness.

## Today

- The suite runs on Vitest `^2.1.0`, resolving to **2.1.9**.
- There is **no test-annotation API**: a consistency check (e.g. the
  yaml-parity "peers exist" assertion) can only pass or fail — there is no
  built-in way to emit a non-failing notice/warning from inside a test.
- `vitest.config.ts` is minimal — it only sets `test.include` for the two test
  locations (`src/**/*.test.ts`, `tests/**/*.test.ts`).
- `tests/yaml-parity.test.ts` relies on `import.meta.glob(...)`, a Vite
  compile-time macro guarded by `process.env.VITEST`, to discover fixtures.

## Proposed

Bump the `vitest` devDependency to the latest release (4.1.9) and regenerate
`package-lock.json`. Vitest 4 bundles its own Vite and `@vitest/*` packages as
transitive dependencies, so no separate `vite` or `@vitest/*` package needs to
be declared. Vitest 4.1.9's Node floor (`^20.0.0 || ^22.0.0 || >=24.0.0`) keeps
CI's Node 20 supported, so the upgrade does not raise the repo's `engines` floor.
Keep the suite green with no weakening or deletion of tests. The `context.annotate`
API (with the `'warning'` annotation type) then becomes available for the
consistency-check work tracked in
[[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] — this task only performs the
upgrade and confirms the API is present; it does not add any annotation usage.

## Approach

1. Branch off `main` as `chore/upgrade-vitest`; `npm install` and `npm run build`
   to populate `node_modules` and `dist/`.
2. Record the baseline: `npm run test` is green on Vitest 2.1.9.
3. Bump the dependency to the latest release with `npm install -D vitest@4.1.9`
   (`vitest@latest` resolves to the same 4.1.9). Confirm `npx vitest --version`
   reports 4.1.9 and that `package-lock.json` is regenerated for `npm ci` with no
   stray 3.x/2.x refs. Confirm the 4.1.9 Node floor still admits CI's Node 20.
4. Run the full gate: `npm run test`, `npm run typecheck`, and `npx moon run :test`.
   No `vitest.config.ts` change and no test edits were required — the config is a
   one-line `test.include`, and the Vitest 2→3→4 upgrade introduced no breakage for
   it. `import.meta.glob` in `tests/yaml-parity.test.ts` continues to work unchanged
   (its 67 tests pass).
5. Confirm the Test Annotations API is present in the installed version:
   `context.annotate(message, type?, attachment?)` is declared in
   `@vitest/runner@4.1.9`'s types, and the built-in annotation types are
   `['notice', 'error', 'warning']` (used by the GitHub Actions reporter to emit
   `::notice` / `::error` / `::warning`).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `package.json` | modify | `vitest` devDependency bumped `^2.1.0` → `^4.1.9`. |
| `package-lock.json` | modify | Regenerated for the Vitest 4.x dependency tree (so `npm ci` installs 4.1.9, no stray 3.x/2.x refs). |

(`vitest.config.ts` and the `src/**`/`tests/**` test files need **no change** — the minimal `test.include` config and all 517 tests pass unchanged on 4.1.9; they're intentionally not listed above.)

## Acceptance criteria

- [ ] AC-1: `package.json` declares `vitest` on the 4.x line and `npx vitest --version` reports a 4.x major (4.1.9); `package-lock.json` is regenerated so `npm ci` installs it with no stray 3.x/2.x refs.
- [ ] AC-2: `npm run test` is green on Vitest 4.x (same pass/skip counts as the 2.1.9 baseline — 517 passed, 8 skipped).
- [ ] AC-3: `npm run typecheck` (`tsc --noEmit`) exits 0.
- [ ] AC-4: `npx moon run :test` is green (the moon-wrapped path CI uses).
- [ ] AC-5: `tests/yaml-parity.test.ts`'s `import.meta.glob` fixture discovery still works (its 67 tests pass).
- [ ] AC-6: Vitest 4.1.9's Node floor (`^20.0.0 || ^22.0.0 || >=24.0.0`) still admits CI's Node 20.
- [ ] AC-7: The Test Annotations API is available — `context.annotate` is exposed and the `'warning'` annotation type is supported — confirming the API the [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] approach depends on.

## Out of scope

- Implementing any `context.annotate` usage — adding the non-failing warning to the yaml-parity "peers exist" check is [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]]'s work, not this task's.
- Any change to test content, fixtures, or the runner configuration beyond the dependency bump.
- Reworking CI workflow files or the moon task definitions.

## Dependencies

- None blocking. Node 20+ (the repo's `engines` floor, matching CI) and npm as the canonical package manager.
- Unblocks [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]], which consumes the `context.annotate` API this upgrade makes available.
