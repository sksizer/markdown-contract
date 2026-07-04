---
type: task
schema_version: '5'
id: T-77ST
status: open/ready
created: '2026-06-30'
last_reviewed: '2026-07-03'
related:
- '[[M-0010 Quality Tooling]]'
depends_on:
- '[[T-0MVN]]'
tags:
- quality
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-07-04T00:46:14Z'
---
# Add lefthook pre-commit hooks and EditorConfig

## Goal

Format, lint, type, and test failures are caught only in CI today — a
developer doesn't learn a commit is broken until the PR build goes red,
which wastes a round-trip per mistake. Adopt **lefthook** (a fast, parallel
git-hooks manager) to run Biome on staged files at `pre-commit` and the
heavier typecheck + test gates at `pre-push`, and add an `.editorconfig`
so editors emit Biome-shaped bytes in the first place. Net effect: the same
gates CI enforces are caught locally, before the push.

## Today

There is no local hook layer. Biome is a live CI gate (T-0MVN shipped: the
tree is formatted, `core:lint` runs `biome ci .` in CI), but nothing runs it
at commit time. No `.editorconfig` exists, so editors infer indentation/EOL
ad hoc. The repo is a **Bun + moon workspace**: `bun install` from the
committed `bun.lock`, tasks run via `bunx moon run core:<task>`.

| Location | Role today |
|---|---|
| `biome.jsonc` | Root Biome config (formatter space/2, lineWidth 100; complexity rule at `error`), enforced in CI via the moon `core:lint` task. Nothing runs it locally on commit. |
| `package.json` | Workspace root: devDeps `@biomejs/biome`, `@moonrepo/cli`, `knip`; scripts `audit` / `lint:deps` / `metrics`. No hooks manager, no `prepare` script. |
| `packages/core/package.json` | Carries the per-package scripts moon wraps (`typecheck`, `test`, `lint`, `check`, …). |
| `packages/core/moon.yml` | Task source of truth — `core:typecheck` / `core:test` are the cached gates a pre-push hook should reuse. |
| `bun.lock` | The committed workspace lockfile a new `lefthook` devDependency must land in. |
| `sdlc.yaml` | `worktree_init: [bun install]` bootstraps a fresh worktree but arms no git hooks; `quality_checks` runs the moon gates. |
| `.github/workflows/ci.yml` | Where problems are caught today — `bunx moon run :build :typecheck :coverage :lint`, after the push. |
| `packages/core/tests/harness.ts` | `loadSource` loads fixture `.md` bytes **verbatim** (no trailing-newline normalization) so position-pinned findings stay exact — any editor whitespace rule must exempt Markdown. |

## Proposed

A `lefthook.yml` at the repo root defines two stages:

- **`pre-commit`** — runs `bunx biome check --no-errors-on-unmatched` on
  **staged files only** (glob-filtered to the files Biome handles), so the
  commit is fast and scoped to what's changing.
- **`pre-push`** — runs the heavier cached gates
  `bunx moon run core:typecheck core:test`, mirroring what CI gates, so a
  broken push is blocked locally.

A root `.editorconfig` encodes the Biome style — `indent_style = space`,
`indent_size = 2`, `charset = utf-8`, `end_of_line = lf`,
`insert_final_newline = true`, `trim_trailing_whitespace = true` — with a
`[*.md]` override that turns trailing-whitespace trimming and final-newline
insertion **off**, so Markdown hard-breaks survive and the verbatim
`packages/core/tests/**/*.md` fixtures are never rewritten by an editor.

