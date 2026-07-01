/**
 * The finding model — the `Finding` factory and the `ContractError` class.
 *
 * `ContractError` is the strict door's failure mode: `Contract.read()` throws it,
 * carrying the error-level findings as data (C-0001 / `D·finding-model`). The
 * `notImplemented()` helper is the single source for every stub's throw, so AC-6
 * ("calling any unimplemented op throws a clear `not implemented` error") is
 * satisfied uniformly across the skeleton.
 *
 * Logic-free beyond these constructs: the one-pass finding assembly lands in
 * `validate.ts` (T-3NC8).
 */
import type { Finding, FindingLevel, SourcePos } from "./types.js";

/**
 * The error the strict `read()` door throws when an error-level finding is present.
 * Carries every error-level finding as data, so a `catch` can inspect them.
 */
export class ContractError extends Error {
  readonly findings: Finding[];

  constructor(findings: Finding[], message?: string) {
    super(message ?? `contract validation failed with ${findings.length} finding(s)`);
    this.name = "ContractError";
    this.findings = findings;
  }
}

/**
 * The single stub-throw used by every unimplemented operation in the skeleton.
 * Every public op routes its body through this so AC-6 holds uniformly.
 */
export function notImplemented(op: string): Error {
  return new Error(`${op}: not implemented`);
}

/**
 * The bare `Finding` factory — fills the shared shape from a partial, with no registry.
 * `level` defaults to `"error"` and `path` to `""`; `pos`/`fix` ride only when supplied.
 *
 * The rule-author door is `makeCtx(path, registry).finding(...)` (registry.ts), which owns
 * the id → default-level lookup and stamps the document `path` (D-0001 A4). This standalone
 * helper exists for engine-internal callers that already hold a fully-resolved shape; the
 * one-pass assembly (merge + deterministic sort) lives in `validate.ts` (T-3NC8).
 */
export function finding(f: {
  id: string;
  message: string;
  level?: FindingLevel;
  path?: string;
  pos?: SourcePos;
  fix?: Finding["fix"];
}): Finding {
  const out: Finding = {
    id: f.id,
    level: f.level ?? "error",
    path: f.path ?? "",
    message: f.message,
  };
  if (f.pos !== undefined) out.pos = f.pos;
  if (f.fix !== undefined) out.fix = f.fix;
  return out;
}
