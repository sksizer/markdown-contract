import type { BodyOf, Contract, ContractDef, Ctx, Doc, DocRule, DocTree, Finding, LevelOpts, NamesTupleOf, Rule, SectionNode, SectionOpts, SectionSeq, SectionSpec, SectionValue, Spec } from "./types.js";
/**
 * A build-time contract-authoring error — thrown by `contract(...)` / `sections(...)`, not
 * collected as a `Finding`. Carries the offending finding id (`contract/key-collision`) in
 * its message so the build-time guard is identifiable. Distinct from `ContractError`
 * (D-0001), which is the document-time strict-door failure carrying error-level findings.
 */
export declare class ContractBuildError extends Error {
    readonly id: string;
    constructor(id: string, message: string);
}
/**
 * Compile a `ContractDef` into a `Contract` — two doors onto one engine. Retains the def
 * (read by `validate()` / `read()`), and runs the build-time guards.
 */
export declare function contract<F, B>(def: ContractDef<F, B>): Contract<F, B>;
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
export declare function sections<const S extends readonly Spec[]>(opts: LevelOpts, specs: S): SectionSeq<BodyOf<S>>;
/**
 * Declare a required section by name, or by an alias set (`string[]`). Generic (T-SCRB) over the
 * name(s) and the `SectionOpts` so its result carries the typed value the section's dual-key key
 * binds — a promoted `TableView<Row>` when its sole `content` is a `table(...)` leaf (the `Row`
 * derived from that table's `columns` / `cells`), else `SectionView`. Defaults keep a bare
 * `section("Name")` unchanged and assignable wherever a `Spec` is expected.
 */
export declare function section<const Names extends string | readonly string[], const O extends SectionOpts = SectionOpts>(name: Names, opts?: O): SectionSpec<SectionValue<O>, NamesTupleOf<Names>>;
/** Mark a `Spec` optional. */
export declare function optional(spec: Spec): Spec;
/** Declare a choice over interchangeable spellings at one position. */
export declare function oneOf(names: string[], opts?: SectionOpts): Spec;
/** Permit a window of unknown sections at this position, optionally bounded by `min`/`max`. */
export declare function gap(opts?: {
    min?: number;
    max?: number;
}): Spec;
/** Register a per-node named rule (the matcher runs it on its bound section, T-8RJ5). */
export declare function rule(id: string, fn: (node: SectionNode, ctx: Ctx) => Finding[]): Rule;
/**
 * Register a cross-plane / cross-file named rule over the whole typed doc. Constructed
 * inertly here; the engine wires `docRule` into the cross-plane merge in T-3NC8.
 */
export declare function docRule<F>(id: string, fn: (doc: Doc<F>, ctx: Ctx, tree: DocTree) => Finding[]): DocRule;
//# sourceMappingURL=grammar.d.ts.map