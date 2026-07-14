/**
 * The scan-run store — the ontogen `ScanRun` + `FindingRecord` history the
 * dashboard reads (`scanRunList`, `findingRecordList`, `scanNow`). It is pure
 * storage over two {@link MemStore}s plus `ingest`, which folds one finished (or
 * failed) engine run into a persisted `ScanRun` and its flattened
 * `FindingRecord` rows. The daemon (`./daemon.ts`) owns the actual corpus run
 * and calls `ingest` with the result — this module never touches the engine, so
 * it stays trivially testable.
 *
 * In-memory only (D-0012 §D4 layer 2): a restart starts empty. Durable run
 * history (layer 3, SQLite) is deferred.
 */
import type { Finding } from "../../types/api";
import type { FindingRecord, ScanRun } from "../../types/ontogen";
import { buildScanRun, findingToRecord } from "./dto";
import { MemStore } from "./memstore";

/** Default id minter: a `scan-` prefixed UUID, stable per run. */
function defaultMintId(): string {
  return `scan-${crypto.randomUUID()}`;
}

export class ScanStore {
  /** Every scan run, newest last (insertion order). */
  readonly runs = new MemStore<ScanRun>();
  /** Every finding record across all runs. */
  readonly findings = new MemStore<FindingRecord>();
  private readonly mintId: () => string;

  /** `mintId` is injectable so tests get deterministic ids. */
  constructor(mintId: () => string = defaultMintId) {
    this.mintId = mintId;
  }

  /**
   * Persist one run's outcome. A completed run passes its `findings`; a run that
   * threw passes `[]` plus `errorMessage` (recorded as an `error` ScanRun). The
   * finalized `ScanRun` is returned and its `FindingRecord` rows are stored,
   * keyed `<scanRunId>-<index>`.
   */
  ingest(
    vaultId: string,
    trigger: string,
    findings: Finding[],
    errorMessage: string | null = null,
  ): ScanRun {
    const id = this.mintId();
    const at = new Date().toISOString();
    const run = buildScanRun({
      id,
      vaultId,
      startedAt: at,
      finishedAt: at,
      trigger,
      findings,
      errorMessage,
    });
    this.runs.create(run);
    findings.forEach((finding, index) => {
      this.findings.create(findingToRecord(finding, id, index));
    });
    return run;
  }
}
