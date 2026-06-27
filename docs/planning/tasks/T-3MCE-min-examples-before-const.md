---
type: task
schema_version: '5'
id: T-3MCE
status: open/ready
created: '2026-06-27'
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
# Minimum example-count before `const` — don't pin a frontmatter field as `const` until it's been seen in enough documents (`init --meta` value ladder)

## Goal

`markdown-contract init --meta` infers the *tightest contract that still accepts every file*. Its frontmatter value ladder (`inferFieldSchema`, D-0009 § Step 4) promotes a field to `{ const: <value> }` the moment **all of its observed values are an identical scalar** — with **no floor on how many documents were actually observed**. On a small group a field seen in one or two files gets pinned as a `const` on evidence too thin to mean anything: the next document with a different value is rejected, not because the field is genuinely fixed, but because the corpus happened to be tiny when `init` ran.

Add a **minimum example-count threshold** (default **3**) to rung 1: a uniform scalar is only promoted to `const` when the field was observed in **at least N documents** (`values.length >= N`). Below the floor it falls through to its natural rung — `number` / `boolean` / a date/format `string` / `enum` / plain `string` — every one of which still admits every observed value, so **accept-by-construction (D-0009 § Self-check) is preserved untouched**. The floor is one shared constant (`DEFAULT_MIN_CONST_EXAMPLES = 3`) and one new `init` flag (`--min-const-examples <n>`); setting it to `1` restores today's behaviour exactly.

This is the smallest change that fixes the symptom at its source: rung 1 is the single gate every const flows through, so one guard improves every group, every mode, and every emitted format at once.

## Today

