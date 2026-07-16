/**
 * The fixture-driven test harness.
 *
 * Fixtures are derived from the provenance example corpus (`provenance/d0014/examples/`):
 * each validation fixture pairs an input document with its expected findings; each
 * consumption fixture pairs a valid document with typed-model reads (or an expected throw).
 *
 * Design notes:
 *  - **Lazy contracts.** A fixture builds its contract through `build: () => contract(...)`.
 *    The engine combinators are stubbed (they throw "not implemented" until their plane
 *    lands), so the build runs only inside an *active* test — skipped fixtures type-check
 *    but never execute the stubs.
 *  - **Tolerant finding match.** Findings are compared on `{ id, level?, line? }` in the
 *    engine's deterministic order. `level`/`line` are asserted only when the golden pins
 *    them, so a fixture can fix the id now and tighten position later.
 *  - **Golden peers are the source of truth.** A validation case's expected findings live in
 *    a language-neutral `<source-basename>.expected.json` peer beside the case's `.md` file
 *    (D-0018 §D3), loaded via `loadExpected` — the fixture module keeps only build/label/source
 *    wiring. The Rust corpus harness walks the same goldens via
 *    `fixtures/validation/corpus-manifest.json`.
 *  - **Incremental greening.** A fixture runs only when `IMPLEMENTED[its component]` is true
 *    (see `components.ts`); otherwise it is skipped.
 *
 * See `tests/FIXTURES.md` for the authoring format and the greening convention.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";
import type { InferOptions, InferResult } from "../src/declarative/index.js";
import { compileContractObject, inferConfig } from "../src/declarative/index.js";
import type { Contract, Doc, Finding } from "../src/index.js";
import { ContractError } from "../src/index.js";
import type { CorpusConfig } from "../src/runner/index.js";
import { runCorpus } from "../src/runner/index.js";
import { type Component, IMPLEMENTED } from "./components.js";

const DEFAULT_PATH = "fixture.md";

/**
 * Load a fixture's markdown from a peer `.md` file. Each fixture case keeps its
 * document in a sibling file (one `.md` per case; bare stem for single-case) so the
 * markdown reads as a real document rather than an inlined string array. `metaUrl`
 * is the fixture module's `import.meta.url`; `rel` is the peer file (e.g. `./x.md`).
 * The bytes are returned verbatim — no normalization — so position-pinned findings
 * stay exact.
 */
export function loadSource(metaUrl: string, rel: string): string {
  return readFileSync(new URL(rel, metaUrl), "utf8");
}

/** An expected finding — `id` is required; `level`/`line`/`hint` are asserted only when given. */
export interface ExpectedFinding {
  id: string;
  level?: Finding["level"];
  /** `pos.line`; omit while a position is still being pinned down. */
  line?: number;
  /** the v2 `description:`-derived hint (D-0020); asserted only when the golden pins it. */
  hint?: string;
}

/**
 * Load a validation case's expected findings from its golden peer — the
 * `<source-basename>.expected.json` file beside the case's `.md` input (D-0018 §D3: one
 * language-neutral golden per case, shared with the Rust corpus harness). Mirrors
 * `loadSource`: `metaUrl` is the fixture module's `import.meta.url`; `rel` is the peer
 * (e.g. `./x.fail.expected.json`). The golden is a JSON array of `{ id, level?, line? }`
 * in engine order; `[]` asserts a passing document.
 */
export function loadExpected(metaUrl: string, rel: string): ExpectedFinding[] {
  return JSON.parse(readFileSync(new URL(rel, metaUrl), "utf8")) as ExpectedFinding[];
}

export interface ValidationCase {
  /** "pass — …" or a description of the failure variant. */
  label: string;
  source: string;
  /** Expected findings in engine order (from the `.expected.json` golden); `[]` is a passing document. */
  findings: ExpectedFinding[];
}

export interface ValidationFixture {
  /** stable short id, e.g. "v01" / "v10b". */
  id: string;
  title: string;
  /** the gating component (skipped until `IMPLEMENTED[component]`). */
  component: Component;
  /** `ctx.path` — defaults to "fixture.md". */
  path?: string;
  /** lazy contract construction — runs only inside an active test. */
  build: () => Contract;
  cases: ValidationCase[];
  /**
   * Intentionally twin-less: this fixture has no `.contract.yaml` parity peer (yet).
   * Set while a fixture is authored ahead of its declarative loader. The yaml-parity
   * "peers exist" check accepts a `peerless` fixture silently (no warning), and the
   * behavioral parity loops skip it (running its YAML twin would throw). See
   * `tests/yaml-parity.test.ts`.
   */
  peerless?: boolean;
  note?: string;
}

export interface ModelRead {
  label: string;
  get: (doc: Doc) => unknown;
  equals: unknown;
}

export interface ConsumptionFixture {
  /** stable short id, e.g. "c01". */
  id: string;
  title: string;
  component: Component;
  path?: string;
  source: string;
  build: () => Contract;
  /** typed-model reads asserted against `read()`'s `doc`. */
  reads?: ModelRead[];
  /** when set, assert `read()` throws `ContractError` instead of running `reads`. */
  throws?: "ContractError";
  /**
   * Intentionally twin-less: this fixture has no `.contract.yaml` parity peer (yet).
   * Honored identically to {@link ValidationFixture.peerless}; see `tests/yaml-parity.test.ts`.
   */
  peerless?: boolean;
  note?: string;
}

