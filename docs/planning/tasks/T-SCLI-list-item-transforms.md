---
type: task
schema_version: '5'
id: T-SCLI
status: in-progress
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[D-0005-consumption-oom]]'
depends_on:
- '[[T-SCRB-typed-row-read-back]]'
tags:
- structured-cells
- consumption
- typed-model
- lists
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: '2026-07-04'
readiness_verified_at: '2026-07-04T02:10:48Z'
---
# Keep `everyItem` transform output and read back typed list items through `ListView`

## Goal

Extend the "keep the transform output" mechanism from table cells to list items — the symmetric case `D-0015` notes. `validateList` already runs `safeParse` per item over `item.text` when `everyItem` is a `ZodType`, branches on `res.success`, and discards `res.data`. Keep it, cache it on the list `BlockNode`, and read it back as typed items through `ListView`, mirroring the table slice (`T-SCTC` + `T-SCRB`). Flips the `list-typed` gate.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/core/content.ts#validateList` | For `everyItem: ZodType`, runs `zod.safeParse(item.text)` per item, branches on `res.success`, emits `content/list/item-kind` on failure — and **discards `res.data`**. |
| `packages/core/src/core/model.ts#listView` | Returns `node.items` as raw projection items (each `.text` a string); no typed item path. |
| `packages/core/src/core/types.ts#ListView` | `ListView extends Iterable<ListItem>` with raw-string items; no `z.output<everyItem>` carry. |
| `packages/core/src/core/leaves.ts#list` | `list({ everyItem?: "checkbox" \| ZodType, ... })` carries no literal type out for the item schema. |
| `packages/core/tests/fixtures/consumption/` | Typed list-item fixtures authored by `T-SCFX`, skipped under `list-typed: false`. |

## Proposed

`validateList` keeps `res.data` on a successful `everyItem` `safeParse` and caches it on the list node via an additive sparse `typedItem(i)` accessor (the list analogue of the table `typed(row, col)` overlay), raw items retained. `listView` reads the cache and yields typed items when present; `list<I extends ZodType>(...)` captures the item schema's literal type so a declared `everyItem` transform reaches `read()` as a typed `ListView` of `z.output<everyItem>`. The `"checkbox"` gate and the `ListView` default (raw items) are unchanged. Un-skip the list fixtures by flipping `list-typed`.

Consuming a transforming list — the per-item transform output flows to the typed model and reads back through `ListView`, mirroring table cells:

```ts
import { z } from "zod";
import { contract, sections, section, list } from "markdown-contract";

// A "Steps" section whose content is a list; `everyItem`'s transform runs per item
// and T-SCLI keeps that output so it flows to the typed model (the table-cell analogue).
const c = contract({
  body: sections({}, [
    section("Steps", {
      // list<I extends ZodType> captures the item schema's literal type (I = the transform)
      content: list({ everyItem: z.string().transform((s) => s.length) }),
    }),
  ]),
});

const src = "## Steps\n\n- knead\n- proof\n";

// read() -> typed model, or throws ContractError on an error-level finding
const doc = c.read(src, { path: "recipe.md" });
// doc.body.steps is the lowerCamelCase alias of "Steps"; .lists[0] is its ListView
const steps = doc.body.steps.lists[0]; // ListView<Item>, Item = z.output<everyItem> = number
const lengths: number[] = [...steps];  // [5, 5] — typed items from the cache, transform not re-run
// validate() never throws; the same typed ListView hangs off .doc
const also = c.validate(src, { path: "recipe.md" }).doc?.body.steps.lists[0];

// Contrast — no `everyItem`: the ListView default is unchanged (raw ListItem, each .text a string)
const plain = contract({
  body: sections({}, [section("Notes", { content: list({}) })]),
});
const notes = plain.read("## Notes\n\n- a\n- b\n", { path: "notes.md" }).body.notes.lists[0];
const raw: string[] = [...notes].map((i) => i.text); // items stay raw strings, no transform
```

## Approach

