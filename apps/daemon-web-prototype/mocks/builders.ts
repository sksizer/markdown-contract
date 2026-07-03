/**
 * Fixture builders for the mock-data layer.
 *
 * Small, composable factories that produce engine-shaped values (see ./types).
 * Stories and the app shell build their fixtures from these so every fixture is
 * internally consistent (e.g. `filesUnmatched === filesScanned - filesMatched`,
 * `exitCode` reflects whether any error-level finding is present).
 */
import type {
  Finding,
  FindingLevel,
  RunResult,
  RunStats,
  VaultStatus,
  VaultStatusState,
  VaultSummary,
} from "./types";

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

/** A fixed ISO timestamp so VaultStatus fixtures stay deterministic across runs. */
const DEFAULT_UPDATED_AT = "2026-06-30T12:00:00.000Z";

/** Derive the coarse state from the parts present, the way the daemon would. */
function deriveState(partial: Partial<VaultStatus>): VaultStatusState {
  if (partial.error) return "error";
  if (partial.drift?.drifted) return "drift";
  if (partial.result) {
    return partial.result.exitCode !== 0 || partial.result.findings.length > 0
      ? "findings"
      : "green";
  }
  return "running";
}

/**
 * Assemble a `VaultStatus` (the status-bearing registry entry the API returns),
 * defaulting the noisy fields so a caller states only what matters:
 *  - `configPath` defaults to `<path>/markdown-contract.yaml`,
 *  - `updatedAt` defaults to a fixed ISO string (deterministic fixtures),
 *  - `state` is derived from whichever of `error` / `drift` / `result` is present.
 * The optional `result` / `drift` / `error` are only included when supplied, so
 * the result matches the per-state presence rules documented on `VaultStatus`.
 */
export function makeVaultStatus(
  partial: Partial<VaultStatus> & Pick<VaultStatus, "id" | "name" | "path">,
): VaultStatus {
  return {
    id: partial.id,
    name: partial.name,
    path: partial.path,
    configPath: partial.configPath ?? `${partial.path}/markdown-contract.yaml`,
    state: partial.state ?? deriveState(partial),
    updatedAt: partial.updatedAt ?? DEFAULT_UPDATED_AT,
    ...(partial.result !== undefined ? { result: partial.result } : {}),
    ...(partial.drift !== undefined ? { drift: partial.drift } : {}),
    ...(partial.error !== undefined ? { error: partial.error } : {}),
  };
}