function shape(f: Finding): {
  id: string;
  level: Finding["level"];
  line: number | undefined;
  hint: string | undefined;
} {
  return { id: f.id, level: f.level, line: f.pos?.line, hint: f.hint };
}

function assertFindings(actual: Finding[], expected: ExpectedFinding[]): void {
  const got = actual.map(shape);
  expect(got.length, `finding count — actual: ${JSON.stringify(got)}`).toBe(expected.length);
  expected.forEach((e, i) => {
    const a = got[i];
    expect(a?.id, `finding[${i}].id`).toBe(e.id);
    if (e.level !== undefined) expect(a?.level, `finding[${i}].level`).toBe(e.level);
    if (e.line !== undefined) expect(a?.line, `finding[${i}].line`).toBe(e.line);
    if (e.hint !== undefined) expect(a?.hint, `finding[${i}].hint`).toBe(e.hint);
  });
}

function census(label: string, fixtures: { component: Component }[]): void {
  const total = fixtures.length;
  const active = fixtures.filter((f) => IMPLEMENTED[f.component]).length;
  const skipped = total - active;
  test(`census · ${label}: ${active} active / ${skipped} skipped / ${total} total`, () => {
    expect(total).toBeGreaterThan(0);
  });
}

export function runValidationFixtures(label: string, fixtures: ValidationFixture[]): void {
  census(label, fixtures);
  for (const fx of fixtures) {
    const suite = IMPLEMENTED[fx.component] ? describe : describe.skip;
    suite(`[${fx.id}] ${fx.title} · ${fx.component}`, () => {
      for (const c of fx.cases) {
        test(c.label, () => {
          const contract = fx.build();
          const result = contract.validate(c.source, { path: fx.path ?? DEFAULT_PATH });
          assertFindings(result.findings, c.findings);
        });
      }
    });
  }
}

export function runConsumptionFixtures(label: string, fixtures: ConsumptionFixture[]): void {
  census(label, fixtures);
  for (const fx of fixtures) {
    const one = IMPLEMENTED[fx.component] ? test : test.skip;
    one(`[${fx.id}] ${fx.title} · ${fx.component}`, () => {
      const contract = fx.build();
      const ctx = { path: fx.path ?? DEFAULT_PATH };
      if (fx.throws === "ContractError") {
        expect(() => contract.read(fx.source, ctx)).toThrow(ContractError);
        return;
      }
      const doc = contract.read(fx.source, ctx);
      for (const r of fx.reads ?? []) {
        expect(r.get(doc), r.label).toEqual(r.equals);
      }
    });
  }
}

/**
 * An inference fixture (D-0009 / C-0008). Each fixture is a self-contained input vault — a
 * small, realistic miniature markdown corpus — under `tests/fixtures/infer/NN-name/vault/`,
 * pointed at by an absolute `dir`. `inferConfig(dir, opts)` is run over it and the result is
 * exercised by three auto-tests (see `runInferenceFixtures`):
 *  - **accept-by-construction** — the inferred config, loaded back through
 *    `compileContractObject` and run via `runCorpus`, reports zero error-level findings (the
 *    defining guarantee, D-0009 § The shape).
 *  - **deterministic** — inferring twice yields identical contracts (D-0009 § Idempotence).
 *  - **inferred shape** — the optional `assert` callback inspects the model against the spec.
 */
export interface InferenceFixture {
  id: string;
  title: string;
  /** the gating component (skipped until `IMPLEMENTED[component]`): an `infer-*` flag. */
  component: Component;
  /** ABSOLUTE path to the input vault (compute via `fileURLToPath(new URL("./vault", import.meta.url))`). */
  dir: string;
  opts?: InferOptions;
  /** the inferred-shape assertion — runs only when present. */
  assert?: (result: InferResult) => void;
  note?: string;
}

/**
 * Run the inference fixtures. Mirrors `runValidationFixtures`: a per-suite census line, then
 * one `describe` (or `describe.skip` while the gating `infer-*` component is unimplemented)
 * per fixture, each with up to three tests. The `inferConfig` stub throws `notImplemented`
 * until the pipeline lands, so a skipped fixture type-checks but never executes the stub.
 */
export function runInferenceFixtures(label: string, fixtures: InferenceFixture[]): void {
  census(label, fixtures);
  for (const fx of fixtures) {
    const suite = IMPLEMENTED[fx.component] ? describe : describe.skip;
    suite(`[${fx.id}] ${fx.title} · ${fx.component}`, () => {
      test("accept-by-construction", () => {
        const r = inferConfig(fx.dir, fx.opts);
        const cfg: CorpusConfig = {
          rules: r.contracts.map((c) => ({
            include: c.include,
            // Inferred defs are authored in the v2 vocabulary (D-0020) — compile as v2.
            contract: compileContractObject(c.def, 2),
          })),
        };
        const { findings } = runCorpus(cfg, { cwd: fx.dir });
        expect(findings.filter((f) => f.level === "error")).toEqual([]);
      });

      test("deterministic", () => {
        const a = inferConfig(fx.dir, fx.opts);
        const b = inferConfig(fx.dir, fx.opts);
        expect(b.contracts).toEqual(a.contracts);
      });

      if (fx.assert) {
        test("inferred shape", () => {
          fx.assert!(inferConfig(fx.dir, fx.opts));
        });
      }
    });
  }
}
