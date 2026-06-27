---
type: task
schema_version: '5'
id: T-2CSL
status: closed/done
created: '2026-06-27'
last_reviewed: '2026-06-27'
completion_note: 'Capped const/enum string length at DEFAULT_MAX_CONST_STRING_LENGTH (64, overridable via --max-const-len) in inferFieldSchema rungs 1 and 6, threaded through a shared field-inference options bag (also carrying T-3MCE''s floor). init --meta no longer freezes a long completion_note as a const. Implemented in PR #41 alongside T-3MCE; peer tests cover the cap/boundary/enum-exclusion and the CLI flag validation; full suite green (472), typecheck + validate docs/planning clean.'
related:
- '[[C-0008-config-scaffolding]]'
- '[[D-0009-config-inference]]'
depends_on: []
tags:
- inference
- init
- config
- dx
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Cap the length of strings the inferer will pin as a `const` (or admit into an `enum`)

## Goal

`markdown-contract init --meta` should never pin an entire free-text paragraph as a frontmatter `const`. The value-type ladder's rung 1 (`src/declarative/infer.ts:379–384`) promotes *any* uniform scalar to `{ const: <value> }` with **no cap on string length**, so a field whose one observed value happens to be a multi-sentence note gets frozen as the exact bytes of that note. The same exposure exists in the enum rung (rung 6, `src/declarative/infer.ts:413–428`): a long free-text string can be admitted into an `{ enum: [...] }`. Add a **maximum string length** above which a string is never inferred as a `const` and never admitted into an `enum`; it falls through to a `format` rung (if it matches) or to `{ type: string }`. Real discriminants (`capability` / `milestone` / `task`, schema versions `1` / `5`, `0.1.0`, ISO dates) are all under ~25 chars; free-text notes are hundreds — a default in the 48–80 range separates them cleanly, so the cap costs nothing on genuine const fields while killing the paragraph-as-const pathology.

## Today

Run the inferer over this repo's own planning corpus and the bug is visible in the dry-run:

```bash
node dist/cli/index.js init docs/planning --meta --dry-run
```

