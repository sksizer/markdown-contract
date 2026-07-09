/**
 * Pure view-model derivation for the vault screens: latest-run resolution,
 * ScanRun status → kit StatusKey mapping, FindingRecord → kit Finding
 * conversion, per-file grouping, and vault-relative → absolute path joining
 * for "open in …". No Vue, no Nuxt — the peer test pins each contract.
 */
import type { Finding, StatusKey } from "@markdown-contract/ui";
import type { FindingRecord, ScanRun } from "../bindings/types";

/** The most recent run of `vaultId` (by started_at, run id as tiebreak), or null. */
export function latestRunFor(runs: ScanRun[], vaultId: string): ScanRun | null {
  let latest: ScanRun | null = null;
  for (const run of runs) {
    if (run.vault_id !== vaultId) continue;
    if (
      latest === null ||
      run.started_at > latest.started_at ||
      (run.started_at === latest.started_at && run.id > latest.id)
    ) {
      latest = run;
    }
  }
  return latest;
}

/** Runs of one vault, newest first — the run-history list's order. */
export function runsForVault(runs: ScanRun[], vaultId: string): ScanRun[] {
  return runs
    .filter((r) => r.vault_id === vaultId)
    .sort((a, b) =>
      a.started_at === b.started_at
        ? b.id.localeCompare(a.id)
        : b.started_at.localeCompare(a.started_at),
    );
}

/** A run's persisted status as the kit's StatusKey; null when never scanned. */
export function statusKeyFor(run: ScanRun | null): StatusKey | null {
  if (run === null) return null;
  switch (run.status) {
    case "green":
    case "findings":
    case "running":
    case "error":
      return run.status;
    default:
      return null;
  }
}

/** A persisted FindingRecord as the kit's Finding view-model. */
export function toKitFinding(record: FindingRecord): Finding {
  const level =
    record.level === "error" || record.level === "warn" || record.level === "report"
      ? record.level
      : "report";
  return {
    id: record.finding_id,
    level,
    path: record.file_path,
    pos:
      record.line !== null
        ? { line: record.line, ...(record.col !== null ? { col: record.col } : {}) }
        : undefined,
    message: record.message,
  };
}

/** One file's findings, position-ordered — a ContractGroup/FindingRow group. */
export interface FileFindings {
  file: string;
  findings: Finding[];
}

/** Group a run's finding records per file (files sorted, findings by position). */
export function groupFindingsByFile(records: FindingRecord[]): FileFindings[] {
  const byFile = new Map<string, FindingRecord[]>();
  for (const record of records) {
    const bucket = byFile.get(record.file_path);
    if (bucket) bucket.push(record);
    else byFile.set(record.file_path, [record]);
  }
  return [...byFile.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, group]) => ({
      file,
      findings: group
        .sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.col ?? 0) - (b.col ?? 0))
        .map(toKitFinding),
    }));
}

/** Absolute path of a vault-relative finding file, for `open_path`. */
export function joinVaultPath(vaultPath: string, filePath: string): string {
  if (filePath.startsWith("/")) return filePath;
  return `${vaultPath.replace(/\/+$/, "")}/${filePath}`;
}
