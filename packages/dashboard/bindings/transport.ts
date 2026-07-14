// GENERATED — do not edit. Regenerate with `bun run sync:bindings` (packages/dashboard).
// HTTP-only slice of ontogen's apps/desktop/app/bindings/transport.ts:
// the createIpcTransport section + its @tauri-apps import are stripped so this
// module bundles with no Tauri SDK. Transport interface + createHttpTransport verbatim.

import type {
  CreateFindingRecordInput,
  CreateOpenerPreferenceInput,
  CreateScanRunInput,
  CreateVaultInput,
  FindingRecord,
  OpenerInfo,
  OpenerPreference,
  OpenPreview,
  ScanRun,
  UpdateFindingRecordInput,
  UpdateOpenerPreferenceInput,
  UpdateScanRunInput,
  UpdateVaultInput,
  Vault,
  VaultStatus,
} from "./types";

// ── Transport Interface ──

export interface Transport {
  echo(message: string): Promise<string>;
  findingRecordList(): Promise<FindingRecord[]>;
  findingRecordGetById(id: string): Promise<FindingRecord>;
  findingRecordCreate(input: CreateFindingRecordInput): Promise<FindingRecord>;
  findingRecordUpdate(id: string, input: UpdateFindingRecordInput): Promise<FindingRecord>;
  findingRecordDelete(id: string): Promise<null>;
  openerPreferenceList(): Promise<OpenerPreference[]>;
  openerPreferenceGetById(id: string): Promise<OpenerPreference>;
  openerPreferenceCreate(input: CreateOpenerPreferenceInput): Promise<OpenerPreference>;
  openerPreferenceUpdate(id: string, input: UpdateOpenerPreferenceInput): Promise<OpenerPreference>;
  openerPreferenceDelete(id: string): Promise<null>;
  scanRunList(): Promise<ScanRun[]>;
  scanRunGetById(id: string): Promise<ScanRun>;
  scanRunCreate(input: CreateScanRunInput): Promise<ScanRun>;
  scanRunUpdate(id: string, input: UpdateScanRunInput): Promise<ScanRun>;
  scanRunDelete(id: string): Promise<null>;
  vaultList(): Promise<Vault[]>;
  vaultGetById(id: string): Promise<Vault>;
  vaultCreate(input: CreateVaultInput): Promise<Vault>;
  vaultUpdate(id: string, input: UpdateVaultInput): Promise<Vault>;
  vaultDelete(id: string): Promise<null>;
  listOpeners(): Promise<OpenerInfo[]>;
  openPath(path: string, appId: string): Promise<null>;
  previewOpen(path: string, appId: string): Promise<OpenPreview>;
  scanNow(vaultId: string): Promise<ScanRun>;
  vaultStatuses(): Promise<VaultStatus[]>;
  vaultStatus(vaultId: string): Promise<VaultStatus>;
}

// ── HTTP Helpers ──

const BASE = "/api";

async function httpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

async function httpPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errBody.error ?? res.statusText);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

async function httpPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errBody.error ?? res.statusText);
  }
  return res.json();
}

async function httpDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errBody.error ?? res.statusText);
  }
}

// ── HTTP Transport ──

export function createHttpTransport(): Transport {
  return {
    async echo(message: string): Promise<string> {
      return httpPost<string>("/echos", { message });
    },
    async findingRecordList(): Promise<FindingRecord[]> {
      return httpGet("/finding-records");
    },
    async findingRecordGetById(id: string): Promise<FindingRecord> {
      return httpGet(`/finding-records/${encodeURIComponent(id)}`);
    },
    async findingRecordCreate(input: CreateFindingRecordInput): Promise<FindingRecord> {
      return httpPost<FindingRecord>("/finding-records", input);
    },
    async findingRecordUpdate(id: string, input: UpdateFindingRecordInput): Promise<FindingRecord> {
      return httpPut<FindingRecord>(`/finding-records/${encodeURIComponent(id)}`, input);
    },
    async findingRecordDelete(id: string): Promise<null> {
      await httpDelete(`/finding-records/${encodeURIComponent(id)}`);
      return null;
    },
    async openerPreferenceList(): Promise<OpenerPreference[]> {
      return httpGet("/opener-preferences");
    },
    async openerPreferenceGetById(id: string): Promise<OpenerPreference> {
      return httpGet(`/opener-preferences/${encodeURIComponent(id)}`);
    },
    async openerPreferenceCreate(input: CreateOpenerPreferenceInput): Promise<OpenerPreference> {
      return httpPost<OpenerPreference>("/opener-preferences", input);
    },
    async openerPreferenceUpdate(
      id: string,
      input: UpdateOpenerPreferenceInput,
    ): Promise<OpenerPreference> {
      return httpPut<OpenerPreference>(`/opener-preferences/${encodeURIComponent(id)}`, input);
    },
    async openerPreferenceDelete(id: string): Promise<null> {
      await httpDelete(`/opener-preferences/${encodeURIComponent(id)}`);
      return null;
    },
    async scanRunList(): Promise<ScanRun[]> {
      return httpGet("/scan-runs");
    },
    async scanRunGetById(id: string): Promise<ScanRun> {
      return httpGet(`/scan-runs/${encodeURIComponent(id)}`);
    },
    async scanRunCreate(input: CreateScanRunInput): Promise<ScanRun> {
      return httpPost<ScanRun>("/scan-runs", input);
    },
    async scanRunUpdate(id: string, input: UpdateScanRunInput): Promise<ScanRun> {
      return httpPut<ScanRun>(`/scan-runs/${encodeURIComponent(id)}`, input);
    },
    async scanRunDelete(id: string): Promise<null> {
      await httpDelete(`/scan-runs/${encodeURIComponent(id)}`);
      return null;
    },
    async vaultList(): Promise<Vault[]> {
      return httpGet("/vaults");
    },
    async vaultGetById(id: string): Promise<Vault> {
      return httpGet(`/vaults/${encodeURIComponent(id)}`);
    },
    async vaultCreate(input: CreateVaultInput): Promise<Vault> {
      return httpPost<Vault>("/vaults", input);
    },
    async vaultUpdate(id: string, input: UpdateVaultInput): Promise<Vault> {
      return httpPut<Vault>(`/vaults/${encodeURIComponent(id)}`, input);
    },
    async vaultDelete(id: string): Promise<null> {
      await httpDelete(`/vaults/${encodeURIComponent(id)}`);
      return null;
    },
    async listOpeners(): Promise<OpenerInfo[]> {
      return httpGet("/openers/list");
    },
    async openPath(path: string, appId: string): Promise<null> {
      await httpPost("/openers/open-path", { path, app_id: appId });
      return null;
    },
    async previewOpen(path: string, appId: string): Promise<OpenPreview> {
      return httpPost<OpenPreview>("/openers/preview-open", {
        path,
        app_id: appId,
      });
    },
    async scanNow(vaultId: string): Promise<ScanRun> {
      return httpPost<ScanRun>("/scans/now", { vault_id: vaultId });
    },
    async vaultStatuses(): Promise<VaultStatus[]> {
      return httpPost<VaultStatus[]>("/vault-statuses");
    },
    async vaultStatus(vaultId: string): Promise<VaultStatus> {
      return httpPost<VaultStatus>("/vault-statuses/by-id", {
        vault_id: vaultId,
      });
    },
  };
}
