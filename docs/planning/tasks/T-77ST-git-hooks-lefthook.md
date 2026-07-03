---
type: task
schema_version: '5'
id: T-77ST
status: planning/needs-definition
created: '2026-06-30'
related:
- '[[M-0010]]'
depends_on:
- '[[T-0MVN]]'
tags:
- quality
need_human_review: false
impact: medium
complexity: small
definition_gap: 'The spec is stale against the current toolchain and has a malformed
  touchpoint table, so it is not implementation-ready. (1) The "Files to touch" package.json
  row contains unescaped || pipe characters inside inline code (guarded || true),
  which breaks the markdown table parser: it is read as a 5-cell row and flagged as
  an empty-table-cell placeholder. Escape the pipes or rephrase. (2) The "Today" table
  references files that do not resolve: biome.json is actually biome.jsonc at the
  repo root, and the verbatim fixtures moved from tests/**/*.md to packages/core/tests/**/*.md
  in the Bun-workspace split (T-WKSP). (3) More broadly, the whole spec (Today/Proposed/Approach/Files-to-touch
  and AC-1/AC-4/AC-5) is written for an npm project (npm install, npm run typecheck,
  npm run test, package-lock.json, a prepare script fired by npm install, a root moon.yml,
  ci.yml running npx moon run) but the repo is a Bun + moon workspace: bun install
  from bun.lock, quality gates run via bunx moon run core:typecheck / core:test /
  core:lint, moon.yml lives in packages/core/, sdlc.yaml worktree_init is bun install,
  and CI runs bunx moon run :build :typecheck :coverage :lint. The pre-push gate,
  the hook-arming mechanism, and the lockfile/AC wording all need re-grounding in
  Bun/moon before pickup. The lefthook.yml and .editorconfig Today rows are expected-absent
  new files; the T-0MVN dependency is already closed/done, so Biome (biome.jsonc)
  is a live gate.'
---
# Add lefthook pre-commit hooks and EditorConfig

## Goal

Format, lint, type, and test failures are caught only in CI today — a
developer doesn't learn a commit is broken until the PR build goes red,
which wastes a round-trip per mistake. Adopt **lefthook** (a fast, parallel
git-hooks manager) to run Biome on staged files at `pre-commit` and the
heavier `typecheck` + test gates at `pre-push`, and add an `.editorconfig`
so editors emit Biome-shaped bytes in the first place. Net effect: the same
gates CI enforces are caught locally, before the push.

## Today

There is no local hook layer. Biome is scaffolded but only reachable by
hand (`npm run check`); the only enforced gate is CI, which runs after the
push. No `.editorconfig` exists, so editors infer indentation/EOL ad hoc.

| Location | Role today |
|---|---|
| `lefthook.yml` | Absent — no git-hooks manager is configured; nothing runs on commit or push. |
| `.editorconfig` | Absent — editors are not told the project's indent/EOL/charset, so style is inferred per-editor and only corrected later by Biome. |
| `package.json` | Has Biome scripts (`lint`, `format`, `check`) but no hook tooling and no `prepare` script; `devDependencies` carries no hooks manager. |
| `biome.json` | Biome is scaffolded (formatter space/2, lineWidth 100; linter `recommended` plus `noExplicitAny`/`noNonNullAssertion`/cognitive-complexity at `warn`) but not yet a gate — that promotion + tree reformat is T-0MVN. |
| `sdlc.yaml` | `worktree_init: [npm install]` bootstraps a fresh worktree but arms no git hooks; `quality_checks` lists `npm run test` / `npm run typecheck`. |
| `.github/workflows/ci.yml` | The only place format/type/test problems are caught today — `npx moon run :build :typecheck :coverage`, run after the push. |
| `tests/**/*.md` | Fixture input documents whose bytes are used **verbatim** (no trailing-whitespace/final-newline normalization) so position-pinned findings stay exact — any blanket whitespace rule must exempt these. |

## Proposed

