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

- [ ] Test **coverage is measured and gated** — `vitest` v8 coverage runs in CI with
  per-metric thresholds that fail the build on a regression ([[T-79GV-vitest-coverage]]).
- [ ] **Biome** lints and formats the TypeScript with a CI gate, including a
  per-function complexity rule ([[T-0MVN-biome-lint-format]]).
- [ ] Repo-wide **code metrics** — lines of code and a cyclomatic-complexity estimate —
  are reported in CI via `scc` ([[T-X07O-code-metrics-scc]]).
- [ ] The **published package is validated** — `publint` + `are-the-types-wrong` confirm
  the `exports` map and `.d.ts` resolution are correct for consumers
  ([[T-L77L-package-publish-hygiene]]).
- [ ] **Dead code and unused dependencies** are surfaced by `knip`
  ([[T-HIL6-knip-dead-code]]).
- [ ] **Local pre-commit/pre-push hooks** (lefthook) + an `.editorconfig` catch issues
  before CI ([[T-77ST-git-hooks-lefthook]]).
- [ ] **Dependency updates and a vulnerability audit** run automatically — Dependabot
  PRs + a CI audit step ([[T-LCA7-dependency-updates-audit]]).
- [ ] Every gate is wired through the moon task graph (or a dedicated workflow) so it is
  reproducible locally (`moon run :<task>`) and enforced in CI.

## Deliverables

The seven member tasks split into a **foundation** delivered by the milestone-opening
PR and **five parallel followers**, each independent and pickable in any order
(except lefthook, which builds on Biome).

### Foundation (landed in the milestone-opening PR)

- [x] [[T-79GV-vitest-coverage]] — vitest v8 coverage + per-metric threshold gate, wired
  as the moon `:coverage` task and run in CI. **Done in the opening PR.**
- [ ] [[T-0MVN-biome-lint-format]] — Biome is *scaffolded* in the opening PR (devDep,
  `biome.json`, `lint`/`format`/`check` scripts, usable locally); this task does the
  repo-wide format/lint application + the blocking CI gate + the complexity rule. Split
  out because a one-shot reformat collides with in-flight branches and must land
  deliberately.

### Parallel followers (independent tasks)

- [ ] [[T-X07O-code-metrics-scc]] — `scc` lines-of-code + cyclomatic-complexity reporting
  (report-only).
- [ ] [[T-L77L-package-publish-hygiene]] — `publint` + `are-the-types-wrong` on the built
  package.
- [ ] [[T-HIL6-knip-dead-code]] — `knip` unused files/exports/dependencies (report-only
  first, then gate).
- [ ] [[T-77ST-git-hooks-lefthook]] — lefthook pre-commit/pre-push hooks + `.editorconfig`
  (depends on Biome).
- [ ] [[T-LCA7-dependency-updates-audit]] — Dependabot (npm + github-actions) + a CI
  vulnerability audit step.

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
