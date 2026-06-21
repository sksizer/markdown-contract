/**
 * The contract combinators — `contract()` plus the body-grammar vocabulary
 * (`sections` / `section` / `optional` / `oneOf` / `gap`) and the named-rule
 * factories (`rule` / `docRule`). These declare a contract's two planes (C-0005);
 * the matching engine that consumes them lands across T-8RJ5 / T-5LW7 / T-3NC8.
 *
 * `contract()` returns a real-but-hollow `Contract`: its shape is honest, but its
 * `validate` / `read` methods delegate to the (stubbed) entry points in
 * `validate.ts`, so constructing a contract is safe while calling any op throws
 * `not implemented` (AC-6). The other combinators throw at call.
 */
import { notImplemented } from "./finding.js";
import { read as readEntry, validate as validateEntry } from "./validate.js";
import type {
  Contract,
  ContractDef,
  Ctx,
  Doc,
  DocRule,
  DocTree,
  Finding,
  LevelOpts,
  Rule,
  SectionNode,
  SectionOpts,
  SectionSeq,
  Spec,
  ValidateCtx,
} from "./types.js";

/**
 * Compile a `ContractDef` (frontmatter Zod schema, body grammar, cross-plane rules)
 * into a `Contract` — two doors onto one engine. The returned object is real but
 * hollow: its methods delegate to the stubbed engine entry points, so calling any
 * door throws `not implemented` rather than the factory throwing at construction.
 */
export function contract<F, B>(def: ContractDef<F, B>): Contract<F, B> {
  void def; // compiled into the engine call once T-3NC8 lands; the def is retained then.
  const self: Contract<F, B> = {
    validate(input: string | DocTree, ctx: ValidateCtx) {
      return validateEntry<F, B>(self, input, ctx);
    },
    read(source: string, ctx: ValidateCtx): Doc<F, B> {
      return readEntry<F, B>(self, source, ctx);
    },
  };
  return self;
}

/**
 * Bundle an ordered `Spec[]` (with level options) into a body grammar carrying the
 * inferred body type `B`. Stub — the structure plane lands in T-8RJ5.
 */
export function sections<B>(_opts: LevelOpts, _specs: Spec[]): SectionSeq<B> {
  throw notImplemented("sections");
}

/** Declare a required section by name, or by an alias set. Stub. */
export function section(_name: string | string[], _opts?: SectionOpts): Spec {
  throw notImplemented("section");
}

/** Mark a `Spec` optional. Stub. */
export function optional(_spec: Spec): Spec {
  throw notImplemented("optional");
}

/** Declare a choice over alias names at one position. Stub. */
export function oneOf(_names: string[], _opts?: SectionOpts): Spec {
  throw notImplemented("oneOf");
}

/** Permit a window of unknown sections at this position. Stub. */
export function gap(_opts?: { min?: number; max?: number }): Spec {
  throw notImplemented("gap");
}

/** Register a per-node named rule. Stub — the rule registry lands in T-3NC8. */
export function rule(
  _id: string,
  _fn: (node: SectionNode, ctx: Ctx) => Finding[],
): Rule {
  throw notImplemented("rule");
}

/** Register a cross-plane / cross-file named rule over the whole typed doc. Stub. */
export function docRule<F>(
  _id: string,
  _fn: (doc: Doc<F>, ctx: Ctx) => Finding[],
): DocRule {
  throw notImplemented("docRule");
}
