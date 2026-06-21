# Fixture-driven tests

The end-to-end suite is seeded from the **provenance example corpus**
(`provenance/d0014/examples/`) — a graded set of validation and consumption cases authored
one capability at a time. Each example becomes a fixture: an input document paired with its
expected findings (validation) or its typed-model reads (consumption). The suite is built to
**green incrementally** — every fixture is skipped until the component it exercises lands, the
same way the example corpus was built up.

## Layout

| Path | Role |
|---|---|
| `tests/components.ts` | The `IMPLEMENTED` switch — one boolean per pipeline component. |
| `tests/harness.ts` | The `Fixture` types + the runners (`runValidationFixtures` / `runConsumptionFixtures`). |
| `tests/fixtures/validation/*.ts` | One file per validation example; `export default` a `ValidationFixture`. |
| `tests/fixtures/consumption/*.ts` | One file per consumption example; `export default` a `ConsumptionFixture`. |
| `tests/fixtures/{validation,consumption}/index.ts` | Barrels — import each fixture and list it. |
| `tests/validation.test.ts` / `tests/consumption.test.ts` | Feed the barrels to the runners. |
| `tests/smoke.test.ts` | The minimal import/export check (kept separate). |

## Authoring a fixture

A fixture builds its contract **lazily** (`build: () => contract(...)`). The engine
combinators throw "not implemented" until their plane lands, so the build runs only inside an
*active* test — a skipped fixture still type-checks but never executes a stub.

### Validation

```ts
import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";

const v10b: ValidationFixture = {
  id: "v10b",
  title: "Table missing a declared column",
  component: "content",                 // the gating component (below)
  path: "docs/x.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Files", { content: table({ columns: ["Location", "Kind", "Change"], minRows: 1 }) }),
      ]),
    }),
  cases: [
    { label: "pass — all declared columns present", source: "## Files\n\n| Location | Kind | Change |\n| - | - | - |\n| `a.ts` | modify | x |\n", findings: [] },
    { label: "fail — Change column dropped", source: "## Files\n\n| Location | Kind |\n| - | - |\n| `a.ts` | modify |\n",
      findings: [{ id: "content/table/column-missing", level: "error", line: 3 }] },
  ],
};
export default v10b;
```

Then add it to `tests/fixtures/validation/index.ts`.

`findings` is matched on `{ id, level?, line? }` in the engine's deterministic order. `id` is
required; `level` and `line` are asserted **only when present**, so you can fix the id now and
tighten the position when the component lands. `findings: []` is a passing document.

### Consumption

```ts
const c05: ConsumptionFixture = {
  id: "c05",
  title: "TableView typed rows",
  component: "consumption",
  source: "## Files\n\n| File | Kind | Location |\n...",
  build: () => contract({ /* … */ }),
  reads: [
    { label: "rowCount", get: (doc) => (doc.body as any).files.rowCount, equals: 3 },
    { label: "column(Kind)", get: (doc) => (doc.body as any).files.column("Kind"), equals: ["add", "modify", "delete"] },
  ],
  // or, for the error door:  throws: "ContractError",
};
```

`reads` run against `read()`'s `doc`; each `get(doc)` is compared with `toEqual(equals)`. Use
`throws: "ContractError"` for the strict-door failure cases. `doc.body` is typed `unknown` on
the generic `Doc`, so fixtures navigate the dual-key facade with a local cast.

## Incremental greening

Every fixture is tagged with the **gating component** — the last component it needs to pass.
Components land in pipeline order, and each implementation task flips its own flag in the PR
that lands it:

```
projection → structure → content → validate → consumption → cli
```

`tests/components.ts`:

```ts
export const IMPLEMENTED: Record<Component, boolean> = {
  projection: false, structure: false, content: false,
  validate: false, consumption: false, cli: false,
};
```

A fixture runs **iff** `IMPLEMENTED[its component]` is `true`; otherwise the harness skips it
(green, not failing). To green your slice: implement the component, set its flag to `true`, and
run `npm run test` — your fixtures activate. If a fixture needs tightening (a position, a
message), adjust it in the same PR.

`npm run test` prints a per-suite **census** line (`N active / M skipped / T total`) so the
active surface is visible as it grows.

### Choosing the gating component

| component | greens fixtures that need… |
|---|---|
| `projection` | only `parse()` → `DocTree` (positions, sections, block kinds, invariants) |
| `structure` | the section/anchor/block-presence grammar (`structure/*` findings) |
| `content` | Zod leaves + frontmatter (`content/*`, `frontmatter/*` findings) |
| `validate` | the merged one-pass finding stream + ordering across planes |
| `consumption` | the typed model (`read()`/`validate().doc`, views, `byAnchor`, dual-key) |
| `cli` | the corpus runner / CLI surface |

A real-corpus end-to-end case that needs several planes is tagged with the **highest** one it
reaches (e.g. a full decision contract → `validate`; a typed read of it → `consumption`).
