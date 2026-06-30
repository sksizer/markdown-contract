---
type: task
schema_version: '5'
id: T-IOUT
status: in-progress
created: '2026-06-28'
related:
- '[[M-0007-example-use-case-catalog]]'
- '[[B-OUTD-init-out-defaults-to-cwd-not-inferred-root]]'
depends_on: []
tags:
- test
- cli
- init
need_human_review: false
impact: low
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T06:22:42Z'
---
# `init --out` placement of the written scaffold

## Goal

Add the missing test that `init --out <dir>` writes the generated scaffold under the target directory (not cwd). Promoted from backlog B-IOUT; surfaced by catalog example `INFERENCE-INIT-08` in [[M-0007-example-use-case-catalog]].

## Today

`--inline` and the `--force` clobber-guard are tested, but `--out` (writing the scaffold into a target dir other than cwd) is exercised by **no** test — every `init` write in the suite defaults to cwd.

## Proposed

A small CLI test asserting that with `--out <dir>`, the generated config and `contracts/` land under `<dir>`, not in cwd.

## Approach

Add a case to `tests/inference.cli.test.ts` (and/or `src/declarative/infer.test.ts`) running `init --meta --out <tmpdir>` and asserting the written paths are under `<tmpdir>` (`markdown-contract.yaml` + `contracts/*.contract.yaml`), with cwd left untouched. Coverage only — no behavior change.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/inference.cli.test.ts` | modify | add a case asserting `init --meta --out <dir>` writes `markdown-contract.yaml` + `contracts/*.contract.yaml` under `<dir>`, cwd untouched |

## Acceptance criteria

- [ ] A test runs `init` with `--out <dir>` and asserts the config + `contracts/` are written under `<dir>`, not cwd.
- [ ] cwd is asserted unchanged by the run.
- [ ] `npm run typecheck` and `npm test` stay green.

## Out of scope

- The design question of what `--out` should **default** to — tracked separately by [[B-OUTD-init-out-defaults-to-cwd-not-inferred-root]]. This task covers only test coverage of the existing flag.

## Dependencies

- None. Pins existing `init --out` behavior. Promoted from the B-IOUT backlog note.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — new test `--out <dir> writes the scaffold under <dir>, leaving cwd untouched` in `tests/inference.cli.test.ts` runs `init --meta --out <outDir>` and asserts `markdown-contract.yaml` + `contracts/*.contract.yaml` land under `<outDir>`; verified by `npm test`.
- AC-2: auto — same test asserts `readdirSync(cwd).length === 0` and no `markdown-contract.yaml`/`contracts` appear in cwd (a fresh temp dir distinct from both the source vault and the write target).
- AC-3: auto — `npm run typecheck` + `npm test` green; baseline-gated quality run reported `OK 2/2` with no new drift.

### What worked

- The existing `tests/inference.cli.test.ts` conventions (`stageVault`, `runCli([...], { cwd })`, already-imported fs helpers) made the new case a near-mechanical addition — no new imports or helpers needed.
- Three-distinct-temp-dirs design (source vault / write target / cwd) made the "writes under `<dir>`, not cwd" contract assertable crisply with `readdirSync(cwd).length === 0`.

### Friction and automation gaps

- Step 7's baseline-gated quality run failed first with `baseline not found` — Step 3a captures the baseline under the **main repo's** `.sdlc/quality-baselines/`, but `quality run` invoked from the **worktree** defaults its `--baseline-dir` to the *worktree's* `.sdlc/`, so the SHA-keyed baseline is missing until `--baseline-dir <main-repo>/.sdlc/quality-baselines` is passed explicitly — task-work Step 7 should pass `--baseline-dir` pointing at the main checkout (or resolve it from the worktree's superproject) so the gate finds the baseline without operator intervention.
