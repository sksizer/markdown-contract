---
type: task
schema_version: '5'
id: T-4E9T
status: open/ready
created: '2026-06-28'
related:
- T-TXSC-text-constraint-fixture-scaffold
- T-TXYL-declarative-requires-forbids
- T-TXFX-text-constraint-fixtures
- T-VITE-upgrade-vitest
depends_on:
- T-VITE-upgrade-vitest
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Make yaml-parity 'peers exist' glob skip gated/peerless fixtures so subdirectory placement isn't load-bearing

## Goal

A safety-net test (`tests/yaml-parity.test.ts`, the "peers exist" check) requires
every validation fixture written in TypeScript to have a matching YAML twin
(`.contract.yaml`) sitting right next to it — that twin is what proves the
programmatic and declarative ways of writing a contract agree. But some fixtures
are written *before* the YAML version of their feature exists, so they can't have
a twin yet.

Today such a twin-less fixture only passes the check by being hidden in a
subfolder: the check scans the top fixtures folder but not its subfolders, so
moving a fixture down one level sneaks it past. That makes a fixture's *folder
location* secretly decide whether the test passes — easy to break by accident and
hard to explain to the next person.

This task removes that hidden coupling: let a fixture declare "no YAML twin, on
purpose" explicitly (a marker the check honors), so folder placement stops being
load-bearing and a twin-less fixture can live wherever it belongs. Surfaced by
[[T-TXSC-text-constraint-fixture-scaffold]].

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

The "peers exist" block in `tests/yaml-parity.test.ts` globs
`./fixtures/validation/*.ts` and `./fixtures/consumption/*.ts` **non-recursively**
and `expect(...).not.toThrow()`s on a `.contract.yaml` twin for every match — a
**hard test failure** when one is missing. Twin-less fixtures (authored before
their declarative loader exists) stay green only by hiding in a subfolder the glob
skips. That workaround is live now: `tests/fixtures/validation/text/` holds the 5
text-constraint fixtures (`22`–`25`) precisely because declarative text constraints
([[T-TXYL-declarative-requires-forbids]]) aren't built yet, so they have no twins.
A fixture's directory is load-bearing.

## Proposed

Demote the existence check from a hard failure to a **non-failing warning**, and
let a fixture mark itself twin-less on purpose. The *behavioral* parity tests (the
two `describe`s that actually run the YAML against the TS and compare findings) stay
hard — only the housekeeping "does a twin file exist" check softens. Folder
placement then gates nothing: twin-less fixtures live beside their peers.

## Approach

1. Recurse the fixture globs (`**/*.ts`) so subfolders stop hiding fixtures —
   placement is no longer a workaround.
2. Add an explicit opt-out: a fixture exporting a `peerless: true` marker is
   recognized as intentionally twin-less and excluded from the "must have a twin"
   expectation. (Marker shape decided at impl — a field on the fixture object is
   simplest; thread it through `tests/harness.ts`.)
3. Replace the hard `expect(...).not.toThrow()` with a warning: for each
   non-peerless fixture missing a twin, emit `context.annotate(message, 'warning')`
   (the Test Annotations API from vitest 3.2, delivered by
   [[T-VITE-upgrade-vitest]]) so it surfaces as a non-failing GitHub Actions
   annotation. The test passes.
4. Move the 5 `tests/fixtures/validation/text/` fixtures up into
   `tests/fixtures/validation/` and mark them `peerless` until
   [[T-TXYL-declarative-requires-forbids]] / [[T-TXFX-text-constraint-fixtures]]
   give them real twins; delete the now-empty `text/` subfolder.

## Files to touch

| File | Kind | Why |
| --- | --- | --- |
| `tests/yaml-parity.test.ts` | modify | recursive glob, peerless opt-out, `annotate` warning in place of the hard existence assert |
| `tests/harness.ts` | modify | carry the `peerless` marker on the fixture type if that's where it lives |
| `tests/fixtures/validation/text/*` | move | relocate fixtures `22`–`25` up to `tests/fixtures/validation/`, mark peerless, remove the subfolder |

## Acceptance criteria

- `npm run test` passes with **no fixture parked in a subfolder solely to dodge the
  existence check**; the `tests/fixtures/validation/text/` subfolder is gone and
  fixtures `22`–`25` live in `validation/`.
- A non-peerless fixture missing its twin produces a CI **warning** (visible in the
  PR checks), not a test failure.
- A fixture explicitly marked `peerless` is accepted silently — no warning, no
  failure.
- The two behavioral parity `describe`s still **fail hard** on a genuine TS⇄YAML
  mismatch (the softening is scoped to the existence check only).

## Out of scope

- Building the declarative text-constraint loader itself — that's
  [[T-TXYL-declarative-requires-forbids]].
- Changing what the behavioral parity comparison asserts.

## Dependencies

- [[T-VITE-upgrade-vitest]] — the `context.annotate` warning tier needs vitest 3.2+.
- Relates to [[T-TXYL-declarative-requires-forbids]] / [[T-TXFX-text-constraint-fixtures]]:
  once they land twins for fixtures `22`–`25` the `peerless` marks come off, but
  this task can ship first by moving + marking them peerless in the interim.

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-TXSC-text-constraint-fixture-scaffold]] in git@github.com:sksizer/markdown-contract.git.
