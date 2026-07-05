/**
 * The CLI output formatters — `human`, `json`, `sarif`. Each takes the aggregated
 * `Finding[]` from the runner and returns a string the CLI writes to stdout. Pure:
 * no IO, no `process`. The CLI (`./index.ts`) owns the streams and the exit.
 *
 * - `human`  — a readable per-file report plus a summary count.
 * - `json`   — the findings array as-is (machine-parseable, stable shape).
 * - `sarif`  — a valid SARIF 2.1.0 log for code-scanning surfaces (GitHub, etc.).
 *
 * Plus `formatRunSummary` — the additive, human-only run summary the `validate` path
 * prepends to the findings report (total files scanned/matched/unmatched, and a
 * per-contract breakdown when named rules exist). Also pure.
 *
 * Imports flow one way: cli → runner/core (types only). The only runner dependency is
 * the `RunStats` shape `formatRunSummary` renders.
 */
import type { Finding } from "../core/index.js";
import type { RunStats } from "../runner/index.js";
/**
 * The human report: one `"<path>:<line> <level> <id> — <message>"` line per finding,
 * grouped by file (files in first-seen order) with each file's findings in the order
 * the runner already sorted them. A finding with no `pos` prints without a `:line`.
 * A trailing summary line counts findings by level. An empty corpus reports "No findings."
 */
export declare function formatHuman(findings: Finding[]): string;
/**
 * The human run summary — additive evidence that the run happened and how it routed,
 * prepended to the findings report on the `validate` path (so it shows even on a clean,
 * `No findings.` run). Pure: no IO, no `process`.
 *
 * `labels[i]` is the contract name for `stats.matchedByRule[i]` (parallel to `config.rules`),
 * or `undefined` for an unnamed rule (an inline `--contract` run). The total line always prints:
 *
 *   Scanned 12 files; 12 matched, 0 unmatched
 *
 * When ANY rule is named (the `--config` form), the total line gains an `across K contracts`
 * clause (K = number of named rules) and one indented `  <name>: <count>` row per named rule,
 * in rule order — including a named rule that matched 0 (evidence it routed nothing):
 *
 *   Scanned 39 files; 38 matched across 6 contracts, 1 unmatched
 *     capability: 8
 *     …
 */
export declare function formatRunSummary(stats: RunStats, labels: Array<string | undefined>): string;
/**
 * The JSON report: the findings array serialized with two-space indent. The shape is
 * exactly the `Finding[]` the runner returns, so it round-trips through `JSON.parse`.
 */
export declare function formatJson(findings: Finding[]): string;
/**
 * The SARIF 2.1.0 report. A single run whose `tool.driver` is `markdown-contract`;
 * `driver.rules` lists every distinct finding id seen (deduped), and each finding
 * becomes one `result` with its `ruleId`, mapped `level`, `message.text`, and a
 * `physicalLocation` pointing at the file (and `region.startLine` when the finding
 * has a `pos`; the region is omitted for whole-document findings). The whole object
 * round-trips through `JSON.parse` / `JSON.stringify`.
 */
export declare function formatSarif(findings: Finding[]): string;
//# sourceMappingURL=format.d.ts.map