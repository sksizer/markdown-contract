---
type: milestone
schema_version: '1'
id: M-0010
status: open/active
title: Code quality tooling — coverage, lint, metrics, and package hygiene
created: '2026-06-30'
related:
  - '[[M-0005-monorepo-tooling]]'
  - '[[T-VQ1N-ci-quality-checks]]'
tasks:
  - '[[T-79GV-vitest-coverage]]'
  - '[[T-0MVN-biome-lint-format]]'
  - '[[T-X07O-code-metrics-scc]]'
  - '[[T-L77L-package-publish-hygiene]]'
  - '[[T-HIL6-knip-dead-code]]'
  - '[[T-77ST-git-hooks-lefthook]]'
  - '[[T-LCA7-dependency-updates-audit]]'
tags:
  - quality
  - tooling
  - biome
  - coverage
  - ci
  - milestone
need_human_review: true
---
# Code quality tooling — coverage, lint, metrics, and package hygiene

## Goal

Stand up an automated code-quality layer over the markdown-contract library: test
coverage with a gate, a lint + format toolchain (Biome), repo-wide code metrics
(lines of code + cyclomatic complexity), published-package hygiene, dead-code
detection, local pre-commit hooks, and dependency-update + vulnerability automation.
Each tool plugs into the existing **moon → CI** pipeline that [[T-VQ1N-ci-quality-checks]]
established (today CI runs only `build` + `typecheck` + `test`). The milestone is
structured so its members are **independent and parallelizable** — one tool per task,
each owning its own config file and adding only additive edits to the shared surfaces.

## Success criteria

- [x] Test **coverage is measured and gated** — `vitest` v8 coverage runs in CI with
  per-metric thresholds that fail the build on a regression ([[T-79GV-vitest-coverage]]).
