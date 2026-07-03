---
type: task
schema_version: "5"
id: T-0MVN
status: closed/done
created: 2026-06-30
related:
  - "[[M-0010 Quality Tooling]]"
tags:
  - quality
  - lint
  - format
  - biome
  - complexity
need_human_review: false
impact: medium
complexity: medium
last_reviewed: 2026-07-02
prs:
  - https://github.com/sksizer/markdown-contract/pull/169
completion_note: "Shipped via #169. Final M-0010 quality-tooling task: repo-wide Biome format/lint pass, complexity gate promoted to error (ceiling 46), biome ci wired into CI."
---
# Adopt Biome for lint, format, and per-function complexity gating

## Goal

The project has no linter or formatter. Biome was **scaffolded** in the M-0010 opening PR
(devDep, `biome.json`, `lint`/`format`/`check` scripts — usable locally) but is *not*
wired into CI and the repo is *not* yet formatted to its style. This task does the
disruptive half: apply the repo-wide format/lint pass, promote the relaxed rules to a real
gate (including per-function complexity), and enforce `biome ci` in CI. It is split from
the scaffold because a one-shot reformat collides with in-flight branches and must land
deliberately, when the worktree fleet is relatively quiet.

## Today

| Location | Role today |
|---|---|
| `biome.json` | Scaffolded: formatter `space`/2/lineWidth 100, linter `recommended` with `noExplicitAny` + `noNonNullAssertion` + `noExcessiveCognitiveComplexity` all at `warn`, `organizeImports` off. Defines the target style; nothing enforces it. |
| `package.json` | Has `@biomejs/biome` devDep + `lint` (`biome lint .`), `format` (`biome format --write .`), `format:check`, `check` (`biome check .`) scripts — runnable locally, not gated |
| `packages/core/src/**/*.ts` | TypeScript source not yet Biome-formatted: `biome format` would touch ~46 files across `src` + `tests`; enabling `organizeImports` would reorder imports across ~130 files; ~4 functions exceed cognitive-complexity 15 |
| `packages/core/tests/**/*.ts` | TypeScript tests not yet Biome-formatted: swept by the same `biome format` pass (part of the ~46 files) and the same `organizeImports` reorder |
| `.github/workflows/ci.yml` | Runs `moon run :build :typecheck :coverage` — no lint/format gate |
| `packages/core/moon.yml` | No `lint` task |

## Proposed

`biome ci` is a **blocking** CI gate — formatting, lint (recommended), import organization,
and a per-function cognitive-complexity ceiling — modeled as a moon `lint` task (or a
dedicated `lint.yml`). The repo is fully Biome-formatted (a no-op on re-run), the
deliberately-relaxed rules are resolved (fixed or explicitly kept relaxed with rationale),
and the complexity rule is promoted from `warn` to a real ceiling.

## Approach

1. **Pick the quiet window.** Coordinate with open task PRs/worktrees before the format
   pass to minimize conflicts (this is the main risk — see Dependencies).
2. Run `biome format --write .` and commit the format pass as its own atomic commit
   (~46 files, mechanical).
3. Decide `organizeImports`: either turn it `on` and apply the import reorder (~130 files,
   one mechanical commit) or keep it `off` with a note. Recommend on, applied separately.
4. Triage the `warn` rules: fix the auto-fixable lint findings (`biome lint --write`),
   then for `noExplicitAny` / `noNonNullAssertion` (pervasive in the parser/AST + Zod code)
   either refactor or keep them relaxed deliberately with a comment in `biome.json`.
5. Promote `noExcessiveCognitiveComplexity` from `warn` to `error` — refactor the ~4
   functions over 15, or set `maxAllowedComplexity` just above today's max so it gates new
   regressions. Record the choice.
6. Add a moon `lint` task wrapping `biome ci .` (or `npm run check`), and wire it into CI —
   extend the `moon run` line to include `:lint`, **or** add a dedicated `lint.yml`.