In the emitted `contracts/milestones.contract.yaml`, the `completion_note` field is a `const` holding the entire multi-sentence completion paragraph of the single milestone that carried one — the most-specific schema that "admits every observed value" when there is exactly one value, with nothing to stop that value being prose. A second milestone with a different note would (correctly) collapse it to `{ type: string }`; the const is an artifact of the field being uniform-by-coincidence, not categorical.

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` · `inferFieldSchema` (L376–433) | The value ladder; third param is the bare `relax: boolean`. No notion of a length bound anywhere in the rungs |
| `src/declarative/infer.ts` · rung 1 (L379–384) | `if (isScalar(first) && values.every((v) => deepEqual(v, first))) return { const: first }` — uniform string of any length becomes a `const` |
| `src/declarative/infer.ts` · rung 6 (L413–428) | Builds `{ enum: distinct }` from the distinct string set, gated only by count (`≤ 12`) and the half-the-files ratio (L425) — never by value length |
| `src/declarative/infer.ts` · `InferOptions` (L61–70) | The options surface mirrored from the CLI flags — no length knob |
| `src/declarative/infer.ts` · `inferFrontmatter` → `inferFieldSchema` (L443–473, call at L466) | Threads only `relax` down to the ladder |
| `src/cli/run.ts` · `InitFlags` (L190–204) | The parsed-flag bag — no length flag |
| `src/cli/run.ts` · `--depth` parse/validate (L236–243) | The exact pattern to mirror for a new non-negative-integer flag |
| `src/cli/run.ts` · `InferOptions` build (L266–273) | Where flags become the `inferConfig` options — no length knob threaded |
| `src/cli/run.ts` · USAGE (L30–38) + parseArgs options (L77–100, init flags L88–97) | The surfaces a new flag must appear in |

## Proposed

A new shared default in a constants module, a string-length guard on rungs 1 and 6, and one CLI flag to override it — threaded down the existing `init` path without divergent plumbing (the sibling `[[T-3MCE-min-examples-before-const]]` adds a second knob through the *same* path, so the threading is designed for both).

- **New constant.** Create `src/declarative/constants.ts` holding the shared inference defaults:
  ```ts
  /** Strings longer than this are never pinned as a `const` nor admitted into an `enum`. */
  export const DEFAULT_MAX_CONST_STRING_LENGTH = 64;
  ```
  64 comfortably clears every genuine discriminant the corpus carries (longest is an ISO date at 10 chars or a slash-status enum value at ~14) yet sits an order of magnitude below the hundreds-of-chars free-text notes — and reads as "a short identifier/label, not prose." This file is **data only** (no logic), so it needs no peer test; the threshold's *behavior* is pinned in `infer.test.ts`. `[[T-3MCE-min-examples-before-const]]` will add its `DEFAULT_MIN_CONST_EXAMPLES` to this same file.

- **Rung 1 — skip the const for an over-length string.** When the uniform scalar is a string whose `length` exceeds the cap, fall through instead of returning `{ const: first }`. A non-string uniform scalar (number / boolean) is unaffected. A long uniform string then continues down the ladder: it cannot be a number/boolean/array, a paragraph matches no `format`, and rung 6 excludes it too, so it lands on `{ type: string }` — still accept-by-construction.

- **Rung 6 — disqualify the field from `enum` when any value is over-length.** The enum must admit *every* observed value, so dropping an over-length value from `distinct` would break accept-by-construction. Instead, if **any** observed string exceeds the cap, skip rung 6 entirely and let the field fall to `{ type: string }`.

- **Boundary semantics (inclusive cap).** The test is `length > maxConstStringLength`: a string of length *exactly* the cap is still eligible for `const`/`enum`; one character longer is not. `--max-const-len 0` therefore disables string `const` and string `enum` for every non-empty string (the empty-string degenerate `""`, length 0, is harmless).

- **Threading — widen the ladder's third param to an options object (not a new positional).** Replace `inferFieldSchema(values, fileCount, relax)` with `inferFieldSchema(values, fileCount, opts)` where `opts` is a small field-inference bag, e.g. `{ relax: boolean; maxConstStringLength: number }`. `inferFrontmatter` (and the rung-4 recursive call, which currently passes `relax: true`) pass that object straight through — the recursive call keeps the same cap so over-length array elements are handled identically. The object is the deliberate seam: `[[T-3MCE-min-examples-before-const]]` adds `minConstExamples` to it with **zero** new parameters or signature churn. Add `maxConstStringLength?: number` to `InferOptions`; resolve it once at the `inferConfig` boundary via `?? DEFAULT_MAX_CONST_STRING_LENGTH` and pass the normalized bag down through `generalize` → `inferFrontmatter`.

- **CLI flag `--max-const-len <n>`.** Parse and validate exactly as `--depth` (`src/cli/run.ts:236–243`): a non-negative integer, a bad value is a usage error (exit 2) with a parallel message. Register it in the `parseArgs` options block (`type: "string"`, alongside the init flags at L88–97), add it to `InitFlags` (L190–204), thread it into the `InferOptions` built at L266–273, and document it in the USAGE init lines (L35–37).

## Approach

1. Create `src/declarative/constants.ts` exporting `DEFAULT_MAX_CONST_STRING_LENGTH = 64` (data-only module, re-exported from the `declarative` barrel only if the CLI needs the symbol directly).
2. In `src/declarative/infer.ts`: introduce the field-inference options bag; widen `inferFieldSchema`'s third parameter from `relax` to that bag; update rung 1 (L382–384) to skip the const when `typeof first === "string" && first.length > opts.maxConstStringLength`; update rung 6 (L416–428) to skip enum emission when any observed string exceeds the cap; thread the bag through `inferFrontmatter` (L466) and the rung-4 recursion (L403). Add `maxConstStringLength?: number` to `InferOptions` (L61–70) and resolve the default in `inferConfig` (L701–726), updating `generalize` (L536–543) to carry it.
3. In `src/cli/run.ts`: add `"max-const-len"` to the `parseArgs` options (L88–97) and to `InitFlags` (L190–204); parse/validate it next to `--depth` (L236–243); thread it into the `InferOptions` literal (L266–273); extend the USAGE init lines (L35–37).
4. Peer tests in `src/declarative/infer.test.ts` (the ladder's contract) and the CLI surface in `src/cli/index.test.ts` (the `runCli` peer test) — see Acceptance criteria for the exact cases. Lead the ladder tests with the documentary happy path: a short uniform value is *still* a `const`, a long one is `{ type: string }`.
5. Update `docs/planning/decisions/D-0009-config-inference.md` (§ Step 4 value ladder, L99–111, and § The CLI surface, L125–143) and the value-inference line in `docs/planning/capabilities/C-0008-config-scaffolding.md` (L51) to record the cap and the flag.
6. Re-run the dogfood: `node dist/cli/index.js init docs/planning --meta --dry-run` no longer emits `completion_note` as a const; `node dist/cli/index.js validate docs/planning` still prints `No findings.`; `npm run typecheck` and `npm test` stay green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/declarative/constants.ts` | create | `export const DEFAULT_MAX_CONST_STRING_LENGTH = 64` (shared default; data only, no peer test) |
| `src/declarative/infer.ts` | modify | Widen `inferFieldSchema`'s third param to an options bag; cap rung 1 and rung 6 on string length; add `maxConstStringLength?` to `InferOptions`; resolve default in `inferConfig`; thread through `generalize` / `inferFrontmatter` |
| `src/declarative/infer.test.ts` | modify | Peer cases: const NOT emitted for an over-length string; const STILL emitted at/under the cap; the boundary; enum excludes a field with an over-length value; the `0` (disabled) case |
| `src/cli/run.ts` | modify | Register `--max-const-len`; parse/validate (mirror `--depth`); thread into `InferOptions`; extend USAGE |
| `src/cli/index.test.ts` | modify | Peer cases: flag parses and overrides the default; a bad value is a usage error (exit 2) |
| `src/declarative/index.ts` | modify (if needed) | Re-export `DEFAULT_MAX_CONST_STRING_LENGTH` from the barrel if the CLI references it (barrel-only, no logic) |
| `docs/planning/decisions/D-0009-config-inference.md` | modify | Record the length cap in § Step 4 (value ladder) and the flag in § The CLI surface |
| `docs/planning/capabilities/C-0008-config-scaffolding.md` | modify | One line on the value-inference cap (§ What it provides, near L51) |