Hooks are **armed automatically**: a `"prepare": "lefthook install"` script
in the root `package.json` runs on `bun install` (Bun executes the root
package's `prepare` lifecycle script), and `worktree_init` in `sdlc.yaml`
also calls `bunx lefthook install` explicitly so a fresh worktree gets the
hooks with no manual step. `lefthook` is a committed root devDependency. The
change is **local-only**: no `ci.yml` or `moon.yml` edit, and any developer
can bypass a hook with `git commit --no-verify` / `git push --no-verify`
for an intentional WIP push.

## Approach

1. **Add the tool + arming.** `bun add -d lefthook` at the workspace root
   (lands in root `package.json` + `bun.lock`) and add a
   `"prepare": "lefthook install"` script. *Decision:* guard the script so
   environments without a `.git` dir don't fail the install — write it as
   `lefthook install` followed by a shell or-true guard (the exact form is
   `"lefthook install \|\| true"` — pipes escaped here only for this table's
   markdown; the JSON value uses plain pipes). Verify empirically that
   `bun install` fires the root `prepare` script; if it does not in the
   pinned Bun version, the explicit `worktree_init` entry (step 4) is the
   arming path and the `prepare` script stays as the npm-compat fallback.
2. **Author `lefthook.yml`.** A `pre-commit` block with `parallel: true` and
   a `biome` command: `glob: '*.{ts,tsx,js,jsx,json,jsonc,mjs,cjs}'`,
   `run: bunx biome check --no-errors-on-unmatched {staged_files}`. A
   `pre-push` block with a single command running
   `bunx moon run core:typecheck core:test` (moon parallelizes and caches
   the two tasks; this mirrors the CI gates). Header comment documents the
   `--no-verify` bypass. *Decision:* pre-commit stays **check-only** (fail
   and let the dev fix) rather than auto-fixing with `--write` +
   `stage_fixed: true` — keep the commit's content the developer's.
3. **Author `.editorconfig`.** `root = true`, a `[*]` block with the six
   settings from Proposed, and a `[*.md]` block setting
   `trim_trailing_whitespace = false` and `insert_final_newline = false` to
   protect Markdown hard-breaks and the verbatim fixture bytes.
4. **Wire worktree arming.** Add `bunx lefthook install` to `worktree_init`
   in `sdlc.yaml` (additive, idempotent) — explicit and self-documenting
   for `/sdlc:task-work`'s bootstrap, and the guaranteed arming path.
5. **Document the bypass.** Add a short note to `README.md` (Toolchain
   section) that the repo arms lefthook hooks on install and that
   `--no-verify` bypasses them.
6. **Verify locally.** Run `bunx lefthook install`; stage a deliberately
   mis-formatted `.ts` and confirm `git commit` is blocked; run
   `bunx lefthook run pre-push` on a branch with a type error and confirm
   it fails; confirm `git commit --no-verify` skips the hook; confirm
   staging only a `.md` file does not invoke Biome.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `lefthook.yml` | new | Hook config: `pre-commit` runs `bunx biome check` on glob-filtered `{staged_files}`; `pre-push` runs `bunx moon run core:typecheck core:test`. Header comment documents `--no-verify`. |
| `.editorconfig` | new | Root editor style matching Biome (space/2, utf-8, lf, final newline, trim trailing); `[*.md]` override disables trailing-whitespace trim + final-newline insert for verbatim fixtures. |
| `package.json` | modify | Add `lefthook` devDependency and the guarded `prepare` script (see Approach step 1) so installs arm the hooks. |
| `bun.lock` | modify | Lockfile picks up the `lefthook` devDependency. |
| `sdlc.yaml` | modify | Add `bunx lefthook install` to `worktree_init` so a fresh worktree arms the hooks explicitly. |
| `README.md` | modify | Note in the Toolchain section that hooks arm on install and `--no-verify` bypasses them. |

## Acceptance criteria

- [ ] AC-1: `lefthook.yml` exists at the repo root and `lefthook` is a committed devDependency in the root `package.json`, resolved in `bun.lock`.
- [ ] AC-2: `.editorconfig` exists at the repo root with `indent_style = space`, `indent_size = 2`, `charset = utf-8`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`, and a `[*.md]` section that sets `trim_trailing_whitespace = false` and `insert_final_newline = false`.
- [ ] AC-3: The `pre-commit` hook runs Biome over **staged files only** — committing a staged, mis-formatted `.ts` file fails the commit, while a commit that stages only a non-Biome file (e.g. a `.md`) does not invoke Biome / does not fail on that account.
- [ ] AC-4: The `pre-push` hook runs `bunx moon run core:typecheck core:test` — a push from a branch with a type error or a failing test is blocked (demonstrable via `bunx lefthook run pre-push` on a branch with a deliberate type error).
- [ ] AC-5: Hooks arm on a fresh worktree with no manual step — after `worktree_init` runs (`bun install` + `bunx lefthook install`) the `.git` hooks are installed, and `lefthook install` is idempotent on re-run.
- [ ] AC-6: A developer can bypass the hooks with `git commit --no-verify` and `git push --no-verify`, and that bypass is documented (lefthook header comment and `README.md`).
- [ ] AC-7: The change is local-only — `.github/workflows/ci.yml` and `packages/core/moon.yml` are untouched and CI behavior is unchanged.

## Out of scope

- CI changes — hooks are a local pre-flight layer; the Biome CI gate already
  exists (T-0MVN, shipped).
- Commit-message linting (commitlint / conventional-commit enforcement) and
  any `commit-msg`, `prepare-commit-msg`, or `post-merge` hook.
- Auto-fixing / re-staging in the hook (`biome check --write` +
  `stage_fixed: true`) — noted as a decision in Approach but defaulting off.
- Running knip or the audit in a hook — those stay CI-side (knip's gating
  posture is [[T-3L9Q-knip-gating-flip]]).

## Dependencies

- [[T-0MVN]] — **satisfied** (closed/done via #169): Biome is a live,
  promoted gate, so the pre-commit hook enforces real rules. Kept in
  frontmatter `depends_on` for the record; it no longer blocks pickup.
- Shared-surface note: edits to root `package.json` / `bun.lock` /
  `sdlc.yaml` are additive; no edit to `ci.yml` or any `moon.yml`, so this
  merges independently of other open tasks.

## Discovery context

Surfaced while planning **M-0010** quality tooling: with Biome and coverage
landing as CI gates, the same format/lint/type/test failures were still only
caught after a push. Re-grounded 2026-07-03: the original spec was written
npm-first (npm install, package-lock.json, root moon.yml) and pre-dated the
Bun-workspace split; this revision resolves the recorded `definition_gap` —
Bun lifecycle arming, `bun.lock`, `biome.jsonc`, `packages/core` moon tasks,
and the escaped-pipe touchpoint row.
