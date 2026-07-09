// The first consumer of the generated TS bindings (D-0018 §D4): vault access
// over the generated Tauri IPC transport. The bindings land in app/bindings/
// on every `cargo build` of src-tauri; this composable is the smoke seam the
// vault-management UI of the next phase grows out of.
//
// Relative imports (not `~/bindings/...`) so `bun test app` resolves the
// modules without Nuxt's generated tsconfig aliases.
import type { Transport } from "../bindings/transport";
import { createIpcTransport } from "../bindings/transport";
import type { CreateVaultInput, ScanRun, Vault } from "../bindings/types";

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
    /** Register a vault (empty `id` lets the backend derive the slug id). */
    register: (input: CreateVaultInput): Promise<Vault> => ipc().vaultCreate(input),
    /** Scan a vault now; resolves to the finalized, persisted run. */
    scanNow: (vaultId: string): Promise<ScanRun> => ipc().scanNow(vaultId),
  };
}
