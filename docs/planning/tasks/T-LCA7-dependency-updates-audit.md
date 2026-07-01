---
type: task
schema_version: "5"
id: T-LCA7
status: in-progress
created: 2026-06-30
related:
  - "[[M-0010]]"
tags:
  - quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: 2026-07-01T16:55:40Z
last_reviewed: 2026-07-01
prs:
  - https://github.com/sksizer/markdown-contract/pull/138
---
# Add Dependabot updates and a dependency-audit CI step

## Goal

Dependencies and CI action pins drift by hand today, and nothing fails the
build when a dependency carries a known vulnerability. Adopt **Dependabot** to
open grouped weekly update PRs for both the npm tree and the workflow action
pins, and add a **dependency vulnerability audit** that runs in CI and blocks
on high/critical advisories. Together these close the package-hygiene gap for
M-0010: deps stay current with low PR noise, and a vulnerable dependency turns
a PR red instead of shipping silently.

## Today

There is no automated dependency maintenance and no advisory scan; the npm
tree (canonical per D-0006) and the action pins are kept current manually.

| Location | Role today |
|---|---|
| `package.json` | Declares `dependencies` / `devDependencies`; its `scripts` block is the thin pass-through layer the wrap pattern builds on. No `audit` script exists, and no Dependabot config maintains these deps. |
| `bun.lock` | The committed root workspace lockfile CI installs from; it pins the resolved tree but is never scanned against an advisory database. |
| `.github/workflows/ci.yml` | CI runs `npx moon run :build :typecheck :coverage` on pull requests and pushes to `main`; no step scans dependencies for known vulnerabilities, and its `moon run` task list is the one genuine M-0010 coordination point. |
| `.github/workflows/` | Holds only `ci.yml` today — room for a single-purpose, parallel-safe audit workflow that runs in its own file without touching the shared CI job. |

## Proposed

A new `.github/dependabot.yml` (Dependabot v2) configures **two** ecosystems,
both on a **weekly** cadence:

- `package-ecosystem: npm`, `directory: "/"` — keeps `package.json` +
  `package-lock.json` current. Routine bumps are **grouped** to cut PR noise:
  a `dev-dependencies` group (development deps, minor + patch) and a
  production minor+patch group, so the bulk of churn lands as two PRs/week;
  major bumps stay ungrouped so they get individual scrutiny.
- `package-ecosystem: github-actions`, `directory: "/"` — keeps the action
  pins in `.github/workflows/*.yml` (`actions/checkout@v4`,
  `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`,
  etc.) current, all action bumps grouped into one PR/week.

A new `.github/workflows/audit.yml` runs a **dependency vulnerability scan** on
every pull request (and pushes to `main`): checkout → `actions/setup-node@v4`
(Node 20) → `npm ci` → `npm audit --audit-level=high`, which reads
`package-lock.json` and **exits non-zero on a high or critical advisory** while
tolerating low/moderate (reported, not blocking). The same command is exposed
as an additive `audit` npm script so the gate is reproducible locally.

The audit is delivered as its **own workflow file** rather than a moon task on
CI's `moon run` line — see Approach step 3 for the trade-off — so this task's
footprint is isolated to two new files plus one additive `package.json` script,
and it merges independently of the other M-0010 tasks.

## Approach

1. Add `.github/dependabot.yml` (`version: 2`) with two `updates` entries.
   - **npm:** `package-ecosystem: "npm"`, `directory: "/"`,
     `schedule.interval: "weekly"`; a `groups` map batching routine bumps —
     e.g. a `dev-dependencies` group (`dependency-type: "development"`,
     `update-types: ["minor", "patch"]`) and a `production-minor-patch` group
     (`dependency-type: "production"`, `update-types: ["minor", "patch"]`);
     `open-pull-requests-limit: 5`.
   - **github-actions:** `package-ecosystem: "github-actions"`,
     `directory: "/"`, `schedule.interval: "weekly"`, with a `groups` entry
     (`patterns: ["*"]`) so all action bumps arrive as a single PR.
2. Add an `audit` script to `package.json` `scripts` —
   `"audit": "npm audit --audit-level=high"` — a thin pass-through matching the
   wrap pattern, so the gate runs identically locally and in CI. **Open
   decision:** audit the full tree (default) vs. scope the blocking gate to
   production deps with `--omit=dev` and treat dev-only advisories as
   informational; recommend the full tree for the first pass, with `--omit=dev`
   noted as a later refinement.
