---
type: task
schema_version: '5'
id: T-4E9T
status: planning/draft
created: '2026-06-28'
related:
- T-TXSC-text-constraint-fixture-scaffold
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Make yaml-parity 'peers exist' glob skip gated/peerless fixtures so subdirectory placement isn't load-bearing

## Goal

The always-on `tests/yaml-parity.test.ts` "peers exist" check globs
`./fixtures/validation/*.ts` non-recursively and asserts a `.contract.yaml`
peer for every match. That couples a fixture's *directory* to whether the
parity harness passes: a parity-peerless gated fixture (authored before its
declarative loader exists) must be tucked into a subdirectory the glob skips,
or the always-on harness fails. This task removes that load-bearing coupling
so a fixture's location stops silently gating the parity check, surfaced by
[[T-TXSC-text-constraint-fixture-scaffold]] in `git@github.com:sksizer/markdown-contract.git`.

> The always-on tests/yaml-parity.test.ts 'peers exist' check globs
> ./fixtures/validation/*.ts non-recursively and asserts a .contract.yaml
> peer for every match. This forces parity-peerless gated fixtures (authored
> before their declarative loader exists) into a subdirectory to dodge the
> glob, making fixture placement load-bearing and silently contradicting any
> 'no parity peer yet' acceptance criterion. Fix: teach the parity glob/test
> to recognize and exclude gated or peerless fixtures (e.g. recurse and skip
> fixtures whose component flag is off, or honor an explicit peerless opt-out
> marker) so a fixture's directory no longer determines whether the always-on
> parity harness fails.
>
> — [[T-TXSC-text-constraint-fixture-scaffold]]

## Today

_TBD — receiver to fill before promoting from planning/draft._

## Proposed

_TBD — receiver to fill before promoting from planning/draft._

## Approach

_TBD — receiver to fill before promoting from planning/draft._

## Files to touch

_TBD — receiver to fill before promoting from planning/draft._

## Acceptance criteria

_TBD — receiver to fill before promoting from planning/draft._

## Out of scope

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-TXSC-text-constraint-fixture-scaffold]] in git@github.com:sksizer/markdown-contract.git.
