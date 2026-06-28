---
type: task
schema_version: '5'
id: T-KCOL
status: closed/done
created: '2026-06-27'
completion_note: 'Inference now resolves heading camelCase-key collisions instead of emitting a contract that crashes its own self-check. inferBody groups observed section spellings by toCamelKey and collapses each clash into one aliased section (first spelling primary, rest aliases) with a warning; the one unmergeable case — both spellings as peers in a single doc — is a fatal, file-naming error that aborts inferConfig cleanly (all clashes across the corpus reported at once). selfCheck was also hardened to compile each contract in its own try/catch so any future build-guard failure is an attributed self-check line, never an uncaught stack trace. Peer tests in infer.test.ts (merge + accept-by-construction + abort + keyless) and an end-to-end crash-guard in tests/inference.cli.test.ts. Full suite green (480); live init verified on both paths. Carried by PR #45.'
related:
- '[[D-0009-config-inference]]'
tags:
- infer
- init
- sections
- diagnostics
- dx
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Resolve heading camelCase-key collisions during `init` — merge case-variant siblings, fail clearly when they can't merge

## Goal

`markdown-contract init <vault> --meta` must never crash on a real corpus. Running it against a large living vault threw an uncaught `ContractBuildError` ("section names ‘Schedule For today’ and ‘Schedule For Today’ both generate the camelCase key ‘scheduleForToday’") with a raw Node stack trace, producing no usable output. The inferer was emitting a contract it is structurally guaranteed cannot compile. Make inference **resolve** the collision: collapse case/punctuation-variant sibling headings into one aliased section (the common, safe case), and where the variants genuinely cannot be one section, abort with a clear, file-naming diagnostic instead of a stack trace.

## Today

The body inferer lists section spellings deduped by **exact string**, but the engine keys sections by **camelCase** — so two spellings that differ only in case survive as two sibling sections and then collide at compile time.

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` · `inferBody` / `sectionUnion` | Builds the section list deduped by exact string; case-variant headings become two sibling entries |
| `src/core/camel.ts` · `toCamelKey` | `"Schedule For today"` and `"Schedule For Today"` both → `scheduleForToday` |
| `src/core/grammar.ts` · `assertNoKeyCollision` (`sections()`) | Build-time `contract/key-collision` guard rejects two sibling specs sharing a key |
| `src/cli/run.ts` · `selfCheck` | Built each rule's contract with `compileContractObject(c.def)` **outside** the try/catch, so the build error escaped as an uncaught throw and crashed the verb |

Observed: `node dist/cli/index.js init "$OPV" --meta --force` exits with a `ContractBuildError` stack trace from `selfCheck` → `compileContractObject` → `sections` → `assertNoKeyCollision`. No config is written; the message names the two headings but not the file(s) or contract group.

## Proposed

Resolve the clash at inference time, where the per-doc section lists and file paths are in hand:

- Group observed spellings by `toCamelKey`. For each key with >1 distinct spelling, collapse to **one** section: first-seen spelling is the `section:` primary, the rest become `aliases:` (the engine accepts alias spellings for one slot, exempt from the build guard). The merged section is required iff every doc carries at least one of the spellings. Record a **warning** naming the spellings, the shared key, and an example file per spelling.
- The exception that cannot merge: two clashing spellings appearing **together as peers in a single doc**. The merged slot would then match twice (`structure/duplicate-section`, error), breaking accept-by-construction. Treat that as a **fatal** diagnostic (`sink.errors`) naming the offending file(s); `inferConfig` collects every clash across the corpus and throws one `DeclarativeError`, which the CLI maps to a clean exit 2.
- Harden `selfCheck`: compile each contract in its own try/catch and report a build failure as an attributed self-check line (`contract '<name>' (<globs>) failed to compile — …`), never an uncaught throw.

A keyless heading (no alphanumerics → empty key) generates no alias and so can never collide; it is emitted unchanged.

## Approach

1. Thread a shared `InferSink { warnings; errors }` down `inferConfig → inferMeta → generalize → inferBody` so diagnostics from every group surface in one run.
2. In `inferBody`, group spellings by `toCamelKey`, emit one entry per primary with `aliases`, compute required over the merged set, and push a warning (mergeable) or an error (co-occurring peers, naming files via `sampleList`).
3. In `inferConfig`, after generalization, throw a `DeclarativeError` listing every collected error when `sink.errors` is non-empty (refuse to emit a contract that fails its own self-check).
4. Harden `selfCheck` in `src/cli/run.ts` with a per-contract compile try/catch.
5. Peer-test in `src/declarative/infer.test.ts`: merge → exact aliased section + warning; accept-by-construction (compile + validate both spellings, no error findings); co-occur → throw naming the file + key + spellings; keyless headings → no collision. End-to-end crash-guard in `tests/inference.cli.test.ts`: `init --meta` exits 2 with a descriptive message (not a crash) on co-occur, and exits 0 with a `warning:` line + `self-check: clean` on cross-doc variants.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/declarative/infer.ts` | modify | `InferSink`; collision resolution in `inferBody` (merge→alias+warn / co-occur→error); thread sink through `generalize`/`inferMeta`/`inferConfig`; abort on errors; drop now-inlined `isUniversal` |
| `src/cli/run.ts` | modify | `selfCheck`: per-contract compile try/catch, attributed failure line |
| `src/declarative/infer.test.ts` | modify | Merge / accept-by-construction / abort / keyless peer tests |
| `tests/inference.cli.test.ts` | modify | End-to-end crash-guard + merge-path tests |
| `docs/planning/decisions/D-0009-config-inference.md` | modify | Note section-key-collision handling under § Step 3 |