## Acceptance criteria

- [ ] AC-1: `node dist/cli/index.js init docs/planning --meta --dry-run` no longer emits `completion_note` as a `const` in `contracts/milestones.contract.yaml` — it becomes `{ type: string }`.
- [ ] AC-2: The default lives in `src/declarative/constants.ts` as `DEFAULT_MAX_CONST_STRING_LENGTH` (value 64), and is the value used when `--max-const-len` is omitted.
- [ ] AC-3: Rung 1 still emits `{ const: <value> }` for a uniform string **at or under** the cap, and does not for one **over** the cap; the boundary (length == cap → const; length == cap+1 → `{ type: string }`) is pinned by a peer test.
- [ ] AC-4: Rung 6 emits no `enum` for a field where any observed value exceeds the cap (the whole field falls to `{ type: string }`), preserving accept-by-construction; pinned by a peer test.
- [ ] AC-5: `--max-const-len <n>` parses as a non-negative integer and overrides the default; a non-integer or negative value is a usage error (exit 2) with a message parallel to `--depth`; `--max-const-len 0` disables string `const`/`enum` for every non-empty string. All three pinned in `src/cli/index.test.ts`.
- [ ] AC-6: Non-string consts are untouched — numeric/boolean uniform scalars (e.g. `need_human_review: true`) still infer `{ const: ... }` regardless of the cap.
- [ ] AC-7: `node dist/cli/index.js validate docs/planning` still prints `No findings.`; `npm run typecheck` and `npm test` are green; `D-0009` (§ Step 4, § The CLI surface) and `C-0008` document the cap and the flag.

## Out of scope

- **A minimum-examples floor before a value may become a `const`** — the sibling `[[T-3MCE-min-examples-before-const]]`, which adds `--min-const-examples` through the same ladder options bag and the same `constants.ts`.
- **`--infer-bounds`** (`pattern` / `min` / `max` inference) — already a separate, opt-in concern (`D-0009` § Step 4); the length cap is orthogonal to it.
- **Number / boolean consts** — this cap is **string-only**; numeric and boolean uniform scalars are never length-bounded and continue to infer `{ const: ... }`.
- **Per-field overrides** of the cap — one global threshold for the run; per-key tuning is hand-editing the emitted YAML.

## Dependencies

- The inference engine (`inferConfig`, the value ladder, the `init` verb) shipped via PRs, not a tracked `T-` task, so `depends_on` is empty.
- `[[T-3MCE-min-examples-before-const]]` — related work: it touches the **same** `inferFieldSchema` and shares the new `src/declarative/constants.ts` and the ladder options bag. The two are designed to coexist (one threading path, two knobs); landing either first leaves the seam ready for the other.
- Behavior fixed by `[[D-0009-config-inference]]` (§ Step 4 — value ladder; § The CLI surface) and realized for `[[C-0008-config-scaffolding]]`; the cap is a tightening of the rung-1/rung-6 policy, not a new engine or format surface.
