/**
 * Live status — layer 2 of D-0012 §D4's three-layer model: the *derived*,
 * in-memory pass/fail + findings per vault. Computed by runs (`./runs.ts`),
 * held here, pushed to the UI over SSE (`./sse.ts`). Nothing in this layer is
 * persisted — a daemon restart recomputes it.
 */
import type {
  DriftResult,
  RunResult,
  VaultRegistryEntry,
  VaultStatus,
  VaultStatusState,
} from "../../types/api";

/** Fold a finished run down to the coarse state a dashboard cell renders. */
export function stateFromRun(result: RunResult): VaultStatusState {
  return result.exitCode === 0 && result.findings.length === 0 ? "green" : "findings";
}

/** Fold a finished drift check down to a coarse state. */
export function stateFromDrift(drift: DriftResult): VaultStatusState {
  return drift.drifted ? "drift" : "green";
}

/**
 * The in-memory store: registry entry id → latest `VaultStatus`. Every setter
 * returns the fresh status so callers can emit it over SSE without re-reading.
 */
export class StatusStore {
  private statuses = new Map<string, VaultStatus>();

  /** The baseline row for a vault the daemon hasn't run yet (or is running now). */
  markRunning(entry: VaultRegistryEntry): VaultStatus {
    const prev = this.statuses.get(entry.id);
    return this.put({
      ...entry,
      state: "running",
      updatedAt: new Date().toISOString(),
      // keep the last result visible while a re-run is in flight
      ...(prev?.result ? { result: prev.result } : {}),
      ...(prev?.drift ? { drift: prev.drift } : {}),
    });
  }

  markValidated(entry: VaultRegistryEntry, result: RunResult): VaultStatus {
    const prev = this.statuses.get(entry.id);
    return this.put({
      ...entry,
      state: stateFromRun(result),
      updatedAt: new Date().toISOString(),
      result,
      ...(prev?.drift ? { drift: prev.drift } : {}),
    });
  }

  markChecked(entry: VaultRegistryEntry, drift: DriftResult): VaultStatus {
    const prev = this.statuses.get(entry.id);
    const state = drift.drifted ? "drift" : prev?.result ? stateFromRun(prev.result) : "green";
    return this.put({
      ...entry,
      state,
      updatedAt: new Date().toISOString(),
      ...(prev?.result ? { result: prev.result } : {}),
      drift,
    });
  }

  markError(entry: VaultRegistryEntry, message: string): VaultStatus {
    return this.put({
      ...entry,
      state: "error",
      updatedAt: new Date().toISOString(),
      error: { message },
    });
  }

  get(id: string): VaultStatus | undefined {
    return this.statuses.get(id);
  }

  /** One vault's status row — a vault never run yet gets a bare "running" baseline. */
  statusOf(entry: VaultRegistryEntry): VaultStatus {
    return (
      this.statuses.get(entry.id) ?? {
        ...entry,
        state: "running" as const,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  /** Statuses in registry order. */
  snapshot(entries: VaultRegistryEntry[]): VaultStatus[] {
    return entries.map((entry) => this.statusOf(entry));
  }

  drop(id: string): void {
    this.statuses.delete(id);
  }

  private put(status: VaultStatus): VaultStatus {
    this.statuses.set(status.id, status);
    return status;
  }
}