1. Add an additive sparse `typedItem(i): unknown | undefined` accessor (+ internal writer) to the `list` arm of `BlockNode` in `packages/core/src/core/types.ts`; raw `items` retained.
2. In `packages/core/src/core/content.ts#validateList`, on a successful per-item `safeParse` (the `everyItem: ZodType` branch only — not `"checkbox"`), cache `res.data`; leave the failure branch and the `content/list/item-kind` finding unchanged.
3. In `packages/core/src/core/projection.ts`, initialize the sparse typed-item store when the list node is built.
4. In `packages/core/src/core/model.ts#listView`, yield `typedItem(i)` when defined, falling back to the raw item; type the view as `ListView<Item>` where `Item = z.output<everyItem>` for a transforming list, raw otherwise.
5. In `packages/core/src/core/leaves.ts`, make `list<I extends ZodType>` capture the `everyItem` literal type and thread it (via the same `section()` / `sections()` / `Infer` path `T-SCRB` established) to `read()`.
6. Flip `list-typed` to `true` in `packages/core/tests/components.ts`, un-skip the list fixtures, and add peer tests in `packages/core/src/core/content.test.ts` / `packages/core/src/core/model.test.ts` (typed item cached, `"checkbox"` unaffected, failing item still finds + caches nothing).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/core/types.ts` | modify | Add additive `typedItem(i)` to the `list` arm of `BlockNode`; `ListView` carries an optional typed `Item` |
| `packages/core/src/core/content.ts` | modify | In `validateList`, keep `res.data` on a successful `everyItem` parse; failure + `"checkbox"` branches unchanged |
| `packages/core/src/core/projection.ts` | modify | Initialize the sparse typed-item store on the list `BlockNode` |
| `packages/core/src/core/model.ts` | modify | `listView` yields cached typed items with raw fallback |
| `packages/core/src/core/leaves.ts` | modify | `list<I>` captures the `everyItem` literal type and threads it to `read()` |
| `packages/core/tests/components.ts` | modify | Flip `list-typed` to `true` |
| `packages/core/tests/fixtures/consumption/` | modify | Un-skip the typed list-item fixtures gated by `list-typed` |

## Acceptance criteria

- [ ] AC-1: A `list({ everyItem: z.string().transform(...) })` contract reads back typed items through `ListView` at runtime, sourced from the cache, with no re-run of the transform.
- [ ] AC-2: The item type is `z.output<everyItem>` for a transforming list and the raw type otherwise — verified by a type-level test.
- [ ] AC-3: `everyItem: "checkbox"` and lists with no `everyItem` are unchanged (raw items); the typed store is additive and sparse.
- [ ] AC-4: A failing item still emits exactly one `content/list/item-kind` finding and caches no typed value for that item.
- [ ] AC-5: `list-typed` is `true` and the list fixtures run and pass; no previously-passing fixture changes.
- [ ] AC-6: `bunx moon run core:build`, `bunx moon run core:test`, and `bunx moon run core:typecheck` pass.

## Out of scope

- Table cells (`T-SCTC` / `T-SCRB`) and position preservation (`T-SCPP`).
- Paragraph transforms — design-only ([[T-SCPA-paragraph-transform-adr]]).

## Dependencies

- [[T-SCRB-typed-row-read-back]] — establishes the capture overlay + the `section()` / `sections()` / `Infer` threading pattern this mirrors for lists.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `packages/core/src/core/model.test.ts` "reads items back … from the cache" + "transform is not re-run" (a call-counter proves the read is cache-sourced), and consumption fixture `[c13]` under `core:test`.
- AC-2: auto — compile-time type-level assertions in `model.test.ts` (`z.output<everyItem>` reached through `read()` and `Infer`; raw `ListItem` for the checkbox/no-everyItem defaults), enforced by `bunx moon run core:typecheck`.
- AC-3: auto — `content.test.ts` (checkbox and no-`everyItem` lists cache nothing) + `model.test.ts` raw read-back + the raw-default type-level asserts.
- AC-4: auto — `content.test.ts` "a failing item emits exactly one `content/list/item-kind` finding and caches nothing there".
- AC-5: auto — `packages/core/tests/components.ts` `"list-typed": true`; `[c13]` fixture runs and passes; `core:test` (697 pass) shows no previously-passing fixture changed.
- AC-6: auto — `bunx moon run core:build`, `core:typecheck`, `core:test`, and `core:lint` all exit 0; the baseline-gated quality gate reports `OK 5/5`.

### What worked

- The shipped table-cell slice (`T-SCTC` + `T-SCRB`) was an exact mirror template: the sparse `typed(row,col)` overlay and the `section()` → `sections()` → `Infer` literal-type threading transferred cleanly to the list `typedItem(i)` / `LeafSpec._item` analogue with no new architecture.
- The baseline-gated quality gate (`--diff-against-baseline`) subtracted pre-existing drift and reported `OK 5/5` with zero new drift on the first clean run.

### Friction and automation gaps

- Quality gate `--line`/`--diff-against-baseline` mode captures each verb via `spawnSync` with a 1 MB per-stream `maxBuffer`; the repo's ~1.04 MB of pre-existing biome warnings overflow it and surface a spurious `core:lint` ENOBUFS/SIGTERM FAIL in the worktree (only `--log`, stdio-inherit, runs clean) — the quality runner should raise the `maxBuffer` or stream verb output to a temp file so large pre-existing lint output can't spuriously fail the gate.
- The ensure-ready touchpoint gate hard-failed the spec over an unescaped `|` inside an inline-code span in a `## Today` table cell (`"checkbox" | ZodType`), which the table parser read as a 3-cell row — a cosmetic markdown-escaping bug downshifted an otherwise implementation-ready task — `sdlc task gap-report`'s touchpoint table parser should tolerate pipes inside backtick code spans (or `\|`-escaped pipes) rather than counting them as column delimiters.
