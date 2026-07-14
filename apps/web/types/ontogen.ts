/**
 * THE ONTOGEN WIRE CONTRACT — the CRUD API the shared vault-dashboard layer
 * (`@markdown-contract/dashboard`) speaks over HTTP via `createHttpTransport()`.
 *
 * These DTOs are the flat, snake_case entity shapes ontogen generates from the
 * desktop API surface; the daemon serves exactly these so the SAME dashboard
 * pages run over HTTP (this daemon) or Tauri IPC (apps/desktop). The source of
 * truth is ontogen's generated bindings — apps/desktop/app/bindings/types.ts,
 * vendored into packages/dashboard/bindings/types.ts by `sync:bindings`. This
 * file MIRRORS that surface, hand-owned here for the same reason `types/api.ts`
 * hand-owns the legacy seam: the daemon binds to an explicit wire contract, not
 * a cross-app import, so the API can hold stable while the engine moves.
 *
 * Route map (BASE `/api`, from bindings/transport.ts `createHttpTransport`):
 *   GET    /api/vaults                → Vault[]
 *   GET    /api/vaults/:id            → Vault
 *   POST   /api/vaults               → Vault              (CreateVaultInput)
 *   PUT    /api/vaults/:id            → Vault              (UpdateVaultInput)
 *   DELETE /api/vaults/:id            → 204
 *   GET    /api/scan-runs             → ScanRun[]
 *   GET    /api/scan-runs/:id         → ScanRun
 *   POST   /api/scan-runs            → ScanRun            (CreateScanRunInput)
 *   PUT    /api/scan-runs/:id         → ScanRun            (UpdateScanRunInput)
 *   DELETE /api/scan-runs/:id         → 204
 *   GET    /api/finding-records       → FindingRecord[]
 *   GET    /api/finding-records/:id   → FindingRecord
 *   POST   /api/finding-records      → FindingRecord      (CreateFindingRecordInput)
 *   PUT    /api/finding-records/:id   → FindingRecord      (UpdateFindingRecordInput)
 *   DELETE /api/finding-records/:id   → 204
 *   GET    /api/opener-preferences        → OpenerPreference[]
 *   GET    /api/opener-preferences/:id    → OpenerPreference
 *   POST   /api/opener-preferences       → OpenerPreference (CreateOpenerPreferenceInput)
 *   PUT    /api/opener-preferences/:id    → OpenerPreference (UpdateOpenerPreferenceInput)
 *   DELETE /api/opener-preferences/:id    → 204
 *   GET    /api/openers/list          → OpenerInfo[]
 *   POST   /api/openers/open-path    → null               ({ path, app_id })
 *   POST   /api/openers/preview-open → OpenPreview        ({ path, app_id })
 *   POST   /api/scans/now            → ScanRun            ({ vault_id })
 *   POST   /api/echos                → string             ({ message })
 */

export type Vault = {
  id: string;
  name: string;
  path: string;
  config_path: string;
  watch_enabled: boolean;
  schedule: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVaultInput = {
  id: string;
  name: string;
  path: string;
  config_path: string;
  watch_enabled: boolean;
  schedule: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdateVaultInput = {
  name?: string | null;
  path?: string | null;
  config_path?: string | null;
  watch_enabled?: boolean | null;
  schedule?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FindingRecord = {
  id: string;
  scan_run_id: string;
  finding_id: string;
  level: string;
  file_path: string;
  line: number | null;
  col: number | null;
  message: string;
};

export type CreateFindingRecordInput = {
  id: string;
  scan_run_id: string;
  finding_id: string;
  level: string;
  file_path: string;
  line: number | null;
  col: number | null;
  message: string;
};

export type UpdateFindingRecordInput = {
  scan_run_id?: string | null;
  finding_id?: string | null;
  level?: string | null;
  file_path?: string | null;
  line?: number | null;
  col?: number | null;
  message?: string | null;
};

export type OpenerPreference = {
  id: string;
  app_id: string;
  enabled: boolean;
  sort_order: number;
};

export type CreateOpenerPreferenceInput = {
  id: string;
  app_id: string;
  enabled: boolean;
  sort_order: number;
};

export type UpdateOpenerPreferenceInput = {
  app_id?: string | null;
  enabled?: boolean | null;
  sort_order?: number | null;
};

export type ScanRun = {
  id: string;
  vault_id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  status: string;
  error_count: number;
  warn_count: number;
  report_count: number;
  error_message: string | null;
};

export type CreateScanRunInput = {
  id: string;
  vault_id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  status: string;
  error_count: number;
  warn_count: number;
  report_count: number;
  error_message: string | null;
};

export type UpdateScanRunInput = {
  vault_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  trigger?: string | null;
  status?: string | null;
  error_count?: number | null;
  warn_count?: number | null;
  report_count?: number | null;
  error_message?: string | null;
};

export type OpenPreview = {
  program: string;
  args: string[];
};

export type OpenerInfo = {
  app_id: string;
  name: string;
  command: string;
  accepts_directories: boolean;
  accepts_markdown: boolean;
  sort_order: number;
};

// ── ontogen custom-action DTOs (D-0019 workstream B) ──────────────────────────
// The action routes the generated `Transport` calls, which this daemon serves as
// thin aliases over its existing runs/config handlers (mapping the legacy
// camelCase seam to these snake_case ontogen shapes):
//   POST /api/checks                    { vault_id }            → DriftResult
//   POST /api/configs/read              { vault_id }            → VaultConfig
//   POST /api/configs/save             { vault_id, raw }       → 204
//   POST /api/configs/files             { vault_id }            → ConfigFiles
//   POST /api/configs/save-config-file { vault_id, rel_path, raw } → 204

/** Drift check result — structurally identical to the legacy `DriftResult`
 * (`kind` widened to string, the ontogen DTO shape). */
export type DriftEntry = {
  kind: string;
  target: string;
  detail: string;
};

export type DriftResult = {
  drifted: boolean;
  entries: DriftEntry[];
  warnings: string[];
};

/** A vault's router config file, read verbatim (snake_case `parse_error`). */
export type VaultConfig = {
  exists: boolean;
  raw: string;
  parse_error: string | null;
};

export type ConfigFileEntry = {
  rel_path: string;
  kind: string;
  exists: boolean;
  raw: string;
  parse_error: string | null;
};

export type ConfigFiles = {
  files: ConfigFileEntry[];
};
