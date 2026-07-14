/**
 * The editor's API client. Domain ops + vault mutations now speak the generated
 * ontogen `Transport` (D-0019: `useTransport()` → `$mcTransport`, the same
 * contract apps/desktop drives over IPC), so the routes + shapes are
 * single-sourced from the bindings rather than hand-hardcoded here. The
 * transport is same-origin `/api/*` — served directly by the daemon in the
 * compiled binary, and by the `nitro.devProxy` under `nuxt dev`.
 *
 * Still on bespoke `$fetch` (no `Transport` home yet): the derived vault-status
 * READ model (`/api/vault-status` — the daemon's populated join; the ontogen
 * `vaultStatuses` would be a lossy round-trip), and `validate` / `init` /
 * `watch`. `apiBase` still lets those reach a cross-origin dev daemon.
 */
import type {
  InitVaultRequest,
  InitVaultResponse,
  RegisterVaultRequest,
  SaveConfigFileRequest,
  ValidateResponse,
  VaultStatus,
  WatchResponse,
} from "~/types";

/** The daemon origin the bespoke (non-transport) calls talk to ("" = same origin). */
export function useApiBase(): string {
  return (useRuntimeConfig().public.apiBase as string) ?? "";
}

/** Pull the daemon's error envelope out of a failed call ($fetch `{ error }` or a thrown Error). */
export function apiErrorMessage(err: unknown): string {
  const e = err as { data?: { error?: string }; message?: string };
  return e.data?.error ?? e.message ?? "request failed";
}

export function useApi() {
  const base = useApiBase();
  const transport = useTransport(); // the generated ontogen Transport (same-origin /api)
  return {
    // ── reads: the derived VaultStatus model stays on the daemon's read route ──
    // (the ontogen `/api/vaults` CRUD is identity-only; the editor needs the
    // join of identity + live status the daemon computes here).
    listVaults: () => $fetch<VaultStatus[]>(`${base}/api/vault-status`),
    getVault: (id: string) => $fetch<VaultStatus>(`${base}/api/vault-status/${id}`),

    // ── mutations + domain ops: the ontogen Transport contract ──
    registerVault: (body: RegisterVaultRequest) =>
      transport.vaultCreate({
        // The daemon is authoritative over id + timestamps (a full CreateVaultInput
        // is required; it reads only name/path/config_path/watch_enabled/schedule).
        id: "",
        name: body.name,
        path: body.path,
        config_path: body.configPath ?? "",
        watch_enabled: true,
        schedule: null,
        created_at: "",
        updated_at: "",
      }),
    removeVault: (id: string) => transport.vaultDelete(id),
    // `check` triggers the drift check; the drift surfaces via the vault-status
    // reload (the daemon markChecked's + SSE-emits), so the result is wrapped to
    // the editor's `{ drift }` shape but its consumers read `vault.drift`.
    checkVault: (id: string) => transport.check(id).then((drift) => ({ drift })),
    getConfig: (id: string) =>
      transport.readConfig(id).then((c) => ({
        exists: c.exists,
        raw: c.raw,
        parseError: c.parse_error,
      })),
    saveConfig: (id: string, raw: string) => transport.saveConfig(id, raw),
    getConfigFiles: (id: string) =>
      transport.listConfigFiles(id).then((c) => ({
        files: c.files.map((f) => ({
          relPath: f.rel_path,
          kind: f.kind as "config" | "contract",
          exists: f.exists,
          raw: f.raw,
          parseError: f.parse_error,
        })),
      })),
    saveConfigFile: (id: string, body: SaveConfigFileRequest) =>
      transport.saveConfigFile(id, body.relPath, body.raw),

    // ── still bespoke: no Transport home yet (init needs the inference port; a
    // validate/watch action isn't modeled) ──
    validateVault: (id: string) =>
      $fetch<ValidateResponse>(`${base}/api/vaults/${id}/validate`, { method: "POST" }),
    initVault: (id: string, body: InitVaultRequest = {}) =>
      $fetch<InitVaultResponse>(`${base}/api/vaults/${id}/init`, { method: "POST", body }),
    setWatch: (id: string, watching: boolean) =>
      $fetch<WatchResponse>(`${base}/api/vaults/${id}/watch`, {
        method: "POST",
        body: { watching },
      }),
  };
}
