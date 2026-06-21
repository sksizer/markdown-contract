/**
 * The `Contract.validate` / `read` entry points — the one-pass over the planes that
 * produces the merged, deterministically sorted `Finding[]` (C-0001 / C-0005).
 * `grammar.ts`'s `contract()` wires its `validate` / `read` methods straight to these,
 * passing the retained `ContractDef`.
 *
 * As of T-5LW7 `validate()` runs the STRUCTURE and CONTENT planes: it parses (or accepts a
 * pre-parsed `DocTree`), runs `matchStructure` then `matchContent` (frontmatter Zod + the
 * section content leaves), merges and sorts the findings deterministically, and returns
 * `{ findings, tree, doc: undefined }`. The cross-plane docRule merge and `read()` (T-3NC8)
 * land later; `doc` stays `undefined` here.
 */
import { matchContent } from "./content.js";
import { notImplemented } from "./finding.js";
import { parse } from "./projection.js";
import { makeCtx, defaultRegistry } from "./registry.js";
import { matchStructure } from "./structure.js";
import type {
  ContractDef,
  Doc,
  DocTree,
  Finding,
  ValidateCtx,
  ValidationResult,
} from "./types.js";

/** A `DocTree` is the pre-parsed input shape; a string is parsed with the bundled projection. */
function asTree(input: string | DocTree): DocTree {
  return typeof input === "string" ? parse(input) : input;
}

/**
 * Deterministic finding order (D-0001 E3), applied early so structure goldens pin now:
 * ascending `pos.line` (no-`pos` / document-level findings first, as line 0); ties on a
 * line break by `pos.col`, then by stable emission order. The full cross-plane plane
 * ordering is finalized in T-3NC8; here every finding is structure-plane, so emission order
 * resolves intra-line ties.
 */
function sortFindings(findings: Finding[]): Finding[] {
  return findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const la = a.f.pos?.line ?? 0;
      const lb = b.f.pos?.line ?? 0;
      if (la !== lb) return la - lb;
      const ca = a.f.pos?.col ?? 0;
      const cb = b.f.pos?.col ?? 0;
      if (ca !== cb) return ca - cb;
      return a.i - b.i; // stable emission order
    })
    .map((x) => x.f);
}

/**
 * The "show me everything" door — never throws; findings as data. Parses a `source: string`
 * (bundled projection) or accepts a pre-parsed `DocTree`. Runs the structure plane and
 * returns the projection always; `doc` is `undefined` until the typed model lands (T-6PV4).
 */
export function validate<F, B>(
  def: ContractDef<F, B>,
  input: string | DocTree,
  ctx: ValidateCtx,
): ValidationResult<F, B> {
  const tree = asTree(input);
  const fctx = makeCtx(ctx.path, defaultRegistry());

  const findings: Finding[] = [];
  // Structure plane first — its kind-gate gates the content leaf (a non-table never reaches
  // table-column validation), so it must run before content (D-0001).
  if (def.body) {
    findings.push(...matchStructure(tree, def.body, fctx));
  }
  // Content plane: frontmatter Zod + each section's content leaf over a present, correct-kind
  // block. Guarded inside `matchContent` so it never re-reports the structure kind-gate (AC-4).
  findings.push(...matchContent(tree, def, fctx));

  return { findings: sortFindings(findings), tree, doc: undefined };
}

/**
 * The "give me the data or fail" door — returns the typed model, or throws
 * {@link ContractError}. Still stubbed: the typed model + the error-gate land in T-3NC8 / T-6PV4.
 */
export function read<F, B>(
  _def: ContractDef<F, B>,
  _source: string,
  _ctx: ValidateCtx,
): Doc<F, B> {
  throw notImplemented("read");
}
