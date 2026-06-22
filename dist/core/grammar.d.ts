import type { Contract, ContractDef, Ctx, Doc, DocRule, Finding, LevelOpts, Rule, SectionNode, SectionOpts, SectionSeq, Spec } from "./types.js";
export { matchStructure } from "./structure.js";
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
 */
export declare function sections<B>(opts: LevelOpts, specs: Spec[]): SectionSeq<B>;
/** Declare a required section by name, or by an alias set (`string[]`). */
export declare function section(name: string | string[], opts?: SectionOpts): Spec;
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
export declare function docRule<F>(id: string, fn: (doc: Doc<F>, ctx: Ctx) => Finding[]): DocRule;
//# sourceMappingURL=grammar.d.ts.map