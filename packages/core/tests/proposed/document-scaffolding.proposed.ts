/**
 * PROPOSED API — NOT IMPLEMENTED. A spec-level sketch of document scaffolding
 * (capability C-0011, decision D-0017): the `scaffold(contract) → string` blank
 * generator and the typed builder `template.create(contract)(values) → string`.
 *
 * Why it lives here, under `tests/`:
 *  - it is a *design spec*, not shipped source, so it must never land in `dist`
 *    (`tsconfig.build.json` builds only `src`) nor count against `src` coverage
 *    (`vitest.config.ts` includes only `src/**` for coverage);
 *  - but it MUST type-check, so the example usage in the peer `*.todo.test.ts`
 *    proves the surface is coherent (`tsconfig.json` includes `tests`).
 *
 * The runtime stubs throw. That mirrors the harness convention (`tests/harness.ts`):
 * combinators/entry points are stubbed until their plane lands, so the *types* are
 * exercised now while the `*.todo.test.ts` cases stay skipped until the code exists.
 */

import type { Contract } from "../../src/index.js";

// ── Options ──────────────────────────────────────────────────────────────────

/** How a value the generator cannot synthesise is rendered. */
export type FillPolicy = "blank" | "placeholder" | "todo";

/** What to do with an `optional(...)` section. */
export type OptionalPolicy = "omit" | "comment";

/** Policy knobs for the choices a contract leaves open (D-0017 § 3). */
export interface ScaffoldOptions {
  /** unsatisfiable leaf/field → blank, a placeholder specimen, or a `TODO` token (default: `placeholder`) */
  fill?: FillPolicy;
  /** an `optional` section → omitted, or emitted as a commented hint (default: `omit`) */
  optional?: OptionalPolicy;
  /** which branch of a `oneOf` to emit (default: the first declared name) */
  oneOf?: string;
}

// ── The typed input, derived from the contract ───────────────────────────────

/** A section's body fill: prose, or structured data for a leaf (table rows, list items, code). */
export type SectionFill = string | SectionFillObject;

export interface SectionFillObject {
  /** prose placed under the heading */
  prose?: string;
  /** rows for a `table` leaf, keyed by declared column */
  rows?: Array<Record<string, string>>;
  /** items for a `list` leaf */
  items?: string[];
  /** the body of a `code` leaf */
  code?: string;
}

/**
 * Per-section body fills. Keyed loosely here; a future refinement types the keys
 * and each value against the section grammar + leaves (D-0017 § 5) — the write-side
 * mirror of the read model's `BodyOf<S>`. `_B` is the contract's inferred body type,
 * carried for that later tightening.
 */
export type BodyInput<_B> = Record<string, SectionFill>;

/**
 * The typed values a builder accepts, derived from the contract — the write-side
 * dual of `Infer<C>` (the read model). Frontmatter narrows to the contract's own
 * field types (so an enum field only accepts its members); every field is optional
 * because anything omitted falls back to the fill policy.
 */
export type ScaffoldInput<C> = C extends Contract<infer F, infer B>
  ? {
      frontmatter?: Partial<F>;
      body?: BodyInput<B>;
    }
  : never;

/** A typed factory bound to one contract: typed values in, a conforming document out. */
export type TypedBuilder<C> = (values: ScaffoldInput<C>) => string;

// ── The proposed surface ─────────────────────────────────────────────────────

const NOT_IMPLEMENTED = "not implemented — proposed API (see C-0011 / D-0017)";

/**
 * Emit a blank, structurally-valid skeleton document for a contract. The pure
 * `contract → string` scaffolder behind the `markdown-contract new` CLI verb.
 */
export function scaffold(contract: Contract, opts: ScaffoldOptions = {}): string {
  throw new Error(`scaffold(${typeof contract}, ${JSON.stringify(opts)}): ${NOT_IMPLEMENTED}`);
}

/** The templates wrapper: a typed builder over a contract. */
export interface Template {
  create<C extends Contract<unknown, unknown>>(contract: C, opts?: ScaffoldOptions): TypedBuilder<C>;
}

export const template: Template = {
  create(contract, opts = {}) {
    throw new Error(`template.create(${typeof contract}, ${JSON.stringify(opts)}): ${NOT_IMPLEMENTED}`);
  },
};
