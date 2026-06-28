---
type: backlog
schema_version: '1'
id: B-IOUT
last_reviewed: '2026-06-28'
tags:
- test
- cli
- init
---
# init --out placement of the written scaffold

`--inline` and the `--force` clobber-guard are tested, but `--out` (writing the scaffold
into a target dir other than cwd) is exercised by **no** test — every `init` write in the
suite defaults to cwd. A small CLI test should assert the generated files land under the
`--out` directory (config + `contracts/`), not in cwd.

Surfaced by catalog example `INFERENCE-INIT-08` (inline vs split, and place with
`--out`/`--force`) in [[M-0010-example-use-case-catalog]]. Priority: low. Related:
[[B-OUTD-init-out-defaults-to-cwd-not-inferred-root]] — the design question of what `--out`
should *default* to (this note is only about *test coverage* of the existing flag).
