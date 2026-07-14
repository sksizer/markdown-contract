/**
 * The daemon — the binary's second face (D-0012 §D3): a loopback-only
 * `Bun.serve` hosting the JSON API (`./api.ts`) and the embedded SPA
 * (`./static.ts`), with the registry/status/watch loop wired together:
 *
 *   registry (durable intent) ──▶ runs (runCorpus) ──▶ status store (in-memory)
 *        ▲                                                   │
 *        │ REST mutations                                    ▼ SSE push
 *   file watcher ──debounced change──▶ revalidate ──▶ every connected browser
 *
 * Foreground-only, `127.0.0.1` hard-coded (non-loopback binds are simply not
 * offered), no auth — single-user localhost per D-0012's scope.
 */
import { VERSION } from "markdown-contract";

import type { RunResult, VaultRegistryEntry } from "../../types/api";
import type { OpenerPreference, ScanRun } from "../../types/ontogen";
import { buildRoutes, corsHeaders } from "./api";
import { MemStore } from "./memstore";
import { Registry } from "./registry";
import { validateVault } from "./runs";
import { ScanStore } from "./scans";
import { SseHub } from "./sse";
import { hasUi, serveStatic } from "./static";
import { StatusStore } from "./status";
import { VaultWatcher } from "./watcher";

/** Default port per T-DAEM's sketch. */
export const DEFAULT_PORT = 4319;

export interface DaemonOptions {
  port?: number;
  /** open the dashboard in the default browser once listening */
  open?: boolean;
  /** override the registry file (tests, throwaway demos) */
  registryPath?: string;
  /** master switch for file-watching (per-vault toggles sit under it) */
  watch?: boolean;
}

/** Everything the route handlers need — one object, threaded, no globals. */
export interface DaemonContext {
  registry: Registry;
  store: StatusStore;
  hub: SseHub;
  watcher: VaultWatcher;
  /** ontogen scan-run + finding-record history (the transport's scan-runs/finding-records) */
  scans: ScanStore;
  /** ontogen opener-preferences collection (desktop preference rows, editable over HTTP) */
  openerPrefs: MemStore<OpenerPreference>;
  version: string;
  /** run a vault now, updating the store and pushing SSE along the way */
  revalidate(entry: VaultRegistryEntry): Promise<RunResult>;
  /**
   * Scan a vault now and RECORD the outcome as an ontogen `ScanRun` (+ its
   * finding records), returning the finalized run. Also refreshes the live
   * status + SSE from the same run, so the legacy dashboard stays fresh. A run
   * that fails (e.g. no config) is recorded as an `error` ScanRun rather than
   * thrown — the transport's `scanNow` always resolves to a run.
   */
  scanNow(entry: VaultRegistryEntry, trigger: string): ScanRun;
  /** start (or restart) the vault's file watch, honoring the master switch */
  armWatch(entry: VaultRegistryEntry): void;
  disarmWatch(id: string): void;
}

/** The minimal page served at `/` when the daemon runs without a built UI. */
const NO_UI_PAGE = `<!doctype html><meta charset="utf-8"><title>markdown-contract daemon</title>
<body style="font-family: system-ui; max-width: 40rem; margin: 4rem auto; line-height: 1.5">
<h1>markdown-contract daemon</h1>
<p>The daemon is running, but no UI build is embedded or on disk.</p>
<p>The JSON API is live — try <a href="/api/health"><code>/api/health</code></a> or
<a href="/api/vaults"><code>/api/vaults</code></a>.</p>
<p>To get the dashboard: <code>bun run ui:generate</code> in <code>apps/web</code>, then restart.</p>`;

/** Best-effort platform browser-open (never throws; failing to open is cosmetic). */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn({ cmd, stdout: "ignore", stderr: "ignore" });
  } catch {
    // no browser available (SSH, CI) — the printed URL is the affordance
  }
}

/**
 * Boot the daemon: load the registry, arm watches, kick a first validation of
 * every vault (async — listening starts immediately), and serve. Returns the
 * server plus a `stop()` for tests.
 */
