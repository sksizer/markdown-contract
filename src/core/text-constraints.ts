/**
 * Declarative text-constraint builders — `requires` / `forbids` (section-scoped) and
 * `textRule` (document-scoped). They attach required / forbidden phrase checks to a contract,
 * compiling to the engine's existing node-local `rule` / cross-plane `docRule` machinery
 * (D-0011 / C-0009): "does this literal-or-regex appear (or not) in this scope, the right
 * number of times?". This is the TS-API surface the declarative `requires:` / `forbids:` YAML
 * keys compile to, so both authoring surfaces share one implementation and one set of findings.
 *
 * STUB (T-TXSC). This file lands the public *signatures* only, so the gated text-constraint
 * fixtures (`tests/fixtures/validation/text/*`, `component: "text-api"`) type-check before the
 * matcher exists. Every builder returns a well-formed `Rule` / `DocRule` whose `run` emits NO
 * findings (an empty array). The real text matcher lands in T-TXMC and the real builders over
 * it (scope-text resolution, `text/*` finding synthesis, per-entry id, `requires`/`forbids`
 * purity enforcement) land in T-TXAP, which flips `IMPLEMENTED["text-api"]` to `true`.
 */
import type { DocRule, FindingLevel, Rule } from "./types.js";

/**
 * One required / forbidden text-match entry — a closed match-spec vocabulary (D-0011 § The
 * match spec). Exactly one of `pattern` (a literal substring) or `regex` (a regular-expression
 * source) is supplied; the remaining keys tune matching and the emitted finding.
 */
export interface TextMatchSpec {
  /** the literal substring to find (one of `pattern` / `regex`). */
  pattern?: string;
  /** a regular-expression source to find (alternative to `pattern`). */
  regex?: string;
  /** collapse whitespace runs before matching, so prose line-wrapping is tolerated. Default `true`. */
  normalize?: boolean;
  /** case-insensitive match. Default `false`. */
  ignoreCase?: boolean;
  /** minimum occurrences (`requires` only; must be ≥ 1). Default `1`. */
  min?: number;
  /** maximum occurrences; must be ≥ `min` (a `requires` entry may not set `max: 0` — use `forbids`). */
  max?: number;
  /** explicit stable finding id; pins identity across pattern edits. Synthesized from scope + pattern when omitted. */
  id?: string;
  /** author rationale, appended to the finding message. */
  note?: string;
  /** finding severity. Default `error`. */
  level?: Extract<FindingLevel, "error" | "warn">;
}

/**
 * The document-scoped options for `textRule(...)` — `requires` / `forbids` lists, each a set of
 * independent whole-document checks (the body-root form of D-0011's `requires:` / `forbids:`).
 */
export interface TextRuleSpec {
  requires?: TextMatchSpec[];
  forbids?: TextMatchSpec[];
}

/**
 * Require each listed phrase to be PRESENT in the bound section's subtree text — a node-local
 * `Rule` for a section's `rules: [...]` slot (the section-scoped form of D-0011's `requires:`).
 * Each spec emits its own `text/requires` finding at the section heading when its phrase is
 * absent. STUB (T-TXSC): returns a `Rule` that emits no findings; the matcher lands in T-TXAP.
 */
export function requires(specs: TextMatchSpec[]): Rule {
  void specs;
  return { __brand: "Rule", id: "text/requires", run: () => [] };
}

/**
 * Forbid each listed phrase from appearing in the bound section's subtree text — a node-local
 * `Rule` for a section's `rules: [...]` slot (the section-scoped form of D-0011's `forbids:`).
 * Each spec emits its own `text/forbids` finding at the offending line when its phrase appears.
 * STUB (T-TXSC): returns a `Rule` that emits no findings; the matcher lands in T-TXAP.
 */
export function forbids(specs: TextMatchSpec[]): Rule {
  void specs;
  return { __brand: "Rule", id: "text/forbids", run: () => [] };
}

/**
 * Attach required / forbidden phrase checks to the WHOLE document — a cross-plane `DocRule` for
 * a contract's `rules: [...]` slot (the body-root form of D-0011's `requires:` / `forbids:`).
 * Each spec emits its own `text/*` finding over the whole-document text. STUB (T-TXSC): returns
 * a `DocRule` that emits no findings; the matcher lands in T-TXAP.
 */
export function textRule(spec: TextRuleSpec): DocRule {
  void spec;
  return { __brand: "DocRule", id: "text/doc", run: () => [] };
}
