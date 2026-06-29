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
# Upgrade Vitest from 2.1.x to the latest 3.x to stay current and unlock the Test Annotations API

## Goal

Upgrade the test runner from Vitest `^2.1.0` (2.1.9) to the latest 3.x release so
the suite stays on a supported major and so we gain the **Test Annotations API**
(`context.annotate(message, type)`, new in Vitest 3.0). That API lets a test emit
a non-failing annotation — including `type: 'warning'` — that surfaces in the
reporter (and as a `::warning` GitHub Actions workflow command in CI) instead of
forcing a hard pass/fail.

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

Bump the `vitest` devDependency to the latest 3.x line (3.2.6) and regenerate
`package-lock.json`. Vitest 3 bundles its own Vite and `@vitest/*` packages as
transitive dependencies, so no separate `vite` or `@vitest/*` package needs to
be declared. Keep the suite green with no weakening or deletion of tests. The
`context.annotate` API (with the `'warning'` annotation type) then becomes
available for the consistency-check work tracked in
[[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] — this task only performs
the upgrade and confirms the API is present; it does not add any annotation
usage.

## Approach

1. Branch off `main` as `chore/upgrade-vitest`; `npm install` and `npm run build`
   to populate `node_modules` and `dist/`.
2. Record the baseline: `npm run test` is green on Vitest 2.1.9.
3. Bump the dependency to the latest 3.x release with `npm install -D vitest@^3.2.6`
   (note: `vitest@latest` now resolves to 4.x, so the 3.x line is pinned
   explicitly to match the stated target). Confirm `npx vitest --version` reports
   3.2.6 and that `package-lock.json` is regenerated for `npm ci`.
4. Run the full gate: `npm run test`, `npm run typecheck`, and `npx moon run :test`.
   No `vitest.config.ts` change and no test edits were required — the config is
   tiny and Vitest 2→3 introduced no breakage for it. `import.meta.glob` in
   `tests/yaml-parity.test.ts` continues to work unchanged.
5. Confirm the Test Annotations API is present in the installed version:
   `context.annotate(message, type?, attachment?)` is declared in
   `@vitest/runner`'s types, and the built-in annotation types are
   `['notice', 'error', 'warning']` (used by the GitHub Actions reporter to emit
   `::notice` / `::error` / `::warning`).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `package.json` | modify | `vitest` devDependency bumped `^2.1.0` → `^3.2.6`. |
| `package-lock.json` | modify | Regenerated for the Vitest 3.x dependency tree (so `npm ci` installs 3.2.6). |
| `vitest.config.ts` | none | No change required — the minimal `test.include` config is unaffected by the 2→3 upgrade. |
| `src/**/*.test.ts`, `tests/**/*.test.ts` | none | No test edits required — all 517 tests pass unchanged on 3.2.6. |

## Acceptance criteria

- [ ] AC-1: `package.json` declares `vitest` on the 3.x line and `npx vitest --version` reports a 3.x major (3.2.6); `package-lock.json` is regenerated so `npm ci` installs it.
- [ ] AC-2: `npm run test` is green on Vitest 3.x (same pass/skip counts as the 2.1.9 baseline — 517 passed, 8 skipped).
- [ ] AC-3: `npm run typecheck` (`tsc --noEmit`) exits 0.
- [ ] AC-4: `npx moon run :test` is green (the moon-wrapped path CI uses).
- [ ] AC-5: `tests/yaml-parity.test.ts`'s `import.meta.glob` fixture discovery still works (its 67 tests pass).
- [ ] AC-6: The Test Annotations API is available — `context.annotate` is exposed and the `'warning'` annotation type is supported — confirming the API the [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] approach depends on.

## Out of scope

- Implementing any `context.annotate` usage — adding the non-failing warning to the yaml-parity "peers exist" check is [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]]'s work, not this task's.
- Upgrading to Vitest 4.x — this task deliberately targets the latest 3.x line.
- Any change to test content, fixtures, or the runner configuration beyond the dependency bump.
- Reworking CI workflow files or the moon task definitions.

## Dependencies

- None blocking. Node 20+ (the repo's `engines` floor, matching CI) and npm as the canonical package manager.
- Unblocks [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]], which consumes the `context.annotate` API this upgrade makes available.