3. Add `.github/workflows/audit.yml` — a single `ubuntu-latest` job triggered
   on `pull_request` and `push` to `main`: `actions/checkout@v4`,
   `actions/setup-node@v4` (`node-version: "20"`, `cache: npm`), `npm ci`, then
   `npm run audit`. Document the threshold and block decision in a header
   comment. **Decision (recommended):** ship this as a dedicated workflow rather
   than a moon `:audit` task wired into `ci.yml`'s `moon run` line. Trade-off —
   the dedicated file does **not** ride moon's caching and shows as a separate
   PR check, but it touches neither `ci.yml`'s coordination line nor `moon.yml`,
   so it is fully parallel-safe with the rest of M-0010; the moon-task path
   stays available as a later consolidation.
4. Document the chosen severity threshold (block on high/critical; tolerate
   low/moderate) and the network-dependency rationale (it queries the advisory
   DB, so it lives in CI rather than the offline moon-cached checks) in the
   workflow comment. Verify locally: `npm audit --audit-level=high` exits 0 on
   the current clean tree, and `npx @action-validator/cli` (or a YAML lint)
   accepts both new files.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/dependabot.yml` | new | Dependabot v2 config: two `updates` entries — `npm` (directory `/`, weekly, grouped dev + production minor/patch) and `github-actions` (directory `/`, weekly, all bumps grouped). |
| `.github/workflows/audit.yml` | new | Vulnerability-scan workflow: on PRs + pushes to `main`, `npm ci` then `npm audit --audit-level=high` against `package-lock.json`, blocking on high/critical. |
| `package.json` | modify | Additive `audit` script (`npm audit --audit-level=high`) in `scripts` — thin pass-through so the gate is reproducible locally. |

## Acceptance criteria

- [ ] AC-1: `.github/dependabot.yml` exists, parses as a valid Dependabot v2 config, and declares two `updates` entries — `package-ecosystem: npm` (`directory: "/"`) and `package-ecosystem: github-actions` (`directory: "/"`) — each with `schedule.interval: weekly`.
- [ ] AC-2: The npm entry defines a `groups` map that batches routine bumps (at minimum a development-dependency group and a production minor+patch group) so weekly churn lands as a small number of grouped PRs rather than one per dependency.
- [ ] AC-3: A dependency vulnerability scan runs in CI on pull requests — `.github/workflows/audit.yml` checks out, runs `npm ci`, and runs `npm audit --audit-level=high` against `package-lock.json` — failing the job (non-zero exit) on a high/critical advisory while tolerating low/moderate.
- [ ] AC-4: The blocking severity threshold (high) and the block decision are documented in the audit workflow, and an `audit` npm script (`npm audit --audit-level=high`) reproduces the same gate locally.
- [ ] AC-5: A deliberately-introduced high/critical advisory — e.g. temporarily pinning a dependency to a version carrying a known high-severity GHSA advisory (described here, not actually committed) — would turn the audit job red; a clean tree exits 0.
- [ ] AC-6: The change touches only `.github/dependabot.yml`, `.github/workflows/audit.yml`, and the additive `audit` script in `package.json` — it does not modify `.github/workflows/ci.yml`'s `moon run` task list or add a task block to `moon.yml`.

## Out of scope

- Auto-merging Dependabot PRs (branch-protection rules, required-status-check wiring, and merge automation) — configured in repository settings / a separate automation, not in `dependabot.yml`.
- SBOM generation (CycloneDX / SPDX) and secret scanning — the latter is GitHub-native and configured separately; both are out of this task's footprint.
- Wiring the audit into the cached moon pipeline (`moon.yml` task + `ci.yml` `moon run` line) or the local `quality_checks` in `sdlc.yaml` — the audit is network-dependent, so it ships in its own CI workflow; the moon-task path stays a later refinement, noted in Approach step 3.
- Remediating any advisories the first audit surfaces — standing up the gate is this task; fixing what it flags is follow-up work.
- Evaluating or adopting `osv-scanner` (Google's OSV.dev-backed scanner, which also reads `package-lock.json`) as an alternative or supplement to `npm audit` — recorded as a fallback if the npm advisory DB proves too noisy, but not implemented here.

## Dependencies

- none — no hard dependency on another M-0010 task; `depends_on` stays empty.
- **Shared-surface note:** the only additive shared-surface edit is the `audit` script in `package.json` `scripts` (additive, low collision risk). By shipping the scan as a dedicated `.github/workflows/audit.yml`, this task deliberately avoids the one genuine M-0010 coordination point — the `npx moon run …` task list in `.github/workflows/ci.yml` — and adds no `moon.yml` task block, so it merges independently of the sibling quality tasks (e.g. [[T-0MVN-biome-lint-format]], [[T-79GV-vitest-coverage]]).

## Discovery context

Surfaced while planning M-0010 quality tooling: package hygiene needs both a way
to keep dependencies and CI action pins current (Dependabot) and a gate that
fails the build on known-vulnerable dependencies (an audit step). Neither exists
in the repo today.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
