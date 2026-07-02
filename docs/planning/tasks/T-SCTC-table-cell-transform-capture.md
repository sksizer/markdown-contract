---
type: task
schema_version: '5'
id: T-SCTC
status: in-progress
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[D-0002-projection-and-dialect]]'
depends_on:
- '[[T-SCFX-structured-cells-fixture-scaffold]]'
tags:
- structured-cells
- content-plane
- projection
- typed-model
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
last_reviewed: '2026-07-02'
readiness_verified_at: '2026-07-02T20:04:21Z'
---
# Keep the transform output at validate-time and cache it on the projection table node

## Goal

Stop discarding a cell transform's parsed output. `validateTable` already runs `safeParse` per declared cell; today it branches on `res.success` and never reads `res.data`. Keep `res.data` on success and cache it on the projection's table `BlockNode` as a **sparse** overlay beside the retained raw `rows`, so the model (`T-SCRB`) can read typed values without a second Zod pass. This is axis A1 + the runtime half of B1 from [[D-0015-structured-cells]].

## Today

| Location | Role today |
|---|---|
| `src/core/content.ts#validateTable` | Runs `zod.safeParse(value)` per declared cell, branches on `res.success`, emits `content/table/cell` on failure — and **discards `res.data`** on success. |
| `src/core/types.ts` | The `table` arm of `BlockNode` carries `columns`, `rows: string[][]`, `rowPos(i)`, `anchor?`, `pos` — no typed overlay. |
| `src/core/projection.ts` | Builds the table `BlockNode` from mdast rows; produces only raw `rows` + line positions. |
| `src/core/content.test.ts` | Peer unit tests for the content plane (table-cell validation). |

## Proposed

`validateTable` keeps `res.data` on a successful cell `safeParse` and writes it onto the table node through a new sparse setter (`setTyped(row, col, value)` / read via `typed(row, col)`), populated during the **existing** content-plane pass. The `table` arm of `BlockNode` gains an additive `typed(row, col): unknown | undefined` accessor returning the cached output, or `undefined` for any cell with no transform (the common case) — so a plain-string table allocates nothing extra and the raw `rows: string[][]` is never removed. No finding shape changes; a failed transform stays a `content/table/cell` finding at the row's line. The output is an internal projection-node detail the model reads — it is **not** exposed on the public `tree`.

After `validate()`, the parsed output of a transform cell is retrievable from the projection table node via `typed(row, col)`, while a no-transform column returns `undefined` and the raw `rows` stay verbatim:

