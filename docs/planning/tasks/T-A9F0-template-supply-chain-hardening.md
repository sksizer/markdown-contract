---
type: task
schema_version: "5"
id: T-A9F0
status: in-progress
created: 2026-07-04
related:
  - "[[M-0010 Quality Tooling]]"
tags:
  - quality
  - security
  - dependencies
need_human_review: false
impact: medium
complexity: small
autonomy: autonomous/pr
readiness_verified_at: 2026-07-04T17:53:18Z
last_reviewed: 2026-07-04
prs:
  - https://github.com/sksizer/markdown-contract/pull/235
---
# Adopt node-template supply-chain hardening: Dependabot cooldown + exact devDependency pins

## Goal

The [sksizer/node-template](https://github.com/sksizer/node-template) library-health
baseline (tracked in `README.md`) carries a supply-chain-hardening layer this
workspace lacks: Dependabot **cooldown windows** (a freshly-published — possibly
compromised — release is never adopted until it has aged 7 days, 30 for majors)
and **exact devDependency pins** (no `^`/`~` ranges, so a lockfile regeneration
cannot silently float onto a new release). Adopt both, adapted to the Bun
workspace, closing the one layer gap the README baseline section records.

## Today

CI already installs with `bun install --frozen-lockfile`, so the committed
`bun.lock` pins what actually installs — the hardening here is defense in depth
against lockfile *regeneration* and against adopting fresh releases at all.

| Location | Role today |
|---|---|
| `.github/dependabot.yml` | Two ecosystems (`npm` monthly grouped, limit 3; `github-actions` weekly grouped). **No `cooldown` block on either.** The header comment stale-claims "both on a weekly cadence". |
| `package.json` | Root devDeps mixed: `@moonrepo/cli` already exact (`2.3.5`), but `@biomejs/biome` `^2.2.0`, `knip` `^5`, `lefthook` `^2.1.9` are ranges. |
| `packages/core/package.json` | All ten devDependencies use `^` ranges (`typescript` `^5.7.2`, `vitest` `^4.1.9`, …). Runtime `dependencies` also use ranges — those are consumer-facing and stay ranged. |
| `apps/web/package.json` | Workspace app manifest with its own ranged devDependencies. |
| `apps/daemon-web-prototype/package.json` | Prototype manifest with ranged devDependencies (not a moon project, still in the install tree). |
| `sites/docs/package.json` | Docs-site manifest with ranged devDependencies. |
| `bun.lock` | The committed lockfile the exact pins must match, so `bun install --frozen-lockfile` stays clean. |
| `README.md` | The "Library health baseline" section names this layer as the known gap — updated once the gap closes. |

## Proposed

`dependabot.yml` carries a `cooldown` block (`default-days: 7`,
`semver-major-days: 30`) on **both** ecosystems, with the stale cadence comment
fixed and the cooldown rationale documented (mirrors node-template's comment:
lockfile + frozen install pin what installs; audit gates known advisories;
cooldown closes the fresh-compromise window). Every workspace manifest's
`devDependencies` are exact-pinned to the versions already resolved in
`bun.lock`; runtime `dependencies` of the published `packages/core` library
keep their ranges (consumers need range flexibility). The README baseline
section no longer lists the gap.

## Approach

1. Add the `cooldown` block to both `updates` entries in
   `.github/dependabot.yml` (`default-days: 7`, `semver-major-days: 30`),
   fix the header comment's stale "weekly" claim (npm is monthly), and note
   the cadence deviation from the template (npm monthly here, actions weekly)
   as deliberate.
2. Exact-pin `devDependencies` in all five workspace manifests (root,
   `packages/core`, `apps/web`, `apps/daemon-web-prototype`, `sites/docs`) to
   the versions currently resolved in `bun.lock` (read the locked version per
   package; do not bump anything in this task).
3. Leave `packages/core` runtime `dependencies` ranged — record the
   dev-vs-runtime pin policy as a one-line comment or README note.
4. Run `bun install --frozen-lockfile` and confirm it exits clean (exact pins
   matching locked versions must not change resolution). Guard against the
   known local-bun `configVersion` lockfile churn
   ([[B-L0CK-bun-lock-configversion-churn-from-local-proto-bun]]) — revert any
   spurious lock diff.
5. Update the README "Library health baseline" section: the supply-chain layer
   is no longer a gap.
6. Run the quality gate (`bunx moon run core:build core:typecheck core:lint
   core:test`) to confirm nothing shifted.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/dependabot.yml` | modify | Add `cooldown` (7/30) to both ecosystems; fix stale cadence comment; document rationale. |
| `package.json` | modify | Exact-pin the three ranged root devDeps. |
| `packages/core/package.json` | modify | Exact-pin all devDependencies; runtime `dependencies` untouched. |
| `apps/web/package.json` | modify | Exact-pin devDependencies. |
| `apps/daemon-web-prototype/package.json` | modify | Exact-pin devDependencies. |
| `sites/docs/package.json` | modify | Exact-pin devDependencies. |
| `README.md` | modify | Baseline section: remove the supply-chain-gap sentence. |

## Acceptance criteria

- [ ] AC-1: Both `updates` entries in `.github/dependabot.yml` carry `cooldown` with `default-days: 7` and `semver-major-days: 30`, and the header comment matches the actual cadences.
- [ ] AC-2: `grep -E '"[~^]' <manifest>` over the `devDependencies` blocks of all five workspace manifests returns nothing — every devDependency is exact-pinned.
- [ ] AC-3: `packages/core` runtime `dependencies` still use ranges (consumer-facing policy unchanged).
- [ ] AC-4: `bun install --frozen-lockfile` exits 0 with no `bun.lock` diff — the pins match what was already resolved.
- [ ] AC-5: The README "Library health baseline" section no longer names supply-chain hardening as a gap.
- [ ] AC-6: `bunx moon run core:build core:typecheck core:lint core:test` stays green.

## Out of scope

- Bumping any dependency version — pins freeze the currently-locked versions;
  updates keep arriving via Dependabot (now cooled down).
- Pinning GitHub Actions to commit SHAs instead of tags — a further hardening
  step the template also does not take; capture separately if wanted.
- npm publish provenance / SBOM generation — out of the template's layer and
  this task's footprint.
- Changing Dependabot cadences (npm monthly / actions weekly stay as they are).

## Dependencies

- none — additive config edits; no ordering constraints with in-flight tasks.

## Discovery context

Surfaced by the node-template baseline comparison (2026-07-04, README
"Library health baseline" section): the template's `pr10-supply-chain-hardening`
layer adds Dependabot cooldown and exact devDependency pins; this workspace had
neither. The comparison found every other layer present or exceeded here.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
