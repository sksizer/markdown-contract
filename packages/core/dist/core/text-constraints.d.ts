import type { TextMatchSpec } from "./text-match.js";
import type { DocRule, Rule } from "./types.js";
/**
 * One required / forbidden text-match entry — the closed match-spec vocabulary (D-0011 § The
 * match spec). This is the matcher's `TextMatchSpec` re-exported verbatim, so the authoring
 * surface and the matcher core never diverge: exactly one of `pattern` (a literal substring) or
 * `regex` (a regex source) supplies the needle; `normalize` / `ignoreCase` tune matching;
 * `min` / `max` bound the count; `id` pins identity; `note` / `level` shape the finding.
 */
export type { TextMatchSpec } from "./text-match.js";
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
 * Each entry emits its own `text/requires` finding at the section heading when its phrase is
 * absent (or `text/count` when a `min` / `max` bound is violated). Rejects an absence-form
 * entry (`max: 0` / `max < min`) at construction (use {@link forbids}).
 */
export declare function requires(specs: TextMatchSpec[]): Rule;
/**
 * Forbid each listed phrase from appearing in the bound section's subtree text — a node-local
 * `Rule` for a section's `rules: [...]` slot (the section-scoped form of D-0011's `forbids:`).
 * Each entry emits a `text/forbids` finding at the offending line for every hit (or `text/count`
 * at the heading when a positive `max` cap is exceeded). `forbids` is the absence form, so there
 * is no purity restriction.
 */
export declare function forbids(specs: TextMatchSpec[]): Rule;
/**
 * Attach required / forbidden phrase checks to the WHOLE document — a cross-plane `DocRule` for
 * a contract's `rules: [...]` slot (the body-root form of D-0011's `requires:` / `forbids:`).
 * Each `requires` entry emits a document-level `text/requires` (no position) when its phrase is
 * absent; each `forbids` entry emits a `text/forbids` at the offending line for every hit. The
 * `requires` arm enforces the same absence-form purity as {@link requires}.
 */
export declare function textRule(spec: TextRuleSpec): DocRule;
//# sourceMappingURL=text-constraints.d.ts.map