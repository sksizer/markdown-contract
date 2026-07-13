import type { FindingRecord, ScanRun, Vault } from "../transport";

// Transport-agnostic vault service — the ONE place the shared dashboard touches
// the transport for vaults, runs, and findings. This is apps/desktop's
// useVaults, verbatim in shape, except the transport is the host-provided
// `useTransport()` (HTTP or IPC) read LAZILY per call instead of a hard-wired
// `createIpcTransport()`. `useTransport` is a Nuxt auto-import from this layer.
export function useVaults() {
  return {
    /** All registered vaults. */
    list: (): Promise<Vault[]> => useTransport().vaultList(),
    /** One vault by slug id. */
    get: (id: string): Promise<Vault> => useTransport().vaultGetById(id),
    /** Scan a vault now; resolves to the finalized, persisted run. */
    scanNow: (vaultId: string): Promise<ScanRun> => useTransport().scanNow(vaultId),
    /** Full scan-run history (all vaults; derive per-vault views client-side). */
    runs: (): Promise<ScanRun[]> => useTransport().scanRunList(),
    /** All persisted finding records (filter by scan_run_id client-side). */
    findings: (): Promise<FindingRecord[]> => useTransport().findingRecordList(),
  };
}
