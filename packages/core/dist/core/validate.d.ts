import type { ContractDef, Doc, DocTree, ValidateCtx, ValidationResult } from "./types.js";
/**
 * The "show me everything" door — never throws; findings as data. Parses a `source: string`
 * (bundled projection) or accepts a pre-parsed `DocTree` (AC-1). Runs every plane in one
 * pass, merges + sorts the findings (AC-2), and gates the typed model on no error-level
 * finding (AC-3): `doc` is built lazily (a getter) so a passing fixture that only reads
 * `.findings` never forces model construction; when there is an error-level finding, `doc`
 * is `undefined`. The projection (`tree`) is always returned, valid or not.
 */
export declare function validate<F, B>(def: ContractDef<F, B>, input: string | DocTree, ctx: ValidateCtx): ValidationResult<F, B>;
/**
 * The "give me the data or fail" door — returns the typed model, or throws
 * {@link ContractError} carrying the error-level findings (D-0001 F1). Runs `validate`,
 * then either returns `doc` (no error-level finding) or throws with the error findings.
 */
export declare function read<F, B>(def: ContractDef<F, B>, source: string, ctx: ValidateCtx): Doc<F, B>;
//# sourceMappingURL=validate.d.ts.map