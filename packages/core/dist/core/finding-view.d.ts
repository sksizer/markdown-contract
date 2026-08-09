/**
 * Finding formatting + filtering — presentation and selection helpers over `Finding[]`.
 * A `Finding` carries its own `id`, `level`, `path`, optional `pos`, and `message`; how a
 * consumer renders a location, formats a line, filters by area/id, or summarizes levels is
 * caller-side glue this module absorbs. Pure functions — nothing here mutates a finding.
 */
import type { Finding } from "./types.js";
/**
 * The location token for a finding:
 *   - `<path>:<line>` when `opts.withPath` and the finding has a `path` (just `<path>` if it has
 *     no `pos`);
 *   - else `line <n>` when the finding is position-pinned;
 *   - else `opts.root` (default `"<root>"`) — the whole-document fallback.
 *
 * Composable to reproduce both `validate.ts`'s parenthesized `(line N)` (wrap the result) and
 * `entity.ts`'s `line N` / `<root>` (default options).
 */
export declare function findingLocation(f: Finding, opts?: {
    root?: string;
    withPath?: boolean;
}): string;
/**
 * A full one-line rendering of a finding.
 *   - `"full"` (default): `[<id>] (<location>): <message>` — always carries a location token
 *     (`findingLocation`, so `<root>` when unpinned).
 *   - `"line"`: `[<id>] (line <n>): <message>`, with the ` (line <n>)` omitted when the finding
 *     has no `pos`. Reproduces `validate.ts`'s per-error detail line exactly once a caller adds
 *     its two-space indent: `"  " + formatFinding(f, { style: "line" })`.
 */
export declare function formatFinding(f: Finding, opts?: {
    style?: "line" | "full";
}): string;
/**
 * Select findings by `area` and/or explicit `ids`. `area` keeps findings whose id is in that area
 * (`id === area` or `id.startsWith(area + "/")`) — so `{ area: "frontmatter" }` keeps every
 * `frontmatter/*` finding. `ids` keeps findings whose id is a member of the set. When both are
 * given, both must hold (intersection).
 */
export declare function filterFindings(findings: Finding[], sel: {
    area?: string;
    ids?: Iterable<string>;
}): Finding[];
/** True iff any finding is error-level — the strict-door / exit-nonzero gate. */
export declare function hasErrors(findings: Finding[]): boolean;
/** Count findings by level. */
export declare function countByLevel(findings: Finding[]): {
    error: number;
    warn: number;
    report: number;
};
//# sourceMappingURL=finding-view.d.ts.map