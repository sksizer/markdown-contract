/**
 * Fixture builders for the mock-data layer.
 *
 * Small, composable factories that produce engine-shaped values (see ./types).
 * Stories and the app shell build their fixtures from these so every fixture is
 * internally consistent (e.g. `filesUnmatched === filesScanned - filesMatched`,
 * `exitCode` reflects whether any error-level finding is present).
 */
import type { Finding, FindingLevel, RunResult, RunStats, VaultSummary } from "./types";

let _seq = 0;

/** Build a Finding, defaulting the noisy fields so callers state only what matters. */
export function makeFinding(partial: Partial<Finding> & Pick<Finding, "id" | "level">): Finding {
  _seq += 1;
  return {
    path: "docs/guide.md",
    message: `mock finding ${_seq}`,
    ...partial,
  };
}

/** Build RunStats, deriving `filesUnmatched` so the counts always add up. */
export function makeStats(
  partial: Partial<RunStats> & Pick<RunStats, "filesScanned" | "filesMatched">,
): RunStats {
  const matchedByRule = partial.matchedByRule ?? [partial.filesMatched];
  return {
    filesScanned: partial.filesScanned,
    filesMatched: partial.filesMatched,
    filesUnmatched: partial.filesUnmatched ?? partial.filesScanned - partial.filesMatched,
    matchedByRule,
  };
}

/** Derive the CI exit code the way the engine does: 1 iff any error-level finding. */
export function exitCodeFor(findings: Finding[]): number {
  return findings.some((f) => f.level === "error") ? 1 : 0;
}

/** Assemble a RunResult, deriving `exitCode` from the findings unless overridden. */
export function makeResult(
  findings: Finding[],
  stats: RunStats,
  exitCode = exitCodeFor(findings),
): RunResult {
  return { findings, exitCode, stats };
}

/** Tally findings by level — handy for cards and summaries. */
export function countByLevel(findings: Finding[]): Record<FindingLevel, number> {
  const counts: Record<FindingLevel, number> = { error: 0, warn: 0, report: 0 };
  for (const f of findings) counts[f.level] += 1;
  return counts;
}

/** Assemble a VaultSummary from its parts. */
export function makeVault(
  id: string,
  name: string,
  path: string,
  result: RunResult,
): VaultSummary {
  return { id, name, path, result };
}
