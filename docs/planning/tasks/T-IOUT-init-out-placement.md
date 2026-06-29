---
type: task
schema_version: '5'
id: T-IOUT
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0007-example-use-case-catalog]]'
  - '[[B-OUTD-init-out-defaults-to-cwd-not-inferred-root]]'
depends_on: []
tags:
  - test
  - cli
  - init
need_human_review: true
impact: low
complexity: small
autonomy: supervised
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

- `tests/inference.cli.test.ts`

## Acceptance criteria

- [ ] A test runs `init` with `--out <dir>` and asserts the config + `contracts/` are written under `<dir>`, not cwd.
- [ ] cwd is asserted unchanged by the run.
- [ ] `npm run typecheck` and `npm test` stay green.

## Out of scope

- The design question of what `--out` should **default** to — tracked separately by [[B-OUTD-init-out-defaults-to-cwd-not-inferred-root]]. This task covers only test coverage of the existing flag.

## Dependencies

- None. Pins existing `init --out` behavior. Promoted from the B-IOUT backlog note.
