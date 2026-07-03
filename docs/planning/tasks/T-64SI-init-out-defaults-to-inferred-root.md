---
type: task
schema_version: '5'
id: T-64SI
status: open/ready
created: '2026-07-02'
related:
- '[[M-0003-config-inference]]'
- '[[C-0008-config-scaffolding]]'
- '[[D-0009-config-inference]]'
- '[[T-IOUT-init-out-placement]]'
tags:
- infer
- cli
- init
- dx
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
---
# init defaults the scaffold write to the single inferred root, not cwd

## Goal

`init <dir>` reads the corpus under `<dir>` but writes the scaffold to the **current
working directory** by default — while the two other path surfaces it emits are anchored
to `<dir>`: the generated include globs are relative to the inferred root, and `--check`
loads the config from `resolve(root, "markdown-contract.yaml")` — *inside* `<dir>`. So
the common round-trip `init <dir>` → `init <dir> --check` fails with "no config to
--check" unless `cwd == <dir>` or the user remembered `--out <dir>`, and a config written
at the repo root carries globs (`*.md`, `capabilities/**/*.md`) that only make sense when
the validate run-root is `<dir>`. Default the write target to the **single inferred
root** so config, `contracts/`, and the root-relative globs share one base and `--check
<dir>` finds what `init <dir>` wrote; a multi-root run has no single natural base, so it
keeps the cwd default with a warning.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/cli/run.ts#runInit` | Resolves `outDir = flags.out ? resolve(cwd, flags.out) : cwd` — the default base is cwd, not the inferred root |
| `packages/core/src/cli/run.ts#runInitCheck` | `--check` loads the config from `resolve(root, INIT_CONFIG_NAME)` — *inside* the target root, where the default write never put it |
| `packages/core/src/cli/run.ts#USAGE` | Documents `--out <dir>` with no statement of the default (`where to write (default: cwd)` lives only in a parseArgs comment) |
| `packages/core/src/declarative/infer.ts#InferredContract` | `include: string[]` — "rule globs, relative to the run root": the globs are root-anchored by design, which is what makes the cwd default inconsistent |
| `packages/core/tests/inference.cli.test.ts` | Every default-write case runs `init` with `cwd: dir`, so cwd and root coincide and the mismatch is invisible; the `--out` case (from [[T-IOUT-init-out-placement]]) pins explicit placement only; the multi-root case (`init a b --meta`) writes to cwd |

## Proposed

- **Single root, no `--out`** — the scaffold (`markdown-contract.yaml` + `contracts/`, or
  the one inline contract file) is written under the inferred root: `outDir = absRoots[0]`
  when `absRoots.length === 1`. `init <dir>` then yields a tree where `validate <dir>` and
  `init <dir> --check` work immediately, from any cwd.
- **Multiple roots, no `--out`** — keep cwd as the base (there is no single natural root)
  and print a one-line warning to stderr naming the chosen base and suggesting `--out`.
- **Explicit `--out`** — unchanged, in both modes; it already overrides everything.
- The clobber guard, `--force`, `--dry-run`, and the self-check are untouched — they
  already operate on the resolved `outDir`. USAGE states the new default.

## Approach

1. In `packages/core/src/cli/run.ts#runInit`, change the `outDir` fallback from `cwd` to
   `absRoots.length === 1 ? absRoots[0] : cwd` (the `flags.out` branch is unchanged).
   When the multi-root cwd fallback is taken, append a stderr warning line:
   `init: multiple roots — writing the scaffold to the current directory (pass --out <dir> to choose)`.
2. Update the USAGE `--out` line and the `runInit` doc comment to state the default:
   the single inferred root, or cwd for a multi-root run.
3. Extend `packages/core/tests/inference.cli.test.ts`:
   - a case running `init <dir>` with `cwd ≠ dir` asserting `markdown-contract.yaml` +
     `contracts/` land under `<dir>` and cwd is untouched;
   - a follow-on `init <dir> --check` from that same foreign cwd asserting exit 0 —
     the round-trip that fails today;
   - a multi-root case (`init a b --meta` with `cwd ≠ a`) asserting the scaffold lands
     in cwd and the warning line is printed.
   Existing cases all pass `cwd: dir`, where old and new defaults coincide — they should
   stay green unmodified (the `--out` case from [[T-IOUT-init-out-placement]] is
   unaffected by construction).
4. Update `docs/planning/decisions/D-0009-config-inference.md` (§ The CLI surface, the
   `--out` line) and `docs/planning/capabilities/C-0008-config-scaffolding.md` (CLI
   usage) to record the new default.
5. Verify: `npm run build && npm test` green; dogfood `init docs/planning --meta --dry-run`
   from the repo root, and a scratch-dir round-trip `init <dir> --meta` →
   `init <dir> --check` from a foreign cwd exits 0.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/cli/run.ts#runInit` | modify | Default `outDir` to the single inferred root (cwd only for multi-root, with a stderr warning); update USAGE + doc comment |
| `packages/core/tests/inference.cli.test.ts` | modify | Foreign-cwd default-write case, `init → --check` round-trip case, multi-root cwd-fallback + warning case |
| `docs/planning/decisions/D-0009-config-inference.md` | modify | § The CLI surface: `--out` default is the single inferred root |
| `docs/planning/capabilities/C-0008-config-scaffolding.md` | modify | One line on the write-placement default |

## Acceptance criteria

- [ ] AC-1: `init <dir>` run from a cwd outside `<dir>` writes `markdown-contract.yaml`
  and `contracts/` under `<dir>`; cwd is left untouched (asserted by a test).
- [ ] AC-2: `init <dir>` followed by `init <dir> --check`, both from a foreign cwd,
  exits 0 — the round-trip no longer requires `--out` or `cd` (asserted by a test).
- [ ] AC-3: A multi-root run without `--out` writes the scaffold to cwd and prints a
  warning naming the fallback and suggesting `--out` (asserted by a test).
- [ ] AC-4: Explicit `--out <dir>` behavior is byte-identical to today in single- and
  multi-root modes; the [[T-IOUT-init-out-placement]] test passes unmodified.
- [ ] AC-5: The clobber guard still refuses to overwrite at the *new* default location
  without `--force`.
- [ ] AC-6: USAGE, D-0009 (§ The CLI surface), and C-0008 state the default;
  `npm run typecheck` and `npm test` are green.

## Out of scope

- Warning when `cwd ≠ <dir>` and `--out` was given — explicit `--out` is always honored
  silently.
- Re-anchoring the generated include globs to cwd instead (the globs' root-relative
  design is correct per [[D-0009-config-inference]]; the write target moves, not the
  globs).
- Any change to `--check`'s lookup location — `resolve(root, INIT_CONFIG_NAME)` is the
  fixed point this task aligns the writer with.
- Multi-root base policy beyond the cwd-plus-warning fallback (e.g. erroring, or one
  scaffold per root).

## Dependencies

- None blocking. Builds on the shipped `init` verb ([[T-INIT-config-inference-init-verb]])
  and the `--out` coverage from [[T-IOUT-init-out-placement]] (whose test pins the
  explicit-`--out` behavior this task must not disturb).

## Discovery context

- Promoted from backlog capture B-OUTD (`init` writes the scaffold to cwd, but its globs
  are anchored to the inferred root), surfaced while tracing a manual `init` test that
  clobbered the repo-root `markdown-contract.yaml`. Re-confirmed 2026-07-02 while
  verifying [[M-0003-config-inference]]: a fresh `init <dir> --meta` → `init <dir>
  --check` round-trip failed with "no config to --check" until the scaffold was moved
  into `<dir>` by hand.
