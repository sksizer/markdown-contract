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
import type { DocRule, Rule } from "./types.js";
import type { TextMatchSpec } from "./text-match.js";

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
