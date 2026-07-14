/**
 * The text-match predicate core and the `text/*` finding area (D-0011).
 *
 * This is the runtime foundation every declarative text constraint emits through. It has
 * three responsibilities, all facets of one feature — matching a literal/regex over a bound
 * scope's rendered text and turning the result into findings:
 *
 *   1. {@link matchText} — a pure matcher: `(text, spec) → { count, positions }`. It matches a
 *      literal `pattern` or a `regex`, counts every occurrence, and pins each hit's source
 *      position (1-based line / col within `text`). `normalize` (default true) lets a phrase
 *      split across a wrapped line still match; `normalize: false` is exact bytes; `ignoreCase`
 *      folds case. It matches the raw text INCLUDING inline code spans and fenced blocks — text
 *      constraints deliberately do not skip code (D-0011 § Match scope).
 *   2. {@link buildTextFindings} — maps a match result + the entry's `min` / `max` bound to
 *      `text/requires` (a miss, positioned at the scope's heading / document level),
 *      `text/forbids` (a hit, positioned at the offending line), and `text/count`
 *      (`found N times, expected …`) findings — each with the spec's `note` appended.
 *   3. {@link synthesizeTextId} — the stable per-entry id: `text/<kind>/<scopeKey>/<patternHash>`,
 *      a short hash of the normalized pattern (NOT index-based, so it survives entry reordering);
 *      returns the entry's explicit `id` when set.
 *
 * This module is the matcher + finding plumbing only. The combinator builders
 * (`requires` / `forbids` / `textRule`), scope binding, and the YAML surface are downstream
 * (T-TXAP / T-TXYL) — nothing here knows about a `DocTree`, a section, or YAML.
 */
import type { Ctx, Finding, FindingLevel, SourcePos } from "./types.js";
/**
 * One match spec — the closed text-match vocabulary (D-0011 § The match spec). Exactly one of
 * `pattern` (a literal substring) or `regex` (a regular-expression source) supplies the needle.
 * `min` / `max` are the count bound the finding-builder reads (`requires` defaults `min: 1`,
 * unbounded `max`; `forbids` defaults `max: 0`). `id` pins the finding identity across pattern
 * edits; `note` is appended to the message; `level` overrides the registry default.
 */
export interface TextMatchSpec {
    /** the literal substring to find (one of `pattern` / `regex` is required) */
    pattern?: string;
    /** a regular-expression source to find (alternative to `pattern`) */
    regex?: string;
    /** collapse runs of whitespace before matching, so prose line-wrapping is tolerated (default true) */
    normalize?: boolean;
    /** case-insensitive match (default false) */
    ignoreCase?: boolean;
    /** minimum occurrences */
    min?: number;
    /** maximum occurrences */
    max?: number;
    /** an explicit, author-supplied finding id — pins identity across pattern edits */
    id?: string;
    /** author rationale, appended to the finding message */
    note?: string;
    /** finding severity — overrides the registry default (D-0011: `error` | `warn`) */
    level?: Extract<FindingLevel, "error" | "warn">;
}
/** The result of {@link matchText} — the occurrence count and each hit's source position. */
export interface TextMatchResult {
    count: number;
    /** one entry per hit, in document order; each is the 1-based line / col of the match start */
    positions: SourcePos[];
}
/** The entry kind a text constraint is authored as — presence (`requires`) or absence (`forbids`). */
export type TextKind = "requires" | "forbids";
/**
 * The finding-id discriminator. `requires` / `forbids` are the pure presence / absence findings;
 * `count` is a `min` / `max` bound violation (a shortfall or an overflow).
 */
export type TextFindingKind = "requires" | "forbids" | "count";
/**
 * Match a spec against `text`, returning the occurrence count and each hit's source position.
 * A literal `pattern` is matched with `normalize` (default true → whitespace-run flexible) or
 * exactly (`normalize: false`); a `regex` is matched as given. `ignoreCase` folds case in both.
 * Matching is over the raw text including code spans and fenced blocks (D-0011). Throws when
 * the spec supplies neither `pattern` nor `regex`.
 */
export declare function matchText(text: string, spec: TextMatchSpec): TextMatchResult;
/**
 * The stable finding id for one text-constraint entry: `text/<kind>/<scopeKey>/<patternHash>`,
 * where `patternHash` is a short hash of the spec's normalized pattern. It is stable across entry
 * REORDERING (not index-based) and unique across scopes; it changes only when the section is
 * renamed (`scopeKey`) or the pattern is edited. An entry that sets an explicit `id` gets exactly
 * that id back (pinning identity across pattern edits).
 */
export declare function synthesizeTextId(kind: TextFindingKind, scopeKey: string, spec: TextMatchSpec): string;
/** The inputs to {@link buildTextFindings} — one entry's match result plus its scope. */
export interface TextFindingInput {
    /** the entry kind — presence (`requires`) or absence (`forbids`) */
    kind: TextKind;
    /** the spec the entry matched */
    spec: TextMatchSpec;
    /** the result of {@link matchText} for this entry over the bound scope's text */
    match: TextMatchResult;
    /** the scope's stable key, for id synthesis (`doc` for the whole document) */
    scopeKey: string;
    /** a human label for the scope in messages; defaults from `scopeKey` (`doc` → `document`) */
    scope?: string;
    /** the scope's heading position — a `requires` miss / `count` violation pins here; omit ⇒ document-level */
    scopePos?: SourcePos;
    /** the registry-backed finding factory (stamps `path`, fills the default `level`) */
    ctx: Ctx;
}
/**
 * Turn one entry's match result into its findings (D-0011 § Findings and positions):
 *
 *   - `requires` with no hit (`min: 1`) → one `text/requires` "required phrase … not found in …",
 *     positioned at `scopePos` (the section heading) or document-level when `scopePos` is omitted.
 *   - `forbids` with hits (`max: 0`) → one `text/forbids` "forbidden phrase … present" PER hit,
 *     each positioned at the offending match's line.
 *   - a `min` / `max` bound violation (a `requires` shortfall, or any `max` overflow) → one
 *     `text/count` "… found N times, expected …", positioned at `scopePos`.
 *
 * Each message gets the spec's `note` appended. `level` rides from the spec when set, else the
 * registry default (`error`) via `ctx.finding`. A satisfied entry yields no findings.
 */
export declare function buildTextFindings(input: TextFindingInput): Finding[];
//# sourceMappingURL=text-match.d.ts.map