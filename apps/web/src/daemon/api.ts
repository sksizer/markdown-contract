/**
 * The JSON API — the daemon's `Bun.serve` route table. It serves the ONTOGEN
 * CRUD contract (`types/ontogen.ts`) the shared vault-dashboard layer speaks via
 * `createHttpTransport()`, so the same pages run over HTTP here and over Tauri
 * IPC in apps/desktop. Every handler is parse-request → registry/store/engine
 * call → ontogen DTO; no engine logic lives here.
 *
 * Convergence (backend follow-up): the ontogen entity routes are the primary
 * surface — `/api/vaults` (+ `:id`) now return the flat `Vault[]`/`Vault`, and
 * `scan-runs`, `finding-records`, `opener-preferences`, `openers/*`, `scans/now`
 * and `echos` are new. The legacy vault SUB-routes that DON'T collide with the
 * ontogen paths (`/api/vaults/:id/{validate,check,init,config,config/files,watch}`,
 * plus `/api/health`, `/api/validate`, `/api/events`) are KEPT because the
 * apps/web/ui editor pages still consume them.
 *
 * CORS: the daemon is loopback-only, but the Nuxt DEV server (localhost:3000)
 * is a different origin than the daemon (127.0.0.1:4319), so localhost origins
 * are reflected. Anything non-local gets no CORS headers.
 */
import type { BunRequest } from "bun";

import type {
  ApiError,
  CheckResponse,
  ConfigFilesResponse,
  HealthResponse,
  InitVaultRequest,
  SaveConfigFileRequest,
  SaveConfigFileResponse,
  SaveVaultConfigRequest,
  SaveVaultConfigResponse,
  ValidateResponse,
  VaultConfigResponse,
  VaultRegistryEntry,
  WatchRequest,
  WatchResponse,
} from "../../types/api";
import type {
  CreateFindingRecordInput,
  CreateOpenerPreferenceInput,
  CreateScanRunInput,
  CreateVaultInput,
  FindingRecord,
  OpenerPreference,
  ScanRun,
  UpdateFindingRecordInput,
  UpdateOpenerPreferenceInput,
  UpdateScanRunInput,
  UpdateVaultInput,
} from "../../types/ontogen";
import { ConfigError, listConfigFiles, readConfig, saveConfig, saveConfigFile } from "./config";
import type { DaemonContext } from "./daemon";
import { vaultToDto } from "./dto";
import { type MemStore, MemStoreError, type Patch } from "./memstore";
import { listOpeners, OpenerUnsupportedError, openPath, previewOpen } from "./openers";
import { RegistryError } from "./registry";
import { handleValidate } from "./routes";
import { checkVault, initVault, RunError } from "./runs";

