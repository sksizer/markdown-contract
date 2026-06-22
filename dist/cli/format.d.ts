/**
 * The CLI output formatters — `human`, `json`, `sarif`. Each takes the aggregated
 * `Finding[]` from the runner and returns a string the CLI writes to stdout. Pure:
 * no IO, no `process`. The CLI (`./index.ts`) owns the streams and the exit.
 *
 * - `human`  — a readable per-file report plus a summary count.
 * - `json`   — the findings array as-is (machine-parseable, stable shape).
 * - `sarif`  — a valid SARIF 2.1.0 log for code-scanning surfaces (GitHub, etc.).
 *
 * Imports flow one way: cli → core (types only). Nothing here imports the runner.
 */
import type { Finding } from "../core/index.js";
/**
 * The human report: one `"<path>:<line> <level> <id> — <message>"` line per finding,
 * grouped by file (files in first-seen order) with each file's findings in the order
 * the runner already sorted them. A finding with no `pos` prints without a `:line`.
 * A trailing summary line counts findings by level. An empty corpus reports "No findings."
 */
export declare function formatHuman(findings: Finding[]): string;
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