/**
 * The contract combinators — `contract()` plus the body-grammar vocabulary
 * (`sections` / `section` / `optional` / `oneOf` / `gap`) and the named-rule
 * factories (`rule` / `docRule`). These declare a contract's two planes (C-0005).
 *
 * As of T-8RJ5 the combinators CONSTRUCT the grammar IR (inert tagged data from
 * `types.ts`) instead of throwing, `contract()` retains its def and wires `validate`
 * to the structure matcher, and a build-time camelCase key collision among declared
 * sibling names throws a `ContractBuildError` (`contract/key-collision`). The content
 * leaf and the cross-plane / docRule merge land in T-5LW7 / T-3NC8.
 */
import { toCamelKey } from "./camel.js";
import type {
  BodyOf,
  Contract,
  ContractDef,
  Ctx,
  Doc,
  DocRule,
  DocTree,
  Finding,
  GapSpec,
  LevelOpts,
  NamesTupleOf,
  OneOfSpec,
  OptionalSpec,
  Rule,
  SectionNode,
  SectionOpts,
  SectionSeq,
  SectionSpec,
  SectionValue,
  Spec,
  ValidateCtx,
} from "./types.js";
import { read as readEntry, validate as validateEntry } from "./validate.js";

// Re-export the structure matcher so callers can `import { matchStructure } from "./grammar.js"`.
export { matchStructure } from "./structure.js";

/**
 * A build-time contract-authoring error — thrown by `contract(...)` / `sections(...)`, not
 * collected as a `Finding`. Carries the offending finding id (`contract/key-collision`) in
 * its message so the build-time guard is identifiable. Distinct from `ContractError`
 * (D-0001), which is the document-time strict-door failure carrying error-level findings.
 */
export class ContractBuildError extends Error {
  readonly id: string;
  constructor(id: string, message: string) {
    super(message);
    this.name = "ContractBuildError";
    this.id = id;
  }
}

/**
 * Compile a `ContractDef` into a `Contract` — two doors onto one engine. Retains the def
 * (read by `validate()` / `read()`), and runs the build-time guards.
 */
export function contract<F, B>(def: ContractDef<F, B>): Contract<F, B> {
  const self = {
    validate(input: string | DocTree, ctx: ValidateCtx) {
      return validateEntry<F, B>(def, input, ctx);
    },
    read(source: string, ctx: ValidateCtx): Doc<F, B> {
      return readEntry<F, B>(def, source, ctx);
    },
  } as Contract<F, B> & { __def?: ContractDef<F, B> };
  // Stash the def for entry points / introspection (typed loosely; the public shape is `Contract`).
  self.__def = def;
  return self;
}

/**
 * Bundle an ordered `Spec[]` (with level options) into a body grammar. Runs the build-time
 * `contract/key-collision` guard: two declared sibling names that collapse to the same
 * camelCase key are rejected at construction (D-0003 / proposed-shape §6).
 *
 * Generic over the spec TUPLE (a `const` type parameter, T-SCRB) so it infers the typed body
 * {@link BodyOf} — each declared section's exact heading name keyed to its typed value (a promoted
 * `TableView<Row>` for a sole `content: table(...)` slot, else `SectionView`) — which threads
 * through `contract()` into `read()`'s `Doc.body` and `Infer`. Passing an ordinary `Spec[]` keeps
 * working; the typing is additive.
 */
export function sections<const S extends readonly Spec[]>(
  opts: LevelOpts,
  specs: S,
): SectionSeq<BodyOf<S>> {
  assertNoKeyCollision(specs);
  return { __brand: "SectionSeq", opts, specs } as SectionSeq<BodyOf<S>>;
}

/**
 * The build-time key-collision guard: among declared `section`/`oneOf` names at one level,
 * two distinct names collapsing to the same camelCase key throw `contract/key-collision`.
 * (Runs per level; nested `children` levels run their own guard when their `sections()` is
 * constructed.) Alias spellings within one `oneOf` / `section([...])` slot are *not* a
 * collision — they are one logical slot — so only the first spelling of each slot is keyed.
 */
function assertNoKeyCollision(specs: readonly Spec[]): void {
  const keyToName = new Map<string, string>();
  for (const spec of specs) {
    const inner = unwrapInner(spec);
    let primaryName: string | undefined;
    if (inner.kind === "section") primaryName = (inner as SectionSpec).names[0];
    else if (inner.kind === "oneOf") primaryName = (inner as OneOfSpec).names[0];
    if (primaryName === undefined) continue;
    const key = toCamelKey(primaryName);
    if (key === "") continue; // no generated alias → cannot collide on a key
    const prior = keyToName.get(key);
    if (prior !== undefined && prior !== primaryName) {
      throw new ContractBuildError(
        "contract/key-collision",
        `section names ‘${prior}’ and ‘${primaryName}’ both generate the camelCase key ‘${key}’; generated OOM keys must be unique`,
      );
    }
    keyToName.set(key, primaryName);
  }
}

/** Unwrap `optional(spec)` to its inner tagged spec. */
function unwrapInner(spec: Spec): SectionSpec | OneOfSpec | GapSpec {
  return spec.kind === "optional" ? unwrapInner((spec as OptionalSpec).spec) : spec;
}

/**
 * Declare a required section by name, or by an alias set (`string[]`). Generic (T-SCRB) over the
 * name(s) and the `SectionOpts` so its result carries the typed value the section's dual-key key
 * binds — a promoted `TableView<Row>` when its sole `content` is a `table(...)` leaf (the `Row`
 * derived from that table's `columns` / `cells`), else `SectionView`. Defaults keep a bare
 * `section("Name")` unchanged and assignable wherever a `Spec` is expected.
 */
export function section<
  const Names extends string | readonly string[],
  const O extends SectionOpts = SectionOpts,
>(name: Names, opts?: O): SectionSpec<SectionValue<O>, NamesTupleOf<Names>> {
  const names: string[] = Array.isArray(name) ? [...name] : [name as string];
  const spec: SectionSpec = { kind: "section", names, ...(opts ? { opts } : {}) };
  return spec as unknown as SectionSpec<SectionValue<O>, NamesTupleOf<Names>>;
}

/** Mark a `Spec` optional. */
export function optional(spec: Spec): Spec {
  const out: OptionalSpec = { kind: "optional", spec };
  return out;
}

/** Declare a choice over interchangeable spellings at one position. */
export function oneOf(names: string[], opts?: SectionOpts): Spec {
  const spec: OneOfSpec = { kind: "oneOf", names, ...(opts ? { opts } : {}) };
  return spec;
}

/** Permit a window of unknown sections at this position, optionally bounded by `min`/`max`. */
export function gap(opts?: { min?: number; max?: number }): Spec {
  const spec: GapSpec = {
    kind: "gap",
    ...(opts?.min !== undefined ? { min: opts.min } : {}),
    ...(opts?.max !== undefined ? { max: opts.max } : {}),
  };
  return spec;
}

/** Register a per-node named rule (the matcher runs it on its bound section, T-8RJ5). */
export function rule(id: string, fn: (node: SectionNode, ctx: Ctx) => Finding[]): Rule {
  return { __brand: "Rule", id, run: fn };
}

/**
 * Register a cross-plane / cross-file named rule over the whole typed doc. Constructed
 * inertly here; the engine wires `docRule` into the cross-plane merge in T-3NC8.
 */
export function docRule<F>(
  id: string,
  fn: (doc: Doc<F>, ctx: Ctx, tree: DocTree) => Finding[],
): DocRule {
  return { __brand: "DocRule", id, run: fn as DocRule["run"] };
}