/** Reflect localhost/127.0.0.1 origins (the Nuxt dev server); everything else gets nothing. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
  }
  return {};
}

function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

/** An empty 204 (the ontogen DELETE / null shape) with CORS reflected. */
function noContent(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

function fail(req: Request, status: number, error: string): Response {
  return json(req, { error } satisfies ApiError, status);
}

/** Map a thrown error to its HTTP shape (400 caller, 409 state/conflict, 501 unsupported, 500 bug). */
function failFrom(req: Request, err: unknown): Response {
  if (err instanceof RegistryError) return fail(req, 400, err.message);
  if (err instanceof ConfigError) return fail(req, 400, err.message);
  if (err instanceof MemStoreError) return fail(req, 409, err.message);
  if (err instanceof RunError) return fail(req, 409, err.message);
  if (err instanceof OpenerUnsupportedError) return fail(req, 501, err.message);
  return fail(req, 500, (err as Error).message ?? "internal error");
}

/** Parse a JSON body, or null when it isn't JSON (the caller replies 400). */
async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// ── generic ontogen collection handlers (scan-runs / finding-records / opener-preferences) ──

function listOf<T extends { id: string }>(req: Request, store: MemStore<T>): Response {
  return json(req, store.list());
}

function getOf<T extends { id: string }>(
  req: Request,
  store: MemStore<T>,
  id: string,
  label: string,
): Response {
  const item = store.get(id);
  return item ? json(req, item) : fail(req, 404, `unknown ${label}: ${id}`);
}

async function createOf<T extends { id: string }, I extends T = T>(
  req: Request,
  store: MemStore<T>,
  label: string,
): Promise<Response> {
  // `I` names the ontogen `Create…Input` the route accepts (structurally its entity).
  const body = await readJson<I>(req);
  if (body === null || typeof body.id !== "string") {
    return fail(req, 400, `body must be a JSON ${label} with an id`);
  }
  try {
    return json(req, store.create(body), 201);
  } catch (err) {
    return failFrom(req, err);
  }
}

async function updateOf<T extends { id: string }, U extends Patch<T> = Patch<T>>(
  req: Request,
  store: MemStore<T>,
  id: string,
  label: string,
): Promise<Response> {
  // `U` names the ontogen `Update…Input` the route accepts (a `Patch<T>`).
  const patch = await readJson<U>(req);
  if (patch === null) return fail(req, 400, `body must be a JSON ${label} patch`);
  const updated = store.update(id, patch);
  return updated ? json(req, updated) : fail(req, 404, `unknown ${label}: ${id}`);
}

function deleteOf<T extends { id: string }>(
  req: Request,
  store: MemStore<T>,
  id: string,
  label: string,
): Response {
  return store.delete(id) ? noContent(req) : fail(req, 404, `unknown ${label}: ${id}`);
}

// ── vault mapping (ontogen Create/Update → registry intent) ──

/** Re-arm or disarm a vault's watch to match its current `watch` flag. */
function syncWatch(ctx: DaemonContext, entry: VaultRegistryEntry): void {
  if (entry.watch === false) ctx.disarmWatch(entry.id);
  else ctx.armWatch(entry);
}

async function createVault(req: Request, ctx: DaemonContext): Promise<Response> {
  const body = await readJson<CreateVaultInput>(req);
  if (body === null) return fail(req, 400, "body must be JSON: a Vault ({ name, path, ... })");
  try {
    const entry = ctx.registry.add({
      name: body.name,
      path: body.path,
      ...(body.config_path ? { configPath: body.config_path } : {}),
    });
    const patch: Partial<Pick<VaultRegistryEntry, "watch" | "schedule">> = {};
    if (body.watch_enabled === false) patch.watch = false;
    if (body.schedule != null) patch.schedule = body.schedule;
    const fresh =
      Object.keys(patch).length > 0 ? (ctx.registry.update(entry.id, patch) ?? entry) : entry;
    ctx.store.markRunning(fresh);
    syncWatch(ctx, fresh);
    queueMicrotask(() => void ctx.revalidate(fresh).catch(() => {}));
    return json(req, vaultToDto(fresh), 201);
  } catch (err) {
    return failFrom(req, err);
  }
}

async function updateVault(req: Request, ctx: DaemonContext, id: string): Promise<Response> {
  const body = await readJson<UpdateVaultInput>(req);
  if (body === null) return fail(req, 400, "body must be JSON: a Vault patch");
  try {
    const entry = ctx.registry.update(id, {
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.config_path != null ? { configPath: body.config_path } : {}),
      ...(body.watch_enabled != null ? { watch: body.watch_enabled } : {}),
      ...(body.schedule !== undefined ? { schedule: body.schedule } : {}),
    });
    if (!entry) return fail(req, 404, `unknown vault: ${id}`);
    syncWatch(ctx, entry);
    return json(req, vaultToDto(entry));
  } catch (err) {
    return failFrom(req, err);
  }
}

// ── route table ──

type IdRequest = BunRequest<"/api/vaults/:id">;
type ScanRunIdRequest = BunRequest<"/api/scan-runs/:id">;
type FindingIdRequest = BunRequest<"/api/finding-records/:id">;
type OpenerPrefIdRequest = BunRequest<"/api/opener-preferences/:id">;
type VaultStatusIdRequest = BunRequest<"/api/vault-status/:id">;

