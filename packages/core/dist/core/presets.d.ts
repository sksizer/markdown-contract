import type { LevelOpts, SectionOpts, SectionSeq, Spec } from "./types.js";
/** Lenient level options: unordered body, unknown sections allowed. */
export declare const LENIENT: LevelOpts;
/** Strict level options: strict order, no unknown sections. */
export declare const STRICT: LevelOpts;
/** A lenient body grammar — `sections(LENIENT, specs)`. */
export declare function lenientBody(specs: Spec[]): SectionSeq;
/** A strict body grammar — `sections(STRICT, specs)`. */
export declare function strictBody(specs: Spec[]): SectionSeq;
/**
 * An optional section — `optional(section(name, opts))`. Absorbs the `optional(section(...))`
 * convergence repeated across the schemas' optional trailing sections.
 */
export declare function optionalSection(name: string | string[], opts?: SectionOpts): Spec;
//# sourceMappingURL=presets.d.ts.map