The const rung fires on uniformity alone, blind to how many documents backed it. The present-count is already computed one frame up (`inferFrontmatter`) but only feeds the `optional` flag — it never reaches the rung that needs it.

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` · `inferFieldSchema` (L376–433) | The value ladder; signature `(values, fileCount, relax)`. Rung 1 (L379–384) emits `{ const: first }` when `isScalar(first) && values.every(deepEqual(·, first))` — **no count check** |
| `src/declarative/infer.ts` · rung 6 — enum (L416–428) | Already gates on evidence: `distinct.length <= 12 && distinct.length * 2 < fileCount` (L425). The const rung has no comparable floor |
| `src/declarative/infer.ts` · rung 4 — array recursion (L403) | Recurses `inferFieldSchema(items, items.length, true)`; any new ladder parameter must thread here too |
| `src/declarative/infer.ts` · `inferFrontmatter` (L443–473) | Computes `present` (L464) and `fileCount` (L461); calls `inferFieldSchema(values.get(key)!, fileCount, relax)` (L466). `present` drives only `optional`, never the const decision |
| `src/declarative/infer.ts` · `generalize` (L536–543) | Threads the bare `relax` boolean into `inferFrontmatter` / `inferBody`; the one chokepoint a new knob also rides |
| `src/declarative/infer.ts` · `InferOptions` (L62–70) | The option bag mirroring the CLI flags — has `relax`, `depth`, … but no const floor |
| `src/declarative/infer.ts` · `inferConfig` (L701–726) | Resolves `relax`/`depth` defaults, dispatches to `inferMeta` / single mode |
| `src/cli/run.ts` · `USAGE` (init lines L35–37) | The `init` usage block — no `--min-const-examples` line |
| `src/cli/run.ts` · `parseArgs` init flags (L88–97; `depth` at L90) | Declares the `init` flags; `depth` is the `{ type: "string" }` model to copy |
| `src/cli/run.ts` · `InitFlags` (L191–204; `depth` at L193) | The parsed-flag bag `runInit` reads |
| `src/cli/run.ts` · `--depth` validation (L236–243) | The exact integer-validation pattern (bad value → exit 2) the new flag must mirror |
| `src/cli/run.ts` · `opts: InferOptions` (L266–273) | Where flags are mapped into `InferOptions` for `inferConfig` |

Observed — `node dist/cli/index.js init docs/planning --meta --dry-run`, `contracts/milestones.contract.yaml` (only **2** milestone docs: `M-0001`, `M-0002`):

```yaml
version:       { const: 0.1.0, optional: true }   # seen in 1 doc
created:       { const: 2026-06-21 }              # seen in 2 docs
last_reviewed: { const: 2026-06-21, optional: true }  # seen in 1 doc
target_date:   { const: 2026-06-21, optional: true }  # seen in 1 doc
```

Every one of these is pinned from 1–2 examples — a meaningless const that would reject the very next milestone whose `version` or `target_date` differs.

## Proposed

A field's uniform scalar is promoted to `const` **only when it was observed in at least N documents**, N defaulting to 3 and overridable per run.

- **Shared default.** A new `src/declarative/constants.ts` exports `export const DEFAULT_MIN_CONST_EXAMPLES = 3;` — one source of truth, imported by `infer.ts`. (Coordinate with the sibling task `[[T-2CSL-const-string-length-cap]]`, which adds its own constant to the *same* file; create the file if it does not yet exist, otherwise add the line beside the sibling's.)
- **Rung-1 guard.** Rung 1 becomes `isScalar(first) && values.length >= minConstExamples && values.every((v) => deepEqual(v, first))`. Below the floor the value falls through unchanged to rungs 2–7, each of which already admits every observed value — so the loosening can never break accept-by-construction.
- **Threading via an options bag (not another positional).** `inferFieldSchema`'s `(values, fileCount, relax)` widens to carry the ladder's knobs as one object — e.g. `(values, fileCount, opts)` where `opts: { relax: boolean; minConstExamples: number }`. Resolve the bag once at the top of `inferConfig` (`minConstExamples = opts?.minConstExamples ?? DEFAULT_MIN_CONST_EXAMPLES`) and thread it through `inferMeta → generalize → inferFrontmatter → inferFieldSchema` in place of the lone `relax` boolean. **The sibling `[[T-2CSL-const-string-length-cap]]` (`--max-const-len`) threads through this exact path**, so a single options bag lets both knobs ride the same plumbing instead of growing parallel positional parameters. The rung-4 array recursion (L403) passes the same bag with `relax: true` (carrying `minConstExamples` so the plumbing stays uniform — see Out of scope for the element-count note).

| What the default (N = 3) does to `contracts/milestones.contract.yaml` | rung |
|---|---|
| `version` (1 doc, `"0.1.0"`) → `{ type: string, optional: true }` | 7 |
| `created` (2 docs, date) → `{ type: string, format: date }` | 5 |
| `last_reviewed` (1 doc, date) → `{ type: string, format: date, optional: true }` | 5 |
| `target_date` (1 doc, date) → `{ type: string, format: date, optional: true }` | 5 |
| `type` (2 docs, `"milestone"`) → `{ type: string }` | 7 |

Each is strictly looser, so the self-check still reports zero findings. `--min-const-examples 1` restores every `const` above verbatim.

- **Enum stays on its own gate.** The enum rung (rung 6) already requires `distinct.length * 2 < fileCount`, a ratio gate against the group's file count — its own evidence floor. The min-example floor is scoped to **rung 1 (const) only**; rung 6 is deliberately left as-is. (Noted explicitly because a value pushed off `const` by the floor may now reach rung 6: e.g. `type: milestone` over 2 docs has `distinct = 1`, and `1 * 2 < 2` is false, so it does **not** enum — it lands on `type: string`. The two gates compose without a new interaction.)

- **CLI surface.** A new `init` flag `--min-const-examples <n>` (integer ≥ 1), validated exactly like `--depth` (bad value → usage error, exit 2), mapped into `InferOptions.minConstExamples`. The `USAGE` string and the `parseArgs` options block gain the flag.

## Approach

1. **Constants.** Create `src/declarative/constants.ts` (or add to it, coordinating with `[[T-2CSL-const-string-length-cap]]`) with `export const DEFAULT_MIN_CONST_EXAMPLES = 3;`. Import it in `infer.ts`.
2. **Widen the ladder's plumbing.** Replace the `relax` positional threaded through `generalize` / `inferFrontmatter` / `inferBody` / `inferFieldSchema` with one options bag `{ relax, minConstExamples }` (designed to also carry the sibling's `maxConstLen`). Resolve `minConstExamples` once in `inferConfig` with `?? DEFAULT_MIN_CONST_EXAMPLES`.
3. **Add the floor to rung 1** (L382): `&& values.length >= opts.minConstExamples`. Update the rung-1 doc comment (L379–384) and the `inferFieldSchema` JSDoc (L356–375) to state the floor and why it preserves accept-by-construction. Pass the same bag through the rung-4 recursion (L403).
4. **Extend `InferOptions`** (L62–70) with `minConstExamples?: number;` and a one-line doc.
5. **CLI.** In `src/cli/run.ts`: add `"min-const-examples": { type: "string" }` to `parseArgs` (beside L90), `"min-const-examples"?: string;` to `InitFlags` (L191–204), an integer-≥-1 validation block mirroring `--depth` (after L243; bad value → exit 2 with `--min-const-examples must be an integer >= 1 (got '…')`), and map it into `opts` (L266–273). Add the flag to `USAGE` (L35–37).
6. **Docs.** Update `docs/planning/decisions/D-0009-config-inference.md` § Step 4 (rung 1 now carries the example floor) and § The CLI surface (the new flag); add a line to `docs/planning/capabilities/C-0008-config-scaffolding.md` § What it provides / § CLI usage noting the floor and its `--min-const-examples` override.
7. **Peer tests** (see Acceptance criteria for the exact cases) in `src/declarative/infer.test.ts` and the CLI tests. **Update the one existing peer assertion this changes**: `src/declarative/infer.test.ts` "required = present in every file; partial keys → optional" (≈L102–110) asserts `status` (present in 1 of 2 files) → `{ const: "open", optional: true }`; under the new default that becomes `{ type: string, optional: true }`. Re-point that expectation and add a sibling case showing `minConstExamples: 1` reproduces the old const. The 6-file ladder vault (≈L134–156) keeps `kind → { const: "policy" }` (6 ≥ 3), so those cases stay green.
8. **Golden fixtures.** Re-check `tests/fixtures/infer/*` for any `const:` golden asserted on a field present in fewer than 3 docs and refresh it (a survey shows `01-flat-uniform` asserts only the *key set*, and `06-frontmatter-values` pins `kind` over 6 docs — both unaffected — but the implementer must confirm the suite, not assume).
9. **Verify.** `npm run typecheck`, `npm test`, then `node dist/cli/index.js validate docs/planning` → `No findings`; spot-check the `init docs/planning --meta --dry-run` milestones output matches the Proposed table.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/declarative/constants.ts` | create (or modify) | `export const DEFAULT_MIN_CONST_EXAMPLES = 3;` (shared with `[[T-2CSL-const-string-length-cap]]`) |
| `src/declarative/infer.ts` | modify | Import the constant; widen the ladder plumbing to an options bag; add `values.length >= minConstExamples` to rung 1; pass the bag through the rung-4 recursion; add `minConstExamples?` to `InferOptions`; resolve the default in `inferConfig`; refresh the rung-1/JSDoc comments |
| `src/cli/run.ts` | modify | Add `--min-const-examples` to `USAGE`, `parseArgs`, and `InitFlags`; validate integer ≥ 1 (exit 2) like `--depth`; map into `InferOptions` |
| `src/declarative/infer.test.ts` | modify | Add the floor cases (below/at/above N, `minConstExamples: 1` reproduces old const); re-point the existing `status` const assertion |
| CLI peer test (`src/cli/index.test.ts`) + init corpus (`tests/inference.cli.test.ts`) | modify | A `--min-const-examples` parse case, a bad-value usage-error (exit 2) case mirroring the `--depth` style, and an end-to-end thread-through check |
| `docs/planning/decisions/D-0009-config-inference.md` | modify | § Step 4 (rung 1 example floor) + § The CLI surface (`--min-const-examples`) |
| `docs/planning/capabilities/C-0008-config-scaffolding.md` | modify | One line on the floor + its override |

## Acceptance criteria

- [ ] AC-1: A uniform scalar field observed in **fewer than N** documents is **not** emitted as `{ const: … }`; it falls through to its natural rung (number / boolean / date `format` / enum / string), and the self-check still reports zero findings.
- [ ] AC-2: A uniform scalar field observed in **N or more** documents **is** emitted as `{ const: … }` (unchanged from today above the floor).
- [ ] AC-3: The **boundary** is exact — a field present in exactly N documents with one uniform value emits `const`; present in N − 1 does not. A peer test pins both sides at the default (N = 3).
- [ ] AC-4: `--min-const-examples 1` reproduces today's output exactly — a single-example uniform field is pinned as `const` again (peer test asserts the old value).
- [ ] AC-5: The default lives in `src/declarative/constants.ts` as `DEFAULT_MIN_CONST_EXAMPLES = 3`, imported (not re-literal'd) by `infer.ts`.
- [ ] AC-6: `node dist/cli/index.js init docs/planning --meta --dry-run` at the default no longer pins `version` / `created` / `last_reviewed` / `target_date` as `const` in `contracts/milestones.contract.yaml`: `version` → `{ type: string, … }`, the three dates → `{ type: string, format: date, … }`.
- [ ] AC-7: `init … --min-const-examples 0` (or a non-integer) exits **2** with a usage error, mirroring `--depth`; `--min-const-examples 1` and any integer ≥ 1 are accepted.
- [ ] AC-8: Peer tests cover AC-1…AC-4 in `src/declarative/infer.test.ts`; the CLI flag parse + bad-value usage error are covered next to `src/cli/`; the existing `status`-const peer assertion is re-pointed to the new default.
- [ ] AC-9: `node dist/cli/index.js validate docs/planning` still prints `No findings`; `npm run typecheck` and `npm test` stay green.
- [ ] AC-10: The change is confined to the const rung and its plumbing — `optional` detection, the enum ratio gate (rung 6), order/section inference, naming, meta grouping, and YAML emission are untouched.

## Out of scope

- **The looser-discriminant trade-off is intentional, not a regression.** For a group with fewer than N documents, even a genuinely-constant discriminant like `type: milestone` is no longer pinned (it loosens to `{ type: string }` or, where the ratio allows, an enum). This is **accept-by-construction-safe** — a looser schema always still accepts the corpus it was inferred from — and is the deliberate price of not over-fitting thin evidence (D-0009 § "tiny corpora rarely enum — the right call on thin evidence"). The escape valve is `--min-const-examples 1`, which restores the old per-field consts wholesale; a per-field tighten-by-hand is the other (the snapshot is a starting point). Authors who *want* a tight discriminant on a 2-file group set the flag or edit the emitted YAML.
- **No floor on the enum rung.** Rung 6 keeps its existing `distinct.length * 2 < fileCount` ratio gate; this task does not add the example floor there (documented interaction only — see Proposed).
- **Array-element const semantics.** The rung-4 recursion infers a *loose* element schema over flattened elements; whether the floor should count flattened elements or documents is an edge with no accept-by-construction risk either way. v1 simply passes the same bag through (count = element count); revisiting element-level const thresholds is not in scope.
- **The string-length cap** (`--max-const-len`) is the sibling task `[[T-2CSL-const-string-length-cap]]`, not this one — this task only ensures the shared `constants.ts` and the threaded options bag are shaped so both land without divergent plumbing.
- **`--infer-bounds`, content-plane inference, merge-on-rerun** — all remain D-0009 § Out of scope.

## Dependencies

- Realizes a refinement of `[[D-0009-config-inference]]` § Step 4 (the value ladder) and § The CLI surface; surfaced through `[[C-0008-config-scaffolding]]` (the `init` verb).
- **Sibling / coordinated work:** `[[T-2CSL-const-string-length-cap]]` — same function (`inferFieldSchema`, rung 1), same new `src/declarative/constants.ts`, and the same `InferOptions → generalize → inferFrontmatter → inferFieldSchema` threading path. The two knobs are designed to coexist on one options bag; whichever lands first creates `constants.ts` and the bag, and the other adds its constant and field beside it.
- No code `depends_on`: the threading path (`src/cli/run.ts` → `InferOptions` → `inferFieldSchema`) already exists; this task widens it.
