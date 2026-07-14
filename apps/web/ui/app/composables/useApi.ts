/**
 * The REAL API client — the thing the mock prototype's `mockApi` loader was
 * built to be swapped for: one method per D-0012 §D3 route, same shapes
 * (`types/api.ts`), now over `$fetch` against the live daemon.
 *
 * `apiBase` is "" when the SPA is served BY the daemon (same origin, the
 * compiled-binary case). In `nuxt dev` the daemon is another origin, so set
 * `NUXT_PUBLIC_API_BASE=http://127.0.0.1:4319` (the daemon reflects localhost
 * origins for CORS).
 */
import type {
  CheckResponse,
  ConfigFilesResponse,
  InitVaultRequest,
  InitVaultResponse,
  RegisterVaultRequest,
  SaveConfigFileRequest,
  SaveConfigFileResponse,
  SaveVaultConfigResponse,
  ValidateResponse,
  VaultConfigResponse,
  VaultStatus,
  WatchResponse,
} from "~/types";

/** The daemon origin the client talks to ("" = same origin). */
export function useApiBase(): string {
  return (useRuntimeConfig().public.apiBase as string) ?? "";
}

/** Pull the daemon's error envelope (`{ error }`) out of a failed `$fetch`. */
export function apiErrorMessage(err: unknown): string {
  const e = err as { data?: { error?: string }; message?: string };
  return e.data?.error ?? e.message ?? "request failed";
}

export function useApi() {
  const base = useApiBase();
  return {
    // NOTE: the daemon's base `/api/vaults` routes now return the flat ontogen
    // `Vault` shape (backend convergence); these legacy method types are the
    // pre-convergence envelopes, inlined here — this composable is slated for
    // migration onto the shared-dashboard transport (`useVaults` in the layer).
    listVaults: () => $fetch<{ vaults: VaultStatus[] }>(`${base}/api/vaults`),
    getVault: (id: string) => $fetch<{ vault: VaultStatus }>(`${base}/api/vaults/${id}`),
    registerVault: (body: RegisterVaultRequest) =>
      $fetch<{ vault: VaultStatus }>(`${base}/api/vaults`, { method: "POST", body }),
    removeVault: (id: string) =>
      $fetch<{ ok: true; id: string }>(`${base}/api/vaults/${id}`, { method: "DELETE" }),
    validateVault: (id: string) =>
      $fetch<ValidateResponse>(`${base}/api/vaults/${id}/validate`, { method: "POST" }),
    checkVault: (id: string) => $fetch<CheckResponse>(`${base}/api/vaults/${id}/check`),
    initVault: (id: string, body: InitVaultRequest = {}) =>
      $fetch<InitVaultResponse>(`${base}/api/vaults/${id}/init`, { method: "POST", body }),
    setWatch: (id: string, watching: boolean) =>
      $fetch<WatchResponse>(`${base}/api/vaults/${id}/watch`, {
        method: "POST",
        body: { watching },
      }),
    getConfig: (id: string) => $fetch<VaultConfigResponse>(`${base}/api/vaults/${id}/config`),
    saveConfig: (id: string, raw: string) =>
      $fetch<SaveVaultConfigResponse>(`${base}/api/vaults/${id}/config`, {
        method: "PUT",
        body: { raw },
      }),
    getConfigFiles: (id: string) =>
      $fetch<ConfigFilesResponse>(`${base}/api/vaults/${id}/config/files`),
    saveConfigFile: (id: string, body: SaveConfigFileRequest) =>
      $fetch<SaveConfigFileResponse>(`${base}/api/vaults/${id}/config/files`, {
        method: "PUT",
        body,
      }),
  };
}
