---
type: backlog
schema_version: '1'
id: B-OUTD
last_reviewed: '2026-06-27'
tags:
- infer
- cli
- dx
---
# `init` writes the scaffold to cwd, but its globs are anchored to the inferred root

`init <dir> --meta` reads the corpus under `<dir>` but writes the scaffold to the
current working directory by default (`outDir = flags.out ? … : cwd`,
`src/cli/run.ts:259`). The two kinds of path in the generated
`markdown-contract.yaml` then disagree on their base:

- **Contract refs** (`./contracts/<name>.contract.yaml`, `src/declarative/infer.ts:669`)
  are relative to the config file, so they resolve fine next to the written config.
- **Include globs** (`capabilities/**/*.md`, `*.md`, `src/declarative/infer.ts:632`)
  are relative to the **inferred root**, not cwd — the code states this at
  `src/declarative/infer.ts:81` (`// rule globs, relative to the run root`).

So when `cwd ≠ <dir>` (e.g. running `init --meta docs/planning` from the repo
root), the config lands at the repo root carrying globs that only make sense when
the validate run-root is `docs/planning`. The bare `*.md → <root>` rule, run from
the repo root, would scoop up every top-level `.md` in the repo instead of just
the planning root. There is a matching surprise in `--check`: it looks for the
config at `resolve(root, INIT_CONFIG_NAME)` — *inside* `<dir>`
(`src/cli/run.ts:336`) — whereas `init` wrote it to cwd, so the two don't line up
without `--out`.

**Idea:** default `--out` to the (single) inferred root rather than cwd, so the
common `init --meta <dir>` case is self-consistent — config, `contracts/`, and the
root-relative globs all share `<dir>` as their base, and `--check <dir>` finds
what `init <dir>` wrote. For a multi-root run there is no single natural base, so
keep cwd (or require explicit `--out`) and document it.

Payoff: `init --meta <dir>` produces a config you can immediately
`validate <dir>` / `init --check <dir>` against, instead of one whose globs
silently mismatch unless you remember `--out <dir>` or `cd` into the root first.

Surfaced while tracing where `init --meta` writes its output: the file-clobber
during a manual `init` test (root `markdown-contract.yaml` overwritten, plural
per-group contracts dropped into the repo-root `contracts/`) was a symptom of the
cwd-vs-inferred-root default, not a bug in the inferer itself.

Out of scope for this capture: the multi-root base policy (whether to error,
fall back to cwd, or pick the first root), and whether to also warn when
`cwd ≠ <dir>` and no `--out` was given.