export function startDaemon(opts: DaemonOptions = {}) {
  const registry = new Registry(opts.registryPath);
  const store = new StatusStore();
  const hub = new SseHub();
  const watcher = new VaultWatcher();
  const scans = new ScanStore();
  const openerPrefs = new MemStore<OpenerPreference>();
  const watchEnabled = opts.watch !== false;

  async function revalidate(entry: VaultRegistryEntry): Promise<RunResult> {
    store.markRunning(entry);
    hub.emit({ type: "status", vaultId: entry.id, state: "running" });
    try {
      const result = validateVault(entry);
      const status = store.markValidated(entry, result);
      hub.emit({ type: "validated", vaultId: entry.id, result });
      hub.emit({ type: "status", vaultId: entry.id, state: status.state });
      return result;
    } catch (err) {
      const message = (err as Error).message;
      store.markError(entry, message);
      hub.emit({ type: "error", vaultId: entry.id, message });
      hub.emit({ type: "status", vaultId: entry.id, state: "error" });
      throw err;
    }
  }

  /**
   * One corpus run feeding both worlds: it refreshes the live status + SSE and
   * records an ontogen `ScanRun` (+ finding records) from the SAME run. A run
   * that throws is recorded as an `error` ScanRun instead of propagating, so the
   * transport's `scanNow` always resolves to a run.
   */
  function scanNow(entry: VaultRegistryEntry, trigger: string): ScanRun {
    store.markRunning(entry);
    hub.emit({ type: "status", vaultId: entry.id, state: "running" });
    try {
      const result = validateVault(entry);
      const status = store.markValidated(entry, result);
      hub.emit({ type: "validated", vaultId: entry.id, result });
      hub.emit({ type: "status", vaultId: entry.id, state: status.state });
      return scans.ingest(entry.id, trigger, result.findings);
    } catch (err) {
      const message = (err as Error).message;
      store.markError(entry, message);
      hub.emit({ type: "error", vaultId: entry.id, message });
      hub.emit({ type: "status", vaultId: entry.id, state: "error" });
      return scans.ingest(entry.id, trigger, [], message);
    }
  }

  const ctx: DaemonContext = {
    registry,
    store,
    hub,
    watcher,
    scans,
    openerPrefs,
    version: VERSION,
    revalidate,
    scanNow,
    armWatch(entry) {
      if (!watchEnabled || entry.watch === false) return;
      watcher.start(entry.id, entry.path, () => void revalidate(entry).catch(() => {}));
    },
    disarmWatch(id) {
      watcher.stop(id);
    },
  };

  const server = Bun.serve({
    port: opts.port ?? DEFAULT_PORT,
    hostname: "127.0.0.1",
    // 0 disables Bun's 10s idle kill — SSE connections are quiet by design
    // (the hub's 15s heartbeat keeps intermediaries happy).
    idleTimeout: 0,
    routes: buildRoutes(ctx),
    fetch(req) {
      const url = new URL(req.url);
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(req) });
      }
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: `no route: ${req.method} ${url.pathname}` }), {
          status: 404,
          headers: { "content-type": "application/json", ...corsHeaders(req) },
        });
      }
      if (req.method === "GET" || req.method === "HEAD") {
        const hit = serveStatic(url.pathname);
        if (hit) return hit;
        if (url.pathname === "/" || !/\.[a-z0-9]+$/i.test(url.pathname)) {
          return new Response(NO_UI_PAGE, { headers: { "content-type": "text/html" } });
        }
      }
      return new Response("not found", { status: 404 });
    },
  });

  // First light: arm watches and validate every registered vault without
  // blocking the listen (the UI sees `running` rows resolve as runs land).
  for (const entry of registry.list()) {
    ctx.armWatch(entry);
    queueMicrotask(() => void revalidate(entry).catch(() => {}));
  }

  const url = `http://127.0.0.1:${server.port}`;
  console.log(`markdown-contract daemon listening on ${url}`);
  console.log(`  registry  ${registry.path} (${registry.list().length} vault(s))`);
  console.log(`  ui        ${hasUi() ? `${url}/` : "not built (API only)"}`);
  console.log(`  watching  ${watchEnabled ? "enabled" : "disabled (--no-watch)"}`);
  if (opts.open) openBrowser(url);

  return {
    server,
    stop(): void {
      watcher.stopAll();
      void server.stop(true);
    },
  };
}
