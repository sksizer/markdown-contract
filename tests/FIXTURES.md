# Fixture-driven tests

The end-to-end suite is seeded from the **provenance example corpus**
(`provenance/d0014/examples/`) — a graded set of validation and consumption cases authored
one capability at a time. Each example becomes a fixture: an input document paired with its
expected findings (validation) or its typed-model reads (consumption). The suite is built to
**green incrementally** — every fixture is skipped until the component it exercises lands, the
same way the example corpus was built up.

This is the **integration corpus** — it exercises the assembled pipeline and lives under
`tests/`. Per-module **unit tests are peer files** next to their module in `src/` (e.g.
`src/core/projection.test.ts`); see `CLAUDE.md` for that convention.

## Layout

| Path | Role |
|---|---|
| `tests/components.ts` | The `IMPLEMENTED` switch — one boolean per pipeline component. |
| `tests/harness.ts` | The `Fixture` types + the runners (`runValidationFixtures` / `runConsumptionFixtures`). |
| `tests/fixtures/validation/*.ts` | One file per validation example; `export default` a `ValidationFixture`. |
| `tests/fixtures/consumption/*.ts` | One file per consumption example; `export default` a `ConsumptionFixture`. |
| `tests/fixtures/{validation,consumption}/index.ts` | Barrels — import each fixture and list it. |
| `tests/fixtures/{validation,consumption}/*.md` | Each case's input document (one `.md` per case; loaded via `loadSource`). |
| `tests/fixtures/{validation,consumption}/*.contract.yaml` | Per-fixture **v1 YAML contract peer** — the declarative-DSL expression of the fixture's contract (exploratory mapping; loader pending — M-0002 / D-0008). |
| `tests/validation.test.ts` / `tests/consumption.test.ts` | Feed the barrels to the runners. |
| `tests/fixtures/YAML-MAPPING.md` | Fixture → v1-YAML coverage matrix (full / partial + gap reasons). |
| `tests/yaml-parity.test.ts` | Asserts every fixture has a YAML peer; pending TS⇄YAML finding-parity suite (skipped until the loader lands). |

## Authoring a fixture

A fixture builds its contract **lazily** (`build: () => contract(...)`). The engine
combinators throw "not implemented" until their plane lands, so the build runs only inside an
*active* test — a skipped fixture still type-checks but never executes a stub.

Each case's markdown lives in a **peer `.md` file** (see `CLAUDE.md` → Fixture markdown):
one `.md` per case — `<fixture>.<case>.md` (or bare `<fixture>.md` when single-case) — loaded
verbatim via `loadSource(import.meta.url, "./<file>.md")`. Keeping the document in a real
`.md` file means it reads as markdown, and the bytes are used as-is so position-pinned
findings stay exact.

### Validation

```ts
import { contract, section, sections, table } from "../../../src/index.js";
import { loadSource } from "../../harness.js";
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
    { label: "pass — all declared columns present",
      source: loadSource(import.meta.url, "./10b-table-missing-column.pass.md"), findings: [] },
    { label: "fail — Change column dropped",
      source: loadSource(import.meta.url, "./10b-table-missing-column.fail.md"),
      findings: [{ id: "content/table/column-missing", level: "error", line: 3 }] },
  ],
};
export default v10b;
```

Author the two peer documents beside it — `10b-table-missing-column.pass.md` and
`…fail.md` — then add the fixture to `tests/fixtures/validation/index.ts`.

`findings` is matched on `{ id, level?, line? }` in the engine's deterministic order. `id` is
required; `level` and `line` are asserted **only when present**, so you can fix the id now and
tighten the position when the component lands. `findings: []` is a passing document.

### Consumption

