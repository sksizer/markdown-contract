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
 *    engine's deterministic order. `level`/`line` are asserted only when the fixture pins
 *    them, so a fixture can fix the id now and tighten position later.
 *  - **Incremental greening.** A fixture runs only when `IMPLEMENTED[its component]` is true
 *    (see `components.ts`); otherwise it is skipped.
 *
 * See `tests/FIXTURES.md` for the authoring format and the greening convention.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { ContractError } from "../src/index.js";
import type { Contract, Doc, Finding } from "../src/index.js";
import { IMPLEMENTED, type Component } from "./components.js";

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

/** An expected finding — `id` is required; `level`/`line` are asserted only when given. */
export interface ExpectedFinding {
  id: string;
  level?: Finding["level"];
  /** `pos.line`; omit while a position is still being pinned down. */
  line?: number;
}

export interface ValidationCase {
  /** "pass — …" or a description of the failure variant. */
  label: string;
  source: string;
  /** Expected findings in engine order; `[]` is a passing document. */
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
  note?: string;
}

function shape(f: Finding): { id: string; level: Finding["level"]; line: number | undefined } {
  return { id: f.id, level: f.level, line: f.pos?.line };
}

function assertFindings(actual: Finding[], expected: ExpectedFinding[]): void {
  const got = actual.map(shape);
  expect(got.length, `finding count — actual: ${JSON.stringify(got)}`).toBe(expected.length);
  expected.forEach((e, i) => {
    const a = got[i];
    expect(a?.id, `finding[${i}].id`).toBe(e.id);
    if (e.level !== undefined) expect(a?.level, `finding[${i}].level`).toBe(e.level);
    if (e.line !== undefined) expect(a?.line, `finding[${i}].line`).toBe(e.line);
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
