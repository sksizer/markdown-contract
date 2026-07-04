/**
 * The daemon's HTTP server — a loopback-only `Bun.serve` fronting the JSON API
 * (`./routes.ts`) and the embedded SPA (`./static.ts`).
 *
 * Loopback-only by design (D-0012 §D1; localhost single-user, no auth): the
 * bind is hard-coded to `127.0.0.1` — a non-loopback bind is simply not
 * offered, because the loopback boundary is what makes the no-auth,
 * any-readable-path API surface (`./routes.ts`) safe. Foreground-only: the
 * returned server keeps the process alive until Ctrl-C.
 *
 * Bun-only: this file (and `Bun.serve` / `Bun.file`) live ONLY in the example;
 * nothing in `packages/core` imports it. It is the server half of the
 * `bun build --compile` target (`../bin.ts`).
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { handleApi, type RouteContext } from "./routes";
import { serveStatic } from "./static";

/** Default port. 4320 — distinct from apps/web's 4319 so both daemons can run side by side. */
export const DEFAULT_PORT = 4320;

/** The minimal page served at `/` when the daemon runs without a built UI. */
const NO_UI_PAGE = `<!doctype html><meta charset="utf-8"><title>markdown-contract daemon</title>
<body style="font-family: system-ui; max-width: 40rem; margin: 4rem auto; line-height: 1.5">
<h1>markdown-contract daemon</h1>
<p>The daemon is running, but no UI build is embedded or on disk.</p>
<p>The JSON API is live — try <a href="/api/health"><code>/api/health</code></a> or
<code>POST /api/validate</code>.</p>
<p>To get the UI: <code>bun run ui:generate</code> in <code>examples/single-binary</code>, then restart.</p>`;

/** Options for {@link serve}. */
export interface ServeOptions {
  /** Port to bind; default {@link DEFAULT_PORT}. `0` = an ephemeral port. */
  port?: number;
  /** Base dir relative vault paths resolve against; default `process.cwd()`. */
  root?: string;
  /** Open the served URL in the default browser after binding. */
  open?: boolean;
}

/**
 * Boot the loopback daemon and return the running `Bun.serve` handle. The
 * returned server keeps the process alive on its own — the caller need not
 * await anything.
 */
export function serve(opts: ServeOptions = {}): ReturnType<typeof Bun.serve> {
  const ctx: RouteContext = { root: resolve(opts.root ?? process.cwd()) };

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: opts.port ?? DEFAULT_PORT,
    async fetch(req) {
      const api = await handleApi(req, ctx);
      if (api) return api;
      if (req.method !== "GET" && req.method !== "HEAD") {
        return new Response("method not allowed", { status: 405 });
      }
      const { pathname } = new URL(req.url);
      const hit = serveStatic(pathname);
      if (hit) return hit;
      if (pathname === "/" || !/\.[a-z0-9]+$/i.test(pathname)) {
        return new Response(NO_UI_PAGE, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });

  if (opts.open) openBrowser(`http://127.0.0.1:${server.port}/`);
  return server;
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
