// The vault service surface over the generated TS bindings (D-0018 §D4): the
// bindings land in app/bindings/ on every `cargo build` of src-tauri; this
// composable is the one place the screens touch the transport for vaults,
// runs, and findings.
//
// Relative imports (not `~/bindings/...`) so `bun test app` resolves the
// modules without Nuxt's generated tsconfig aliases.
import type { Transport } from "../bindings/transport";
import { createIpcTransport } from "../bindings/transport";
import type {
  CreateVaultInput,
  FindingRecord,
  ScanRun,
  UpdateVaultInput,
  Vault,
} from "../bindings/types";

let transport: Transport | undefined;

/** One lazily-created IPC transport per webview (creation touches no IPC). */
function ipc(): Transport {
  transport ??= createIpcTransport();
  return transport;
}

/** Vault operations over the generated service surface. */
export function useVaults() {
  return {
    /** All registered vaults. */
    list: (): Promise<Vault[]> => ipc().vaultList(),
    /** One vault by slug id. */
    get: (id: string): Promise<Vault> => ipc().vaultGetById(id),
    /** Register a vault (empty `id` lets the backend derive the slug id). */
    register: (input: CreateVaultInput): Promise<Vault> => ipc().vaultCreate(input),
    /** Update watch/schedule/name/… (the backend validates cron at this seam). */
    update: (id: string, input: UpdateVaultInput): Promise<Vault> => ipc().vaultUpdate(id, input),
    /** Remove a vault from the registry (watchers/schedules rearm off this). */
    remove: (id: string): Promise<null> => ipc().vaultDelete(id),
    /** Scan a vault now; resolves to the finalized, persisted run. */
    scanNow: (vaultId: string): Promise<ScanRun> => ipc().scanNow(vaultId),
    /** Full scan-run history (all vaults; derive per-vault views client-side). */
    runs: (): Promise<ScanRun[]> => ipc().scanRunList(),
    /** All persisted finding records (filter by scan_run_id client-side). */
    findings: (): Promise<FindingRecord[]> => ipc().findingRecordList(),
  };
}
