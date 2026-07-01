---
type: task
schema_version: '5'
id: T-L77L
status: in-progress
created: '2026-06-30'
related:
- '[[M-0010]]'
tags:
- quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-07-01T19:28:36Z'
last_reviewed: '2026-07-01'
---
# Validate published-package hygiene with publint and are-the-types-wrong

## Goal

markdown-contract ships as a dual-entry ESM library with a subpath `exports`
map (`.` and `./declarative`), a `bin`, and hand-rolled `.d.ts` emitted by
`tsc` — exactly the shape where packaging and type-resolution bugs hide and
break downstream consumers silently (a subpath that resolves under Vite but
not Node, a `.d.ts` that the bundler resolver can't follow). This task adds
two industry-standard linters — **publint** (packaging correctness) and
**@arethetypeswrong/cli** / `attw` (type-resolution correctness across every
module-resolution mode) — that run against the *built, packed* package, and
gates them in CI so a packaging regression fails a PR instead of a consumer's
install.

## Today

The published-package surface is asserted only by hand: the `exports` map,
`bin`, and emitted `.d.ts` are eyeballed in review, and nothing checks that a
downstream consumer can actually resolve them.

| Location | Role today |
|---|---|
| `packages/core/package.json` | Declares the published surface — `exports` (`.` → `dist/index.js` + `dist/index.d.ts`; `./declarative` → `dist/declarative/index.js` + `.d.ts`), `bin` (`markdown-contract` → `dist/cli/index.js`), `main`/`types`, `"type":"module"`, `"sideEffects":false`, `files:["dist"]`. No script lints any of this. |
| `packages/core/tsconfig.build.json` | The build config (`tsc -p tsconfig.build.json`): `declaration: true`, `declarationMap: true`, `outDir: dist`, `rootDir: src` — emits the hand-rolled `.d.ts` next to each `.js` under `dist/`. Nothing verifies those `.d.ts` resolve for consumers. |
| `packages/core/moon.yml` | Single task source of truth — wraps the npm scripts as cached moon tasks (`build`, `typecheck`, `test`, `coverage`, `lint-docs`). `lint-docs` is the precedent: `deps: ['build']` so the build output (`dist/`, the gitignored artifact these tools must lint) is fresh before it runs. No package-hygiene task exists. |
| `packages/core/package.json#scripts` | Thin pass-throughs moon wraps (`build`, `typecheck`, `test`, `coverage`, `lint:docs`). No `lint:package` / type-resolution script. |
| `.github/workflows/ci.yml` | CI gate — runs `npx moon run :build :typecheck :coverage` on every PR and push to `main`. Does not check packaging or type resolution. |
| `sdlc.yaml#quality_checks` | Local task-work gate list (`npm run test`, `npm run typecheck`). No package-hygiene entry. |

## Proposed

publint and `@arethetypeswrong/cli` are dev dependencies, exposed as thin npm
scripts and wrapped by a cached moon `package-check` task that, like
`lint-docs`, declares `deps: ['build']` so it always lints a fresh `dist/`.
Both tools run against the *packed tarball* (what npm actually publishes,
honoring `files:["dist"]`), not loose source:

- **publint** lints `package.json`'s `exports`/`main`/`types`/`bin` packaging
  for broad compatibility (Node, Vite, webpack, etc.) and reports **0 errors**
  on the built package — every `exports` and `bin` target exists in the packed
  files, paths are well-formed, and there are no common-mistake findings.
- **attw** (`attw --pack .`) packs the directory and verifies that consumers
  **resolve the `.d.ts` correctly for both entry points** — `.` and
  `./declarative` — across node10, node16/nodenext, and bundler resolution
  modes, catching dual-entry / ESM `.d.ts` resolution bugs. Run under the
  `esm-only` profile (this package is ESM-only: `"type":"module"`, `exports`
  exposes only `import`/`default`), so "a CJS `require()` can't load it" is
  treated as intended, not a failure. Any remaining intentional exception is
  recorded explicitly via `--ignore-rules` / an `attw` config block, not
  silently tolerated.

CI gates both on every PR after the build, so a packaging or type-resolution
regression turns a PR red. Publishing/release automation stays out of scope —
this validates the package shape, it does not ship it.

## Approach

1. **Add the dev dependencies.** Add `publint` and `@arethetypeswrong/cli` to
   `package.json` `devDependencies` (latest stable of each), installed via
   `npm install` so `package-lock.json` updates.
2. **Add thin npm scripts** (pass-throughs, per the wrap pattern):
   - `"lint:package": "publint"` — publint runs `npm pack` internally to lint
     the exact published file set (so it needs `dist/` present).
   - `"check:types": "attw --pack . --profile esm-only"` — attw packs the dir
     and checks type resolution for every `exports` entry.
   - `"package-check": "npm run lint:package && npm run check:types"` — the
     combined check moon/CI invokes (assumes `dist/` already built, exactly as
     the moon task guarantees via its `build` dep).
3. **Model a cached moon task** `package-check` in `moon.yml`, mirroring
   `lint-docs`: `command: 'npm run package-check'`, `deps: ['build']` (so
   `dist/` is fresh first), `inputs: ['dist/**/*', 'package.json']`,
   `options: { cache: true }`.
4. **Wire it into CI.** **Open decision — recommended:** add a dedicated
   `.github/workflows/package-quality.yml` that runs `npx moon run
   :package-check` (moon pulls the `build` dep), so the shared `moon run` line
   in `ci.yml` stays untouched — that line is the one genuine coordination
   point across the concurrent M-0010 tasks, and a dedicated workflow avoids a
   merge-order rebase on it. **Alternative:** since both tools are node-based
   they fit the existing line — extend it to `npx moon run :build :typecheck
   :coverage :package-check` (one source of truth, but contends on the shared
   line). Pick the dedicated workflow unless the team prefers a single CI job.
5. **Triage the first run.** Run `npm run build` then `npm run package-check`
   locally. Expect publint clean given the current `exports` shape; if attw
   flags a real defect (e.g. a `.d.ts` that doesn't resolve under a given
   mode), **note it** — fixing the `exports` map is in scope only when attw
   surfaces a genuine resolution bug; otherwise an intended exception is
   pinned via `--ignore-rules <rule>` (or an `attw` config) with a one-line
   justification comment.
6. **Register the local gate.** Add `moon run :package-check` to `sdlc.yaml`
   `quality_checks` (additive) so the check also runs in task-work; using the
   moon task keeps the `build` dep honored locally.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/package.json` | modify | Add `publint` + `@arethetypeswrong/cli` devDeps; add `lint:package`, `check:types`, and combined `package-check` scripts. |
| `bun.lock` | modify | Root workspace lockfile updated when the two new devDeps are installed (committed; CI installs from it). |
| `packages/core/moon.yml` | modify | Add a cached `package-check` task wrapping `npm run package-check` with `deps: ['build']` (mirrors `lint-docs`). |
| `.github/workflows/package-quality.yml` | new | Dedicated CI workflow running `npx moon run :package-check` on every PR and push to `main` (recommended path; keeps `ci.yml`'s shared `moon run` line untouched). |
| `.github/workflows/ci.yml` | modify | Only if the alternative is chosen: extend the `moon run` task list to include `:package-check`. (Skipped under the recommended dedicated-workflow path.) |
| `sdlc.yaml` | modify | Add `moon run :package-check` to `quality_checks` (additive). |

## Acceptance criteria

- [ ] AC-1: `package.json` declares `publint` and `@arethetypeswrong/cli` as
  devDependencies and exposes `lint:package` (publint), `check:types` (attw),
  and a combined `package-check` script; `package-lock.json` reflects both.
- [ ] AC-2: `npm run build && npx publint` reports **0 errors** on the built
  package (warnings, if any, are reviewed and noted; the run exits 0).
- [ ] AC-3: `attw --pack . --profile esm-only` (after build) **passes for both
  entry points** — `.` and `./declarative` resolve their `.d.ts` correctly
  across node10, node16/nodenext, and bundler modes — exiting 0, with any
  intentional exception pinned via `--ignore-rules` / `attw` config and a
  justification comment (not an unexplained failure).
- [ ] AC-4: `moon.yml` defines a `package-check` task with `deps: ['build']`
  that runs the combined check; `moon run :package-check` from a clean tree
  builds `dist/` first, then runs publint and attw, exiting 0.
- [ ] AC-5: CI runs `package-check` on every pull request and push to `main`
  after the build (via the dedicated `package-quality.yml`, or the extended
  `ci.yml` `moon run` line if that alternative is taken); a deliberately
  broken `exports` target makes the check — and the PR — fail.
- [ ] AC-6: `sdlc.yaml` `quality_checks` includes `moon run :package-check`.

## Out of scope

- Publishing / release automation — `npm publish`, version bumping, npm
  provenance, changelogs, or tags. This task validates the package shape only.
- Changing the `exports` map, `bin`, or `tsconfig.build.json` emit shape —
  touched **only** if publint/attw surface a genuine defect (then noted and
  fixed minimally); no speculative restructuring.
- Generating, bundling, or rolling up the `.d.ts` (e.g. api-extractor) — attw
  validates the existing tsc-emitted declarations as-is.
- Runtime/import smoke-testing the published tarball in a throwaway consumer
  project — these tools check resolution statically, not execution.

## Dependencies

- Requires a successful `build` (a populated `dist/`); both tools lint the
  built/packed artifact, which is why the moon `package-check` task declares
  `deps: ['build']`. No hard task dependency, so no frontmatter `depends_on`.
- **Shared-surface coordination (M-0010 runs concurrently):** this task makes
  additive edits to `package.json` (devDeps + scripts), `package-lock.json`,
  `moon.yml` (a new task block), `sdlc.yaml` (`quality_checks`), and CI. The
  one genuine coordination point is the `npx moon run :...` task list in
  `.github/workflows/ci.yml`; the recommended dedicated `package-quality.yml`
  workflow avoids touching it, so the last M-0010 task to merge needs at most
  a trivial lockfile/`moon.yml` rebase, not a contended edit to the CI line.

## Discovery context

Surfaced while planning M-0010 (code quality tooling): the project lints and
type-checks its source and gates coverage, but nothing validates the
*published* package — the dual-entry `exports` map, `bin`, and hand-rolled
`.d.ts` that downstream consumers actually resolve — which is precisely the
shape publint and are-the-types-wrong exist to protect.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