/** The full route table `Bun.serve` mounts; `fetch` handles everything not listed here. */
export function buildRoutes(ctx: DaemonContext) {
  return {
    // ── health / stateless / live-status wire (kept; no ontogen collision) ──
    "/api/health": {
      GET: (req: Request) =>
        json(req, {
          ok: true,
          version: ctx.version,
          pid: process.pid,
          registryPath: ctx.registry.path,
        } satisfies HealthResponse),
    },

    "/api/validate": {
      POST: async (req: Request) => {
        const res = await handleValidate(req, { root: process.cwd() });
        for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
        return res;
      },
    },

    "/api/events": {
      GET: (req: Request) => {
        const res = ctx.hub.handler(req);
        for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
        return res;
      },
    },

    // ── ontogen: vaults ──
    "/api/vaults": {
      GET: (req: Request) => json(req, ctx.registry.list().map(vaultToDto)),
      POST: (req: Request) => createVault(req, ctx),
    },

    "/api/vaults/:id": {
      GET: (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        return entry
          ? json(req, vaultToDto(entry))
          : fail(req, 404, `unknown vault: ${req.params.id}`);
      },
      PUT: (req: IdRequest) => updateVault(req, ctx, req.params.id),
      DELETE: (req: IdRequest) => {
        const id = req.params.id;
        if (!ctx.registry.remove(id)) return fail(req, 404, `unknown vault: ${id}`);
        ctx.disarmWatch(id);
        ctx.store.drop(id);
        return noContent(req);
      },
    },

    // ── editor read model: rich VaultStatus (kept — apps/web/ui dashboard) ──
    // The ontogen `/api/vaults` routes return the identity-only `Vault`; the
    // editor still renders derived pass/fail + findings, so it reads that here.
    // This is a JOIN over the registry (identity) and the StatusStore (derived
    // live status) — the shape the ontogen contract would eventually express as
    // a `Vault` + its latest `ScanRun`. Read-only; mutations go via ontogen CRUD.
    "/api/vault-status": {
      GET: (req: Request) => json(req, ctx.store.snapshot(ctx.registry.list())),
    },
    "/api/vault-status/:id": {
      GET: (req: VaultStatusIdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        return entry
          ? json(req, ctx.store.statusOf(entry))
          : fail(req, 404, `unknown vault: ${req.params.id}`);
      },
    },

    // ── ontogen: scan-runs ──
    "/api/scan-runs": {
      GET: (req: Request) => listOf(req, ctx.scans.runs),
      POST: (req: Request) =>
        createOf<ScanRun, CreateScanRunInput>(req, ctx.scans.runs, "scan-run"),
    },
    "/api/scan-runs/:id": {
      GET: (req: ScanRunIdRequest) => getOf(req, ctx.scans.runs, req.params.id, "scan-run"),
      PUT: (req: ScanRunIdRequest) =>
        updateOf<ScanRun, UpdateScanRunInput>(req, ctx.scans.runs, req.params.id, "scan-run"),
      DELETE: (req: ScanRunIdRequest) => deleteOf(req, ctx.scans.runs, req.params.id, "scan-run"),
    },

    // ── ontogen: finding-records ──
    "/api/finding-records": {
      GET: (req: Request) => listOf(req, ctx.scans.findings),
      POST: (req: Request) =>
        createOf<FindingRecord, CreateFindingRecordInput>(
          req,
          ctx.scans.findings,
          "finding-record",
        ),
    },
    "/api/finding-records/:id": {
      GET: (req: FindingIdRequest) =>
        getOf(req, ctx.scans.findings, req.params.id, "finding-record"),
      PUT: (req: FindingIdRequest) =>
        updateOf<FindingRecord, UpdateFindingRecordInput>(
          req,
          ctx.scans.findings,
          req.params.id,
          "finding-record",
        ),
      DELETE: (req: FindingIdRequest) =>
        deleteOf(req, ctx.scans.findings, req.params.id, "finding-record"),
    },

    // ── ontogen: opener-preferences ──
    "/api/opener-preferences": {
      GET: (req: Request) => listOf(req, ctx.openerPrefs),
      POST: (req: Request) =>
        createOf<OpenerPreference, CreateOpenerPreferenceInput>(
          req,
          ctx.openerPrefs,
          "opener-preference",
        ),
    },
    "/api/opener-preferences/:id": {
      GET: (req: OpenerPrefIdRequest) =>
        getOf(req, ctx.openerPrefs, req.params.id, "opener-preference"),
      PUT: (req: OpenerPrefIdRequest) =>
        updateOf<OpenerPreference, UpdateOpenerPreferenceInput>(
          req,
          ctx.openerPrefs,
          req.params.id,
          "opener-preference",
        ),
      DELETE: (req: OpenerPrefIdRequest) =>
        deleteOf(req, ctx.openerPrefs, req.params.id, "opener-preference"),
    },

    // ── ontogen: openers (web daemon: empty list; launch/preview are desktop-only) ──
    "/api/openers/list": {
      GET: (req: Request) => json(req, listOpeners()),
    },
    "/api/openers/open-path": {
      POST: async (req: Request) => {
        const body = await readJson<{ path?: string; app_id?: string }>(req);
        if (!body?.path || !body.app_id) {
          return fail(req, 400, "body must be JSON: { path, app_id }");
        }
        try {
          openPath(body.path, body.app_id);
          return noContent(req);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },
    "/api/openers/preview-open": {
      POST: async (req: Request) => {
        const body = await readJson<{ path?: string; app_id?: string }>(req);
        if (!body?.path || !body.app_id) {
          return fail(req, 400, "body must be JSON: { path, app_id }");
        }
        try {
          return json(req, previewOpen(body.path, body.app_id));
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    // ── ontogen: scan a vault now → the finalized ScanRun ──
    "/api/scans/now": {
      POST: async (req: Request) => {
        const body = await readJson<{ vault_id?: string }>(req);
        if (!body?.vault_id) return fail(req, 400, "body must be JSON: { vault_id }");
        const entry = ctx.registry.get(body.vault_id);
        if (!entry) return fail(req, 404, `unknown vault: ${body.vault_id}`);
        return json(req, ctx.scanNow(entry, "manual"));
      },
    },

    // ── ontogen: echo (liveness probe) ──
    "/api/echos": {
      POST: async (req: Request) => {
        const body = await readJson<{ message?: string }>(req);
        if (typeof body?.message !== "string") {
          return fail(req, 400, "body must be JSON: { message }");
        }
        return json(req, body.message);
      },
    },

    // ── legacy vault sub-routes (kept — apps/web/ui editor depends; no ontogen collision) ──
    "/api/vaults/:id/validate": {
      POST: async (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        try {
          const result = await ctx.revalidate(entry);
          return json(req, { result } satisfies ValidateResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    "/api/vaults/:id/check": {
      GET: (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        try {
          const drift = checkVault(entry);
          const status = ctx.store.markChecked(entry, drift);
          ctx.hub.emit({ type: "drift", vaultId: entry.id, drift });
          ctx.hub.emit({ type: "status", vaultId: entry.id, state: status.state });
          return json(req, { drift } satisfies CheckResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    "/api/vaults/:id/init": {
      POST: async (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        let body: InitVaultRequest = {};
        try {
          const text = await req.text();
          if (text.trim() !== "") body = JSON.parse(text) as InitVaultRequest;
        } catch {
          return fail(req, 400, "body must be JSON: { dryRun?, force? }");
        }
        const outcome = await initVault(entry, body);
        if (outcome.code === 0 && !body.dryRun) {
          queueMicrotask(() => void ctx.revalidate(entry).catch(() => {}));
        }
        return json(req, outcome);
      },
    },

    "/api/vaults/:id/config": {
      GET: (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        try {
          return json(req, readConfig(entry) satisfies VaultConfigResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },

      PUT: async (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        let body: SaveVaultConfigRequest;
        try {
          body = (await req.json()) as SaveVaultConfigRequest;
        } catch {
          return fail(req, 400, "body must be JSON: { raw }");
        }
        if (typeof body?.raw !== "string") return fail(req, 400, "body must be JSON: { raw }");
        try {
          saveConfig(entry, body.raw);
          const vault = ctx.store.markRunning(entry);
          queueMicrotask(() => void ctx.revalidate(entry).catch(() => {}));
          return json(req, { ok: true, vault } satisfies SaveVaultConfigResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    "/api/vaults/:id/config/files": {
      GET: (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        try {
          return json(req, listConfigFiles(entry) satisfies ConfigFilesResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },

      PUT: async (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        let body: SaveConfigFileRequest;
        try {
          body = (await req.json()) as SaveConfigFileRequest;
        } catch {
          return fail(req, 400, "body must be JSON: { relPath, raw }");
        }
        if (typeof body?.relPath !== "string" || typeof body?.raw !== "string") {
          return fail(req, 400, "body must be JSON: { relPath, raw }");
        }
        try {
          saveConfigFile(entry, body.relPath, body.raw);
          const vault = ctx.store.markRunning(entry);
          queueMicrotask(() => void ctx.revalidate(entry).catch(() => {}));
          return json(req, { ok: true, vault } satisfies SaveConfigFileResponse);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    "/api/vaults/:id/watch": {
      POST: async (req: IdRequest) => {
        let body: WatchRequest;
        try {
          body = (await req.json()) as WatchRequest;
        } catch {
          return fail(req, 400, "body must be JSON: { watching: boolean }");
        }
        const entry = ctx.registry.setWatch(req.params.id, body.watching === true);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        if (entry.watch) ctx.armWatch(entry);
        else ctx.disarmWatch(entry.id);
        return json(req, {
          id: entry.id,
          watching: ctx.watcher.watching(entry.id),
        } satisfies WatchResponse);
      },
    },
  };
}
