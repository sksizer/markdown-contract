/**
 * The `Contract.validate` / `read` entry points — the one-pass merge over the two
 * planes plus the named-rule registry (C-0005), producing the merged, deterministically
 * sorted `Finding[]` (C-0001). `grammar.ts`'s `contract()` wires its `validate` / `read`
 * methods straight to these functions, so the `Contract` shape is real but hollow.
 *
 * The one-pass assembly lands in T-3NC8; these are the typed entry stubs.
 */
import { notImplemented } from "./finding.js";
import type {
  Contract,
  Doc,
  DocTree,
  ValidateCtx,
  ValidationResult,
} from "./types.js";

/**
 * The "show me everything" door — never throws; findings as data. Stub.
 * Accepts a `source: string` (parsed with the bundled projection) or a pre-parsed
 * `DocTree` (parse once, validate several contracts).
 */
export function validate<F, B>(
  _contract: Contract<F, B>,
  _input: string | DocTree,
  _ctx: ValidateCtx,
): ValidationResult<F, B> {
  throw notImplemented("validate");
}

/**
 * The "give me the data or fail" door — returns the typed model, or throws
 * {@link ContractError} on an error-level finding. Stub.
 */
export function read<F, B>(
  _contract: Contract<F, B>,
  _source: string,
  _ctx: ValidateCtx,
): Doc<F, B> {
  throw notImplemented("read");
}
