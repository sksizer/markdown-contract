/**
 * Static SPA serving — the daemon's second face. Resolution order:
 *
 *  1. the embedded manifest (`./assets.gen.ts`, rewritten at build time) — in
 *     the compiled binary these paths point INTO the executable (`Bun.file` on
 *     an embedded path), which is what lets the binary serve the UI from an
 *     empty directory with no external files (T-SPAE);
 *  2. dev fallback: the `nuxt generate` output on disk (`ui/.output/public`),
 *     so `bun run daemon` works straight after a UI build without
 *     regenerating the manifest.
 *
 * Any extension-less GET that misses falls back to `index.html` — the SPA owns
 * client-side routes.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assets } from "./assets.gen";

/** The on-disk `nuxt generate` output, for dev runs without an embed manifest. */
function diskRoot(): string | null {
  try {
    const root = fileURLToPath(new URL("../../ui/.output/public/", import.meta.url));
    return existsSync(root) ? root : null;
  } catch {
    // In the compiled binary import.meta.url is inside the executable — no disk root.
    return null;
  }
}

/** Long-cache fingerprinted build assets; never cache the HTML shell. */
function cacheControl(pathname: string): string {
  return pathname.startsWith("/_nuxt/") ? "public, max-age=31536000, immutable" : "no-cache";
}

function fileResponse(fileRef: string, pathname: string): Response {
  return new Response(Bun.file(fileRef), {
    headers: { "cache-control": cacheControl(pathname) },
  });
}

/** `true` when `pathname` should resolve to the SPA shell on a miss (no file extension). */
function wantsHtml(pathname: string): boolean {
  return pathname === "/" || !/\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Resolve `pathname` against a manifest (pure lookup, the testable core of the
 * embed): the exact asset, that path's `index.html` (Nuxt prerenders routes as
 * directories), or — for extension-less paths — the SPA shell. `null` = miss.
 */
export function lookupAsset(pathname: string, manifest: Record<string, string>): string | null {
  return (
    manifest[pathname] ??
    manifest[`${pathname.replace(/\/$/, "")}/index.html`] ??
    (wantsHtml(pathname) ? manifest["/index.html"] : undefined) ??
    null
  );
}

/**
 * Serve `pathname` from the embedded manifest or the disk build, `null` when
 * the SPA has nothing for it (the server then falls back / 404s).
 */
export function serveStatic(pathname: string): Response | null {
  return Object.keys(assets).length > 0 ? serveEmbedded(pathname) : serveDisk(pathname);
}

/** Resolve from the embedded manifest (compiled binary, or a dev run after gen-assets). */
function serveEmbedded(pathname: string): Response | null {
  const hit = lookupAsset(pathname, assets);
  return hit ? fileResponse(hit, wantsHtml(pathname) ? "/index.html" : pathname) : null;
}

/**
 * Disk fallback (dev) — resolve to an actual FILE: the exact path, that path's
 * index.html, or the SPA shell.
 */
function serveDisk(pathname: string): Response | null {
  const root = diskRoot();
  if (!root) return null;
  const isFile = (p: string): boolean => existsSync(p) && statSync(p).isFile();
  const candidates = [
    join(root, pathname === "/" ? "index.html" : `.${pathname}`),
    join(root, `.${pathname.replace(/\/$/, "")}`, "index.html"),
    ...(wantsHtml(pathname) ? [join(root, "index.html")] : []),
  ];
  const hit = candidates.find(isFile);
  return hit ? fileResponse(hit, hit.endsWith("index.html") ? "/index.html" : pathname) : null;
}

/** True when the daemon has ANY UI to serve (embedded or disk) — for the boot log. */
export function hasUi(): boolean {
  return Object.keys(assets).length > 0 || diskRoot() !== null;
}
