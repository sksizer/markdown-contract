---
type: task
schema_version: '5'
id: T-4E9T
status: in-progress
created: '2026-06-28'
related:
- T-TXSC-text-constraint-fixture-scaffold
- T-TXYL-declarative-requires-forbids
- T-TXFX-text-constraint-fixtures
- T-VITE-upgrade-vitest
depends_on:
- '[[T-VITE-upgrade-vitest]]'
tags: []
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-06-30T04:04:29Z'
last_reviewed: '2026-06-30'
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

| Location | Kind | Change |
|---|---|---|
| `tests/yaml-parity.test.ts` | modify | recursive glob, peerless opt-out, `annotate` warning in place of the hard existence assert |
| `tests/harness.ts` | modify | carry the `peerless` marker on the fixture type if that's where it lives |
| `tests/fixtures/validation/text/` | delete | remove the glob-skipped subfolder workaround (its fixtures `22`–`25` relocate up one level) |
| `tests/fixtures/validation/` | modify | fixtures `22`–`25` land here directly, marked `peerless` |

## Acceptance criteria

- [ ] AC-1: `npm run test` passes with no fixture parked in a subfolder solely to dodge the existence check; the `tests/fixtures/validation/text/` subfolder is gone and fixtures `22`–`25` live in `tests/fixtures/validation/`.
- [ ] AC-2: A non-peerless fixture missing its twin produces a CI **warning** (visible in the PR checks), not a test failure.
- [ ] AC-3: A fixture explicitly marked `peerless` is accepted silently — no warning, no failure.
- [ ] AC-4: The two behavioral parity `describe`s still **fail hard** on a genuine TS⇄YAML mismatch (the softening is scoped to the existence check only).

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

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `npm run test` passes; `tests/fixtures/validation/text/` is gone and fixtures 22–25 live directly under `tests/fixtures/validation/` (confirmed via `git status` rename entries and `ls`).
- AC-2: agent-manual — temporarily dropped `peerless: true` from fixture 22 (which has no `.contract.yaml` twin); `npm run test` stayed green and the "peers exist › validation" test emitted `annotate(..., "warning")` rather than failing. Reverted.
- AC-3: auto — in the committed tree fixtures 22–25 carry `peerless: true` and produce no annotation and no failure; the green gate confirms.
- AC-4: agent-manual — temporarily diverged `01-single-required-section.contract.yaml` from its TS fixture; the "YAML ⇄ TS validation parity" describe failed hard (exit 1). Reverted.

### What worked

- The vitest 3.2+ Test Annotations API (`context.annotate(msg, "warning")`) landed cleanly via the [[T-VITE-upgrade-vitest]] upgrade — the warning tier was available exactly as the task assumed.
- `import.meta.glob` accepted the recursive `**/*.ts` switch with no other change; the existing `fixtures()` stem filter (`index` / `_`-prefixed) already excluded barrels and part-files under nested keys.
- The baseline-gated quality gate reported `OK 2/2` with zero new drift, so no pre-existing-drift triage was needed.

### Friction and automation gaps

- The task's literal Approach (filter the behavioral parity describes by `!peerless` only) was subtly insufficient: a non-peerless twin-less fixture would still make `peerText()` throw and hard-fail the behavioral loop, contradicting AC-2. The implementer correctly tightened the filter to "has a twin" (`!peerless && hasPeer`). A spec that derives the exclusion predicate from the failure mode (peerText throws on any twin-less fixture) rather than from the marker would have avoided the mid-flight correction.
- Step 7's baseline-gated `quality run` failed first with `baseline not found` because the gate ran from the worktree (whose `.sdlc/` is separate and gitignored) while Step 3a captured the baseline under the main repo's `.sdlc/quality-baselines/`. Passing `--baseline-dir <main-repo>/.sdlc/quality-baselines` resolved it — task-work's Step 7 invocation could default `--baseline-dir` to the main repo's path so worktree runs find the captured baseline without an explicit override. → [[T-5HX8-task-work-threads-main-baseline-dir]]

### Spawned follow-up tasks

- [[T-5HX8-task-work-threads-main-baseline-dir]] (https://github.com/sksizer/dev/pull/509) — linked, not spawned. This gap (default `--baseline-dir` to the main checkout at task-work Step 7 so worktree quality gates find the Step 3a baseline) is already represented upstream in the SDLC plugin repo by an **open** PR carrying `T-5HX8`, itself spawned from a sibling markdown-contract post-mortem ([[T-TXMC-text-match-core]]). Re-spawning would fragment the upstream backlog, so this bullet links to the existing work instead. The broader superseding fix (plugin scripts self-discover project root rather than callers passing paths) is tracked by [[T-44OO-plugin-scripts-self-discover-project-root]]; the original framing of this exact symptom was [[T-5X6Y-task-work-step7-explicit-baseline-dir]] (closed/superseded).
- The "Approach derived the exclusion predicate from the marker, not the failure mode" bullet was **skipped**: it is a retrospective spec-authoring observation already resolved in-flight by the implementer (`!peerless && hasPeer`), with no concrete general automation, tooling, or skill change to build.