- [x] **Biome** lints and formats the TypeScript with a CI gate, including a
  per-function complexity rule ([[T-0MVN-biome-lint-format]], PR #169).
- [x] Repo-wide **code metrics** — lines of code and a cyclomatic-complexity estimate —
  are reported in CI via `scc` ([[T-X07O-code-metrics-scc]], PR #166).
- [x] The **published package is validated** — `publint` + `are-the-types-wrong` confirm
  the `exports` map and `.d.ts` resolution are correct for consumers
  ([[T-L77L-package-publish-hygiene]], PR #144).
- [x] **Dead code and unused dependencies** are surfaced by `knip`
  ([[T-HIL6-knip-dead-code]], PR #143 — report-only by design; the gating flip is
  [[T-3L9Q-knip-gating-flip]]).
- [ ] **Local pre-commit/pre-push hooks** (lefthook) + an `.editorconfig` catch issues
  before CI ([[T-77ST-git-hooks-lefthook]]).
- [x] **Dependency updates and a vulnerability audit** run automatically — Dependabot
  PRs + a CI audit step ([[T-LCA7-dependency-updates-audit]], PR #138).
- [ ] Every gate is wired through the moon task graph (or a dedicated workflow) so it is
  reproducible locally (`moon run :<task>`) and enforced in CI. *(Met for coverage,
  Biome, package-check, and audit; knip is deliberately report-only until
  [[T-3L9Q-knip-gating-flip]] lands.)*

## Deliverables

The seven member tasks split into a **foundation** delivered by the milestone-opening
PR and **five parallel followers**, each independent and pickable in any order
(except lefthook, which builds on Biome).

### Foundation (landed in the milestone-opening PR)

- [x] [[T-79GV-vitest-coverage]] — vitest v8 coverage + per-metric threshold gate, wired
  as the moon `:coverage` task and run in CI. **Done in the opening PR.**
- [x] [[T-0MVN-biome-lint-format]] — Biome is *scaffolded* in the opening PR (devDep,
  `biome.json`, `lint`/`format`/`check` scripts, usable locally); this task does the
  repo-wide format/lint application + the blocking CI gate + the complexity rule. Split
  out because a one-shot reformat collides with in-flight branches and must land
  deliberately.

### Parallel followers (independent tasks)

- [x] [[T-X07O-code-metrics-scc]] — `scc` lines-of-code + cyclomatic-complexity reporting
  (report-only). **Shipped via #166.**
- [x] [[T-L77L-package-publish-hygiene]] — `publint` + `are-the-types-wrong` on the built
  package. **Shipped via #144.**
- [x] [[T-HIL6-knip-dead-code]] — `knip` unused files/exports/dependencies (report-only
  first, then gate). **Shipped via #143** (report-only; gate = [[T-3L9Q-knip-gating-flip]]).
- [ ] [[T-77ST-git-hooks-lefthook]] — lefthook pre-commit/pre-push hooks + `.editorconfig`
  (depends on Biome). **The last open member task.**
- [x] [[T-LCA7-dependency-updates-audit]] — Dependabot (npm + github-actions) + a CI
  vulnerability audit step. **Shipped via #138.**

### Follow-ups (debt surfaced by the member tasks; not milestone members)

Defined implementation-ready 2026-07-03 so they can be dispatched independently:

- [[T-D8TE-ratchet-biome-complexity-ceiling]] — ratchet `maxAllowedComplexity` from
  46 toward 15 (16 functions over the recommended ceiling).
- [[T-JGCX-biome-noexplicitany-source-fix]] — eliminate the `noExplicitAny` warnings
  at the source and promote the rule to `error`.
- [[T-FOCX-biome-nononnull-source-fix]] — eliminate the `noNonNullAssertion` warnings
  with real narrowing and promote the rule to `error`.
- [[T-1C0J-remove-stale-eslint-disable-comments]] — sweep the 65 stale
  `eslint-disable` comments left from pre-Biome fixtures.
- [[T-W1CX-knip-baseline-dead-code-cleanup]] — delete the 13-finding knip baseline in
  `packages/core`.
- [[T-3L9Q-knip-gating-flip]] — triage the newer `apps/web` / `sites/docs` findings
  and make knip a blocking gate (depends on T-W1CX).
- [[T-SQFB-document-moon-runinci-dedicated-workflow]] — document the
  `runInCI: false` + side-gate-workflow + `CI:''` convention.

### Shared-surface coordination

Because the tasks run concurrently, they converge on a few shared files. Each task keeps
its footprint to its own new config file plus **additive** edits here:

- `package.json` — devDeps + thin pass-through scripts (additive, low-conflict).
- `moon.yml` — one new task block per tool (additive).
- `.github/workflows/ci.yml` — the `moon run :build :typecheck :coverage …` task list is
  the **one genuine coordination point**; tasks that can use a dedicated workflow file
  (`metrics.yml`, `audit.yml`) do so to avoid touching it.
- `sdlc.yaml` — `quality_checks` (additive).

The last follower to merge may need a trivial rebase on `package.json` / the CI task line.

## Out of scope

- Reformatting the whole repo to Biome's style — that one-shot churn is owned by
  [[T-0MVN-biome-lint-format]], not bundled into the opening PR.
- Release / publish automation (`npm publish`, provenance, changelogs) — package *hygiene*
  is validated here ([[T-L77L-package-publish-hygiene]]), but publishing is separate.
- A Node-version / OS build **matrix** — the Node-compatibility gate is owned by
  [[M-0005-monorepo-tooling]].
- Branch-protection / required-status-check configuration — that lives in GitHub repo
  settings, not in these files.
- Commit-message linting (commitlint) and auto-merge of Dependabot PRs.

## Risks / open questions

- **Reformat churn vs. in-flight work.** The repo has many concurrent worktrees; the
  Biome repo-wide format pass ([[T-0MVN-biome-lint-format]]) should land when the tree is
  relatively quiet to keep conflicts manageable.
- **Knip noise.** First-run knip output is typically noisy; [[T-HIL6-knip-dead-code]]
  starts report-only and triages a baseline before gating.
- **CI task-list contention.** Concurrent edits to the `moon run` line in `ci.yml` are the
  main merge friction; dedicated workflow files mitigate it where a tool is not node-based.
- **scc install in CI.** `scc` is a Go binary, not an npm dep — [[T-X07O-code-metrics-scc]]
  must pin a release for reproducible numbers.