## Acceptance criteria

- [x] AC-1: `init --meta` never throws an uncaught `ContractBuildError` — a key collision is either resolved or reported as a clean exit-2 diagnostic.
- [x] AC-2: Case/punctuation-variant headings seen across separate docs merge into one `section` + `aliases` slot; a `warning:` line names the spellings, the shared key, and an example file per spelling; the scaffold self-checks clean (accept-by-construction holds).
- [x] AC-3: Variants appearing together as peers in one doc abort `inferConfig` with a `DeclarativeError` naming the file(s), the spellings, and the shared key; every clash across the corpus is reported in one run, not whack-a-mole.
- [x] AC-4: `selfCheck` reports any contract build failure as an attributed self-check line (`contract '<name>' (<globs>) failed to compile — …`), never a stack trace.
- [x] AC-5: A keyless heading (no alphanumerics) is never treated as a collision.
- [x] AC-6: Peer tests + an end-to-end crash-guard pin the behavior; the full suite stays green.

## Out of scope

- **Repeatable sections** — letting a heading legitimately recur as peers, surfaced as a collection in the OOM (`doc.body.entries[]`). That is the inverse of the `structure/duplicate-section` prohibition and a genuine new capability; captured separately in the backlog. This task keeps the engine's existing per-level uniqueness rule and only stops the inferer from violating it.
- **Skip-and-continue on a fatal clash** — emitting contracts for the clean groups while reporting the bad one, instead of aborting the whole `--meta` run. A possible later refinement; v1 aborts with every clash named.
- **Nested-section inference** — v1 only consumes the top-level H2 spine, so collisions are always among top-level peers (D-0009 § Out of scope).
- **Normalizing the source vault** — the tool diagnoses; it never rewrites the user's headings.

## Dependencies

- Builds on the config-inference pipeline and accept-by-construction invariant of `[[D-0009-config-inference]]`; reuses `toCamelKey` (the engine's section-keying rule) and the engine's `section(names[])` alias support. Stacked on the const-threshold (T-2CSL/T-3MCE) and nullable (T-NULL) inferer changes, which it shares `inferBody`/`generalize`/`inferConfig` with.