```ts
const c05: ConsumptionFixture = {
  id: "c05",
  title: "TableView typed rows",
  component: "consumption",
  source: loadSource(import.meta.url, "./05-tableview-typed-rows.md"), // single-case → bare stem
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

## Inference fixtures

The config-inference feature (D-0009 / C-0008) — `markdown-contract init <dir>…`, which scaffolds
a tight-but-accepting config from existing markdown — has its own fixture family. Where a
validation/consumption fixture is one document, an **inference fixture is a whole input vault**: a
small, realistic miniature corpus that `inferConfig(dir, opts)` is run over, end to end.

### Layout

Each fixture is a self-contained directory under `tests/fixtures/infer/`:

| Path | Role |
|---|---|
| `tests/fixtures/infer/NN-name/vault/` | The **input markdown vault** — the corpus `inferConfig` reads (frontmatter + `## H2` sections). |
| `tests/fixtures/infer/NN-name/fixture.ts` | `export default` an `InferenceFixture`; `dir` is the absolute path to `./vault`. |
| `tests/fixtures/infer/_assert.ts` | Shared accessors for inspecting an `InferredContract.def` (sections/order/fields) by name. |
| `tests/fixtures/infer/index.ts` | Barrel — imports each `NN-name/fixture.js`, exports the array. |
| `tests/inference.test.ts` | Feeds the barrel to `runInferenceFixtures("inference", …)`. |
| `tests/inference.cli.test.ts` | CLI-level `init` tests, gated by `IMPLEMENTED["infer-cli"]`. |

The vault `dir` is computed from the fixture module:

```ts
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("./vault", import.meta.url));
```

### The `InferenceFixture` shape

```ts
export interface InferenceFixture {
  id: string; title: string; component: Component; // an `infer-*` gating component
  dir: string;                                     // ABSOLUTE path to the input vault
  opts?: InferOptions;                             // mirrors the init flags (meta/depth/relax/…)
  assert?: (result: InferResult) => void;          // the inferred-shape check
  note?: string;
}
```

### The three auto-tests

`runInferenceFixtures` runs, per fixture:

1. **accept-by-construction** — the defining guarantee (D-0009 § The shape). The inferred
   contracts are loaded back through `compileContractObject`, assembled into a `CorpusConfig`, and
   run via `runCorpus` over the vault; the run must report **zero error-level findings**. The
   generated config can never reject the corpus it was built from.
2. **deterministic** — `inferConfig` is run twice and the `contracts` must be identical
   (D-0009 § Idempotence — re-running on an unchanged corpus is a no-op diff).
3. **inferred shape** — runs only when the fixture sets `assert`; inspects
   `result.contracts[…].def` / `.name` / `.include`, `result.warnings`, and `result.mode`
   against the spec (e.g. which sections are required vs `optional`, the detected `order`, each
   frontmatter field's value-ladder schema, the directory-slug names and globs).

### The fixture ladder

A graded, additive set (simple → complex): `01-flat-uniform`, `02-optional-sections`,
`03-order-recognized`, `04-order-strict`, `05-order-conflict` (sections + order, single-contract);
`06-frontmatter-values` (the value-type ladder); `07-tree-depth1`, `08-tree-depth2`,
`09-root-and-subdirs`, `10-stranded-depth` (directory + depth grouping, naming, root contracts,
stranded-file warnings); `11-relax` (the permissive `--relax` floor).

### Greening convention

The inference fixtures gate on four `infer-*` components in `tests/components.ts`, flipped in
pipeline order by the implementation phases:

```
infer-core → infer-values → infer-meta → infer-cli
```

| component | greens fixtures that need… |
|---|---|
| `infer-core` | section enumeration / required-vs-optional / order detection (single-contract). |
| `infer-values` | the frontmatter value-type ladder (const/number/boolean/array/format/enum/string). |
| `infer-meta` | directory + depth grouping, full-path-slug naming, root contracts, stranded warnings. |
| `infer-cli` | the `init` verb + `--relax` (the CLI surface and its loosening dial). |

A fixture runs **iff** `IMPLEMENTED[its component]` is `true`; otherwise the harness skips it
(green, not failing) — exactly the convention the validation/consumption families use. In PR1 all
four flags are `false`, so every inference fixture and the whole `init` CLI suite are skipped, the
`inferConfig` stub (which throws `notImplemented`) never executes, and the suite stays green. Each
implementation phase flips its flag in the PR that lands the component.