A `lefthook.yml` at the repo root defines two stages:

- **`pre-commit`** — runs `biome check` on **staged files only**
  (glob-filtered to the files Biome handles), so the commit is fast and
  scoped to what's changing. Parallel across commands.
- **`pre-push`** — runs the heavier gates `npm run typecheck` and the test
  suite (`npm run test`), mirroring what CI gates, so a broken push is
  blocked locally.

A root `.editorconfig` encodes the Biome style — `indent_style = space`,
`indent_size = 2`, `charset = utf-8`, `end_of_line = lf`,
`insert_final_newline = true`, `trim_trailing_whitespace = true` — with a
`[*.md]` override that turns trailing-whitespace trimming and final-newline
insertion **off**, so Markdown hard-breaks survive and the verbatim
`tests/**/*.md` fixtures are never rewritten by an editor.

Hooks are **armed automatically**: a `"prepare": "lefthook install"` script
in `package.json` runs `lefthook install` on every `npm install` — including
the existing `worktree_init` step — and `worktree_init` also calls it
explicitly so a fresh worktree gets the hooks with no manual step.
`lefthook` is added as a committed devDependency. The change is **local-only**:
no `ci.yml` or `moon.yml` edit, and any developer can bypass a hook with
`git commit --no-verify` / `git push --no-verify` for an intentional WIP push.

## Approach

1. **Add the tool + arming.** `npm install --save-dev lefthook` (pins
   `lefthook` into `package.json` + `package-lock.json`) and add a
   `"prepare": "lefthook install"` script so every `npm install`/`npm ci`
   arms the hooks. *Decision:* guard as `"lefthook install || true"` so
   environments without a `.git` dir (or where hooks are unwanted) don't
   fail the install.
2. **Author `lefthook.yml`.** A `pre-commit` block with `parallel: true` and
   a `biome` command: `glob: '*.{ts,tsx,js,jsx,json,jsonc,mjs,cjs}'`,
   `run: npx biome check --no-errors-on-unmatched {staged_files}`. A
   `pre-push` block (`parallel: true`) with a `typecheck` command
   (`npm run typecheck`) and a `test` command (`npm run test`). Header
   comment documents the `--no-verify` bypass. *Decisions:* (a) pre-commit
   stays **check-only** (fail and let the dev fix) vs. auto-fixing with
   `run: npx biome check --write {staged_files}` + `stage_fixed: true` —
   default to check-only to keep the commit's content the developer's; (b)
   route pre-push through npm scripts (simple, decoupled) vs. mirroring CI
   exactly with `npx moon run :typecheck :test` (cached, CI-parity) — default
   to npm scripts, note moon as the parity alternative.
3. **Author `.editorconfig`.** `root = true`, a `[*]` block with the six
   settings above, and a `[*.md]` block setting
   `trim_trailing_whitespace = false` and `insert_final_newline = false` to
   protect Markdown hard-breaks and the verbatim `tests/**/*.md` fixtures.
4. **Wire worktree arming.** Add `npx lefthook install` to `worktree_init`
   in `sdlc.yaml` (additive, idempotent) — redundant with the `prepare`
   script but explicit and self-documenting for `/sdlc:task-work`'s bootstrap.
5. **Document the bypass.** Add a short note to `README.md` (Develop section)
   that the repo arms lefthook hooks on install and that `--no-verify`
   bypasses them.
6. **Verify locally.** Run `lefthook install`; stage a deliberately
   mis-formatted `.ts` and confirm `git commit` is blocked; run
   `lefthook run pre-push` (or push a branch with a type error) and confirm
   it's blocked; confirm `git commit --no-verify` / `git push --no-verify`
   skip the hooks; confirm staging only a `.md` file does not trip Biome.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `lefthook.yml` | new | Hook config: `pre-commit` runs `biome check` on glob-filtered `{staged_files}`; `pre-push` runs `npm run typecheck` + `npm run test` (parallel). Header comment documents `--no-verify`. |