```ts
import { z } from "zod";
import { contract, sections, section, table } from "markdown-contract";

// A transform cell: `path` or `path#symbol` (backticked) → { path, symbol? }.
const LOCATION_RE = /^`([^#`]+)(?:#([^`]+))?`$/;
const Location = z.string().transform((s, ctx) => {
  const m = LOCATION_RE.exec(s.trim());
  if (!m) { ctx.addIssue({ code: "custom", message: "expected `path` or `path#symbol`" }); return z.NEVER; }
  return { path: m[1]!, ...(m[2] ? { symbol: m[2] } : {}) };       // → { path: string; symbol?: string }
});

const spec = contract({
  body: sections({}, [
    section("Files to touch", {
      content: table({
        columns: ["Location", "Kind", "Change"],                  // "Change" declares no cell → no transform
        cells: { Location, Kind: z.enum(["new", "modify", "delete"]) },
      }),
    }),
  ]),
});

const src = [
  "## Files to touch",
  "",
  "| Location | Kind | Change |",
  "| --- | --- | --- |",
  "| `src/core/content.ts#validateTable` | modify | keep res.data |",
].join("\n");

const { tree } = spec.validate(src, { path: "task.md" });          // never throws; findings collected

// Reach the projection table BlockNode. The typed cache rides on its `typed()` method —
// it is NOT serialized onto the public `tree` data (T-SCRB adds the public `doc.body` read-back).
const node = tree.root.sections[0]!.blocks[0]!;
if (node.kind === "table") {
  node.typed(0, "Location"); // transform cell → { path: "src/core/content.ts", symbol: "validateTable" } (cached res.data)
  node.typed(0, "Change");   // no transform declared for "Change" → undefined
  node.rows[0]![0];   // raw rows retained verbatim → "`src/core/content.ts#validateTable`"
}
```

## Approach

1. Add the additive `typed(row, col)` accessor (and the internal `setTyped` writer / sparse backing store) to the `table` arm of `BlockNode` in `src/core/types.ts`; raw `rows`, `rowPos`, `pos`, `anchor` unchanged.
2. In `src/core/projection.ts`, initialize the sparse typed store on the table node when it is built (empty by default).
3. In `src/core/content.ts#validateTable`, on a successful per-cell `safeParse`, call `setTyped(i, col, res.data)`; leave the failure branch (and the `content/table/cell` finding + A3 line remap) exactly as-is.
4. Confirm the output flows only through the node accessor (model-facing), never onto the public `tree` surface — preserving the D-0005 `doc` vs `tree` boundary.
5. Add peer unit tests in `src/core/content.test.ts` (and a projection-node test in `src/core/projection.test.ts`): a transform cell caches its parsed output; a no-transform cell reports `typed(...) === undefined`; a failing transform caches nothing and still emits the cell finding.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/types.ts` | modify | Add the additive `typed(row, col)` accessor + sparse backing to the `table` arm of `BlockNode`; raw `rows` retained |
| `src/core/content.ts` | modify | In `validateTable`, keep `res.data` on success and cache it via `setTyped`; failure branch unchanged |
| `src/core/projection.ts` | modify | Initialize the sparse typed store when the table `BlockNode` is constructed |
| `src/core/content.test.ts` | modify | Peer tests: output cached on transform; `undefined` on no-transform; failure caches nothing + still finds |
| `src/core/projection.test.ts` | modify | Assert the table node exposes the additive `typed(...)` accessor without altering raw `rows` |

## Acceptance criteria

- [ ] AC-1: After validation, a declared transform cell's parsed value is retrievable via `node.typed(row, col)`; a cell with no transform returns `undefined`.
- [ ] AC-2: The typed output is produced by the **existing** `safeParse` call in `validateTable` — no second Zod pass and no additional traversal of the cells.
- [ ] AC-3: Raw `rows: string[][]`, `rowPos(i)`, `pos`, and `anchor` on the table node are unchanged; the typed store is additive and sparse.
- [ ] AC-4: A failing transform still emits exactly one `content/table/cell` finding at the offending row's line (A3 remap preserved) and caches no typed value for that cell.
- [ ] AC-5: The cached output is not present on the public `tree` surface (only reachable through the node accessor the model consumes).
- [ ] AC-6: `npm run test` and `npm run typecheck` pass; no existing golden changes.

## Out of scope

- The model-side / type-level read-back (`TableView<z.output<cells>>`, `Infer`, `tableView` reading the cache) — that is `T-SCRB`, which depends on this task and flips `cell-typed`.
- List items (`T-SCLI`) and position preservation (`T-SCPP`).

## Dependencies

- [[T-SCFX-structured-cells-fixture-scaffold]] — the gated fixtures + stubbed surface this builds the runtime substrate for.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `packages/core/src/core/content.test.ts` ("a transform cell caches its parsed output"; a no-transform column reports `typed(...) === undefined`).
- AC-2: auto — cached from the existing `res` inside `validateTable`'s single per-cell `safeParse` loop (no second Zod pass / traversal); confirmed by code inspection and by the failing-transform test still emitting exactly one finding.
- AC-3: auto — `packages/core/src/core/projection.test.ts` asserts raw `rows` unchanged and the overlay empty before any write; the full golden/consumption corpus passed unchanged, so `rowPos`/`pos`/`anchor` are untouched.
- AC-4: auto — `content.test.ts` ("a failing transform caches nothing and still emits one `content/table/cell` finding") asserts the finding shape (id + row line) and `typed(...) === undefined` for that cell.
- AC-5: auto — `content.test.ts` injects a sentinel value and asserts `JSON.stringify(node)` / `JSON.stringify(tree)` do not contain it while `typed()` returns it; the store is a closure-local `Map`, not an enumerable property.
- AC-6: auto — `sdlc quality run` reported `OK 5/5` (build, typecheck, lint, test, package-check); the baseline-gated re-run reported `OK 5/5` with zero new drift; no golden/snapshot changes.

### What worked

- The additive design kept the change tiny — ~10 lines across three source files. The `safeParse` per cell already existed; only its discarded `res.data` needed capturing, so there was no new pass to introduce or reconcile.
- Backing the overlay with a closure-captured `Map` made AC-5 (never on the public `tree`) fall out for free — no serialization guard or `tree`-shape carve-out was needed; a sentinel test proved it.
- The baseline-gated quality gate ran clean end-to-end (0 pre-existing findings at the base SHA, 0 new drift), so Step 7 gave an unambiguous `OK 5/5` with no triage.

### Friction and automation gaps

- Task cited `src/core/...` paths that had moved to `packages/core/src/core/...` in a monorepo restructure, yet the readiness gate's `paths` claim-resolver did not flag them (the `path#symbol` citation shape and non-unique basenames slip past it) — task-work had to hand the implementer corrected paths out-of-band — the `paths` claim-resolver should detect a `path#symbol` citation whose file moved under a new directory prefix (a repo-wide `refresh-planning-paths-post-monorepo-split` task already owns fixing the docs themselves).
- Step 3b's `preflight_permissions.ts` reported hard gaps (`bun`, `node`, `Write`, `Edit`) that did not reflect the actually-permissive dispatched sandbox (every `bun run` and file write succeeded) — in an autonomous dispatch there is no interactive `/config` grant, so the exit-1 had to be judged a false positive — the probe should reconcile against effective harness permissions (or downgrade to advisory) when run in a dispatched/non-interactive context.
- A direct `git push origin HEAD:main` for the optional task-body relevance edit was denied by the auto-mode classifier while the sanctioned `--commit-on main` tooling (ensure-ready / start-task, which push via a `bun run` subprocess) passed — no automation change warranted (the classifier's PR-review intent is correct); noted only so future runs fold relevance edits into the reviewed feature branch rather than a standalone main push.
- The spec's example comment implies projected raw rows retain inline-code backticks, but `flattenInline` strips them (existing tested behavior) — no code impact; a task-doc authoring nuance to correct when the paths refresh touches this file.
