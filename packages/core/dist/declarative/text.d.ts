/**
 * The declarative text-constraint compiler — the closed `requires:` / `forbids:` match-spec
 * vocabulary of a `*.contract.yaml`, compiled onto the TS text-predicate builders
 * (`requires` / `forbids` / `textRule` in `../core/text-constraints.ts`) (D-0011 / C-0009). It is
 * the data-authoring twin of `schema.ts`: a finite vocabulary in, the engine's builders out, with
 * the authoring mistakes rejected at compile time rather than surfacing as confusing findings.
 *
 * A `requires:` / `forbids:` value is a LIST of match-spec entries. Each entry is checked against
 * the finite vocabulary — exactly one needle (`pattern` literal | `regex` source), the
 * `normalize` / `ignoreCase` matcher tuning, the `min` / `max` count bound, and the
 * `id` / `note` / `level` finding shapers — so an unknown key, a missing or doubled needle, or a
 * wrong-typed value is a `DeclarativeError`. Two further compile-time consistency checks mirror
 * D-0011:
 *
 *   - a DUPLICATE — two entries in one list with the same matcher identity (needle + `normalize`
 *     + `ignoreCase`) — is rejected: they would synthesize one finding id. Byte-identical `regex`
 *     sources count as duplicates.
 *   - a CONTRADICTION — a `requires` and a `forbids` entry over the same literal `pattern` at the
 *     same scope, or a single entry whose `max` falls below its effective minimum — is rejected.
 *     Detection is literal-only: no cross-`regex` overlap is analyzed.
 *
 * A section node's keys compile to node-local `Rule`s (`requires(...)` then `forbids(...)`, the
 * order a TS author writes them); the body root's keys compile to one cross-plane `textRule(...)`
 * `DocRule`. Either surface emits findings identical to the equivalent TS builder — same
 * synthesized ids, levels, positions, messages.
 */
import type { DocRule, Rule } from "../core/types.js";
/** Does this node carry either text-constraint key? */
export declare function hasTextKeys(node: Record<string, unknown>): boolean;
/**
 * The node-local rules for a section node's `requires` / `forbids` — `requires(...)` then
 * `forbids(...)`, matching the order a TS author writes `rules: [requires(...), forbids(...)]`
 * (AC-1, section scope). Empty when the node carries neither key (or only empty lists).
 */
export declare function compileSectionTextRules(node: Record<string, unknown>, path: string, scopeLabel: string): Rule[];
/**
 * The single cross-plane `DocRule` for the body root's `requires` / `forbids` — one
 * `textRule({ requires, forbids })`, the document-scoped form (AC-1, body root). `undefined` when
 * neither key is present, so the caller attaches nothing.
 */
export declare function compileBodyTextRule(node: Record<string, unknown>, path?: string): DocRule | undefined;
//# sourceMappingURL=text.d.ts.map