| `.editorconfig` | new | Root editor style matching Biome (space/2, utf-8, lf, final newline, trim trailing); `[*.md]` override disables trailing-whitespace trim + final-newline insert for verbatim fixtures. |
| `package.json` | modify | Add `lefthook` devDependency; add `"prepare": "lefthook install"` (guarded `|| true`) so installs arm the hooks. |
| `sdlc.yaml` | modify | Add `npx lefthook install` to `worktree_init` so a fresh worktree arms the hooks explicitly. |
| `README.md` | modify | Note in the Develop section that hooks arm on install and `--no-verify` bypasses them. |

## Acceptance criteria

- [ ] AC-1: `lefthook.yml` exists at the repo root and `lefthook` is a committed `devDependency` in `package.json` (resolved in `package-lock.json`).
- [ ] AC-2: `.editorconfig` exists at the repo root with `indent_style = space`, `indent_size = 2`, `charset = utf-8`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`, and a `[*.md]` section that sets `trim_trailing_whitespace = false` and `insert_final_newline = false`.
- [ ] AC-3: The `pre-commit` hook runs Biome over **staged files only** — committing a staged, mis-formatted `.ts` file fails the commit, while a commit that stages only a non-Biome file (e.g. a `.md`) does not invoke Biome / does not fail on that account.
- [ ] AC-4: The `pre-push` hook runs `npm run typecheck` and the test suite — a push from a branch with a type error or a failing test is blocked.
- [ ] AC-5: Hooks arm on a fresh worktree/clone with no manual step — after `worktree_init`'s `npm install` (which fires the `prepare` script) the git hooks are installed, and `lefthook install` is idempotent on re-run.
- [ ] AC-6: A developer can bypass the hooks with `git commit --no-verify` and `git push --no-verify`, and that bypass is documented (lefthook header comment and `README.md`).
- [ ] AC-7: The change is local-only — `.github/workflows/ci.yml` and `moon.yml` are untouched and CI behavior is unchanged.

## Out of scope

- CI changes — hooks are a local pre-flight layer; wiring Biome into the CI gate (and reformatting the tree) is **T-0MVN**, not this task.
- Promoting the Biome lint rules from `warn` to `error` — also **T-0MVN**. Until then the `pre-commit` hook fails on formatting violations (Biome reports those as errors) but lint findings stay warnings, so the hook's lint value scales up when T-0MVN lands.
- Commit-message linting (commitlint / conventional-commit enforcement) and any `commit-msg`, `prepare-commit-msg`, or `post-merge` hook.
- Auto-fixing / re-staging in the hook (`biome check --write` + `stage_fixed: true`) — noted as a decision in Approach but defaulting off.

## Dependencies

- **Hard — T-0MVN (Adopt Biome for lint, format, and complexity gating).** The `pre-commit` hook invokes `biome check`; T-0MVN is what makes Biome a real, promoted gate (rules at `error`, tree reformatted). lefthook can be wired before T-0MVN merges — Biome is already scaffolded — but the hook's lint usefulness lands fully only once T-0MVN promotes the rules. Recorded in frontmatter `depends_on: ['[[T-0MVN]]']`.
- **Shared-surface coordination (M-0010 tasks run concurrently in separate worktrees).** This task makes **additive** edits to `package.json` (a `lefthook` devDependency + a `prepare` script) and `sdlc.yaml` (`worktree_init` entry) — both are new keys/list items, so a sibling task touching the same files resolves as a trivial rebase. This task deliberately does **not** touch `.github/workflows/ci.yml` or `moon.yml`, so it avoids the milestone's one genuine coordination point (the `moon run` task-list line in `ci.yml`) entirely.

## Discovery context

Surfaced while planning **M-0010** quality tooling: with Biome and coverage
landing as CI gates, the same format/lint/type/test failures were still only
caught after a push. A lefthook `pre-commit`/`pre-push` layer plus an
`.editorconfig` moves that feedback to the developer's machine, before CI.
