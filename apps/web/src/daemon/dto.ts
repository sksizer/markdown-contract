/**
 * DTO mappers — the pure translation between the daemon's domain (the registry
 * entry + the engine's `runCorpus` output) and the ONTOGEN wire shapes
 * (`types/ontogen.ts`) the shared dashboard's HTTP transport expects.
 *
 * Kept pure and side-effect-free so it reads as documentation of the mapping and
 * has an obvious peer test: given a registry entry / a finding, you get exactly
 * this DTO. Id minting and timestamps live in the stores (`./scans.ts`), not
 * here — a mapper never invents identity.
 */
import type { Finding, VaultRegistryEntry } from "../../types/api";
import type { FindingRecord, ScanRun, Vault } from "../../types/ontogen";

/** Map a durable registry entry onto the flat ontogen `Vault` the transport lists. */
export function vaultToDto(entry: VaultRegistryEntry): Vault {
  return {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    config_path: entry.configPath,
    watch_enabled: entry.watch ?? true,
    schedule: entry.schedule ?? null,
    created_at: entry.createdAt ?? "",
    updated_at: entry.updatedAt ?? entry.createdAt ?? "",
  };
}

/** Per-level tallies over a run's findings — the counts a `ScanRun` carries. */
export function countByLevel(findings: Finding[]): {
  error_count: number;
  warn_count: number;
  report_count: number;
} {
  let error_count = 0;
  let warn_count = 0;
  let report_count = 0;
  for (const f of findings) {
    if (f.level === "error") error_count += 1;
    else if (f.level === "warn") warn_count += 1;
    else if (f.level === "report") report_count += 1;
  }
  return { error_count, warn_count, report_count };
}

/**
 * Flatten one engine `Finding` into an ontogen `FindingRecord` bound to a scan
 * run. The record id is derived from the run id + the finding's index so a run's
 * records are stable and collision-free (`<scanRunId>-<index>`).
 */
export function findingToRecord(finding: Finding, scanRunId: string, index: number): FindingRecord {
  return {
    id: `${scanRunId}-${index}`,
    scan_run_id: scanRunId,
    finding_id: finding.id,
    level: finding.level,
    file_path: finding.path,
    line: finding.pos?.line ?? null,
    col: finding.pos?.col ?? null,
    message: finding.message,
  };
}

/** What {@link buildScanRun} needs — a completed run's ingredients, or a failed run's error. */
export interface ScanRunInput {
  id: string;
  vaultId: string;
  startedAt: string;
  finishedAt: string;
  trigger: string;
  /** the run's findings (empty on a run that threw before producing any) */
  findings: Finding[];
  /** set when the run itself failed (e.g. no config) — makes the run an "error" */
  errorMessage?: string | null;
}

/**
 * Assemble a `ScanRun` from a finished (or failed) run. `status` folds the
 * outcome to a word: `error` when the run threw, else `failed` when any
 * error-level finding exists, else `passed`. Counts come from the findings.
 */
export function buildScanRun(input: ScanRunInput): ScanRun {
  const counts = countByLevel(input.findings);
  const errored = input.errorMessage != null;
  const status = errored ? "error" : counts.error_count > 0 ? "failed" : "passed";
  return {
    id: input.id,
    vault_id: input.vaultId,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    trigger: input.trigger,
    status,
    ...counts,
    error_message: input.errorMessage ?? null,
  };
}
