/**
 * Out-of-model (OOM) — builds the typed, navigable `Doc` from a projected tree
 * and a compiled contract. `read()` and `validate().doc` hand this model back
 * (C-0002 / D-0005). The views, dual-key access, and `byAnchor` resolution land
 * in T-6PV4; this is the typed entry stub the engine builds against.
 */
import { notImplemented } from "./finding.js";
import type { Contract, Doc, DocTree, ValidateCtx } from "./types.js";

/**
 * Build the typed model for a validated document. Stub — the OOM (views,
 * dual-key section access, `byAnchor`) lands in T-6PV4.
 */
export function buildModel<F, B>(
  _tree: DocTree,
  _contract: Contract<F, B>,
  _ctx: ValidateCtx,
): Doc<F, B> {
  throw notImplemented("buildModel");
}
