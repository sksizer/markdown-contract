/**
 * The JSON API — D-0012 §D3's route table as a `Bun.serve` routes object, thin
 * over the library: every handler is parse-request → registry/store/run call →
 * typed envelope from `types/api.ts`. No engine logic lives here.
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
  RegisterVaultRequest,
  RegisterVaultResponse,
  RemoveVaultResponse,
  SaveConfigFileRequest,
  SaveConfigFileResponse,
  SaveVaultConfigRequest,
  SaveVaultConfigResponse,
  ValidateResponse,
  VaultConfigResponse,
  VaultDetailResponse,
  VaultListResponse,
  WatchRequest,
  WatchResponse,
} from "../../types/api";
import { ConfigError, listConfigFiles, readConfig, saveConfig, saveConfigFile } from "./config";
import type { DaemonContext } from "./daemon";
import { RegistryError } from "./registry";
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

function fail(req: Request, status: number, error: string): Response {
  return json(req, { error } satisfies ApiError, status);
}

/** Map a thrown run/registry/config error to its HTTP shape (400 caller, 409 state, 500 bug). */
function failFrom(req: Request, err: unknown): Response {
  if (err instanceof RegistryError) return fail(req, 400, err.message);
  if (err instanceof ConfigError) return fail(req, 400, err.message);
  if (err instanceof RunError) return fail(req, 409, err.message);
  return fail(req, 500, (err as Error).message ?? "internal error");
}

type IdRequest = BunRequest<"/api/vaults/:id">;

/** The full route table `Bun.serve` mounts; `fetch` handles everything not listed here. */
export function buildRoutes(ctx: DaemonContext) {
  return {
    "/api/health": {
      GET: (req: Request) =>
        json(req, {
          ok: true,
          version: ctx.version,
          pid: process.pid,
          registryPath: ctx.registry.path,
        } satisfies HealthResponse),
    },

    "/api/events": {
      GET: (req: Request) => {
        const res = ctx.hub.handler(req);
        for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
        return res;
      },
    },

    "/api/vaults": {
      GET: (req: Request) =>
        json(req, { vaults: ctx.store.snapshot(ctx.registry.list()) } satisfies VaultListResponse),

      POST: async (req: Request) => {
        let body: RegisterVaultRequest;
        try {
          body = (await req.json()) as RegisterVaultRequest;
        } catch {
          return fail(req, 400, "body must be JSON: { name, path, configPath? }");
        }
        try {
          const entry = ctx.registry.add(body);
          const vault = ctx.store.markRunning(entry);
          ctx.armWatch(entry);
          queueMicrotask(() => void ctx.revalidate(entry).catch(() => {}));
          return json(req, { vault } satisfies RegisterVaultResponse, 201);
        } catch (err) {
          return failFrom(req, err);
        }
      },
    },

    "/api/vaults/:id": {
      GET: (req: IdRequest) => {
        const entry = ctx.registry.get(req.params.id);
        if (!entry) return fail(req, 404, `unknown vault: ${req.params.id}`);
        return json(req, { vault: ctx.store.statusOf(entry) } satisfies VaultDetailResponse);
      },

      DELETE: (req: IdRequest) => {
        const id = req.params.id;
        if (!ctx.registry.remove(id)) return fail(req, 404, `unknown vault: ${id}`);
        ctx.disarmWatch(id);
        ctx.store.drop(id);
        return json(req, { ok: true, id } satisfies RemoveVaultResponse);
      },
    },

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
        // A real (non-dry) successful scaffold changes the vault's world — re-run it.
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
          // The config changed the vault's world — same choreography as registration:
          // answer with the running status, re-validate in the background.
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
          // A contract file changed the vault's world — same choreography as the
          // config PUT: answer with the running status, re-validate in the background.
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
