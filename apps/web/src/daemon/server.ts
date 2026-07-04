/**
 * The daemon's HTTP server — a loopback-only `Bun.serve` fronting the JSON API
 * (`./routes.ts`) and, when built, the SPA's static assets.
 *
 * Loopback-only by design (D-0012 §D1; localhost single-user, no auth): `serve` binds
 * `127.0.0.1` by default and REFUSES any non-loopback host (`0.0.0.0`, a LAN address,
 * a hostname) — the refusal is the security boundary, so it is a hard throw, not a warn.
 *
 * Bun-only: this file (and `Bun.serve` / `Bun.file`) live ONLY in `apps/web`; nothing
 * in `packages/core` imports it. It is the `bun build --compile` target's server half
 * ([[T-BMTX-bun-compile-matrix]] adds the compile task).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";

import { handleApi, type RouteContext } from "./routes.js";

/** Default API port (D-0012). Overridable with `--port`; `--port 0` picks an ephemeral one. */
const DEFAULT_PORT = 4319;

/** The only hosts a loopback bind accepts. Everything else is refused. */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

/** The placeholder served for `/` until the SPA is built ([[T-WEBU-nuxt-spa-ui]]). */
const PLACEHOLDER_HTML = `<!doctype html>
<meta charset="utf-8">
<title>markdown-contract daemon</title>
<h1>markdown-contract daemon</h1>
<p>The API is live. The web UI is not built yet — see <code>GET /api/health</code> and <code>POST /api/validate</code>.</p>`;

/** Options for {@link serve}. */
export interface ServeOptions {
  /** Port to bind; default {@link DEFAULT_PORT}. `0` = an ephemeral port. */
  port?: number;
  /** Host to bind; default `127.0.0.1`. A non-loopback host is refused. */
  host?: string;
  /** Base dir untrusted vault paths resolve within (the traversal jail); default `process.cwd()`. */
  root?: string;
  /** Built SPA dir to serve static assets from; default `<root>/apps/web/.output/public`. */
  staticDir?: string;
  /** Open the served URL in a browser after binding. */
  open?: boolean;
}

/** `true` iff `host` is a loopback address the daemon is allowed to bind. */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

/**
 * Boot the loopback daemon and return the running `Bun.serve` handle. Throws before
 * binding if `host` is not loopback (AC-1). The returned server keeps the process alive
 * on its own — the caller need not await anything.
 */
export function serve(opts: ServeOptions = {}): ReturnType<typeof Bun.serve> {
  const host = opts.host ?? "127.0.0.1";
  if (!isLoopbackHost(host)) {
    throw new Error(
      `daemon refuses a non-loopback bind: "${host}" (localhost-only by design — D-0012 §D1)`,
    );
  }

  const root = resolve(opts.root ?? process.cwd());
  const staticDir = resolve(opts.staticDir ?? resolve(root, "apps/web/.output/public"));
  const ctx: RouteContext = { root };

  const server = Bun.serve({
    hostname: host,
    port: opts.port ?? DEFAULT_PORT,
    async fetch(req) {
      const api = await handleApi(req, ctx);
      if (api) return api;
      return serveStatic(req, staticDir);
    },
  });

  if (opts.open) openBrowser(`http://${displayHost(server.hostname)}:${server.port}/`);
  return server;
}

/**
 * Serve a static asset from `staticDir` (the built SPA), with an `index.html` SPA
 * fallback. When the dir does not exist yet (the SPA is out of scope here — T-WEBU),
 * `/` gets a minimal placeholder and every other path a 404. Path traversal out of
 * `staticDir` is refused.
 */
async function serveStatic(req: Request, staticDir: string): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }
  const { pathname } = new URL(req.url);

  if (existsSync(staticDir)) {
    const target = safeJoin(staticDir, decodeURIComponent(pathname));
    if (target && existsSync(target)) {
      return new Response(Bun.file(target));
    }
    const index = join(staticDir, "index.html");
    if (existsSync(index)) return new Response(Bun.file(index));
  }

  if (pathname === "/") {
    return new Response(PLACEHOLDER_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return new Response("not found", { status: 404 });
}

/** Join `rel` under `base`, returning `null` if the result escapes `base` (traversal guard). */
function safeJoin(base: string, rel: string): string | null {
  const target = normalize(join(base, rel === "/" ? "/index.html" : rel));
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}

/**
 * Bracket an IPv6 host for a URL (`::1` → `[::1]`); pass IPv4/hostnames through. Bun's
 * `Server.hostname` is `string | undefined`, so fall back to loopback when absent.
 */
function displayHost(host: string | undefined): string {
  const h = host ?? "127.0.0.1";
  return h.includes(":") ? `[${h}]` : h;
}

/** Best-effort "open this URL in the browser" for `--open`; failures are swallowed. */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    }).unref();
  } catch {
    // Opening a browser is a convenience, never a failure the daemon should surface.
  }
}