7. Add the lint gate to `sdlc.yaml` `quality_checks`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/**/*.ts` | modify | Apply `biome format` (+ optional import organize) — mechanical reformat |
| `packages/core/tests/**/*.ts` | modify | Apply `biome format` (+ optional import organize) — mechanical reformat |
| `biome.json` | modify | Promote rule severities (complexity → error; resolve any/non-null decisions); maybe enable `organizeImports` |
| `packages/core/moon.yml` | modify | Add a `lint` task running `biome ci` |
| `.github/workflows/ci.yml` | modify | Add `:lint` to the moon run line (or add `lint.yml`) |
| `package.json` | modify | Optionally add a `lint:fix` (`biome check --write`) script |
| `sdlc.yaml` | modify | Add the lint gate to `quality_checks` |

## Acceptance criteria

- [ ] AC-1: `biome ci .` exits 0 on a clean checkout — repo is fully formatted and lint-clean
  (re-running `biome format` produces no diff).
- [ ] AC-2: The lint gate runs in CI and **blocks** a PR that introduces a format/lint
  violation (demonstrable with a deliberate violation).
- [ ] AC-3: `noExcessiveCognitiveComplexity` is enforced at `error` with a documented
  ceiling; a function exceeding it fails the gate.
- [ ] AC-4: `moon run :lint` (or the dedicated workflow) reproduces the CI gate locally.
- [ ] AC-5: The format pass is a self-contained mechanical commit, separate from any rule
  or wiring change, to keep review/rebase tractable.

## Out of scope

- The Biome *scaffold* (config + scripts + devDep) — already delivered in the opening PR.
- Markdown / YAML formatting — Biome does not format those; the planning-doc corpus is
  validated by `lint-docs`, not Biome.
- Pre-commit hooks that run Biome — that is [[T-77ST-git-hooks-lefthook]] (depends on this).

## Dependencies

- The scaffold (`biome.json`, scripts, devDep) is in place from the M-0010 opening PR.
- **Soft coordination, not a blocker:** the repo has many in-flight worktrees; landing the
  format pass while they are open creates rebase churn. Sequence the reformat for a quiet
  window. Shares `package.json` / `moon.yml` / `ci.yml` additively per the milestone note.

## Discovery context

Surfaced while planning [[M-0010 Quality Tooling]] code-quality tooling. Biome was chosen over
ESLint+Prettier / oxlint for a one-tool lint+format+complexity pass that fits the
Bun/moon/TS stack. The scaffold landed immediately; this task carries the disruptive
application + gate.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `bunx moon run core:lint` (→ `biome ci .`) exits 0 on the reformatted tree; re-running `biome format packages/core` reports "No fixes applied" (idempotent).
- AC-2: auto + agent-manual — CI wiring is auto (`.github/workflows/ci.yml` now runs `bunx moon run :build :typecheck :coverage :lint`); the blocking behaviour was demonstrated agent-manual with a scratch probe (bad formatting + a `noSelfCompare` error) → `biome ci` and `moon run core:lint` both exit 1. Probe deleted.
- AC-3: auto + agent-manual — `noExcessiveCognitiveComplexity` is promoted to `error` in `biome.jsonc` with a documented ceiling (`maxAllowedComplexity: 46`, today's maximum); demonstrated agent-manual with a scratch function of complexity > 46 → gate fails on the complexity rule at error, exit 1. Probe deleted.
- AC-4: auto — `bunx moon run core:lint` reproduces the CI gate locally and exits 0 (rides the Step-7 quality gate, `OK 5/5`).
- AC-5: auto — commit `5f0d7b6` (format pass) is exactly `biome format --write packages/core`: verified byte-identical to `biome format(parent-tree)` for the changed files, 51 `.ts` files only, no config/logic. The four commits are isolated: format / organize-imports / lint-error resolution / gate-wiring.

### What worked

- The mechanical core (`biome format --write`, then `biome check --write` with linter+formatter disabled for import organization) was fully hands-off. A pre-flight grep confirmed zero side-effect-only imports, so the ~90-file import reorder carried no ordering risk — 662 tests stayed green after every commit.
- The baseline-gated `quality run --diff-against-baseline` cleanly reported `OK 5/5` with zero new drift, so the reformat's large mechanical diff did not require triaging the 289 deliberately-relaxed `any`/non-null warnings.
- Empirically probing biome.json comment support up front (it breaks parsing; biome.jsonc is required) meant the config-rename decision was settled before any commit.

### Friction and automation gaps

- `let parsed: ReturnType<typeof parseArgs>` did not typecheck — node:util's generic `parseArgs` default widens `values` and broke ~10 downstream uses — so a `parseCliArgs()` wrapper had to be extracted to recover the call-site return type. A readiness spec that says "annotate the type" for a generic stdlib function should require a pre-implementation typecheck of the proposed annotation, since "add a type" is not always mechanical.
- The spec estimated "~4 functions over cognitive-complexity 15"; the real count is 16 (max 46). Refactoring them is out of scope for a behavior-preserving reformat, so the ceiling was set to 46 to gate regressions only — leaving genuine complexity debt. Captured as a follow-up backlog task on this branch (ratchet the ceiling down by refactoring the worst offenders).
- Test fixtures still carry stale `// eslint-disable-next-line @typescript-eslint/...` comments though the repo now lints with Biome, not ESLint. Captured as a follow-up backlog task on this branch (sweep and remove/convert to `biome-ignore`).
- `noExplicitAny` (104) and `noNonNullAssertion` (185) are kept at `warn` deliberately (pervasive in the parser/AST + Zod code) — honest but noisy debt surfaced on every lint run. Noted here; not separately spawned (folds into the same Biome-debt theme as the complexity ratchet).
