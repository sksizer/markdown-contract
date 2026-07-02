/**
 * The daemon's JSON API — the thin HTTP face over the library. `handleApi` is the
 * router the server's `fetch` calls first: it owns the `/api/*` surface and returns
 * `null` for anything else (so the server can fall through to static assets).
 *
 * Two routes in the prototype (T-DAEM):
 *  - `GET  /api/health`   → `{ ok: true, version }`.
 *  - `POST /api/validate` → run the corpus over a submitted vault and return
 *    `{ findings, stats, exitCode }` — the SAME data `markdown-contract validate <path>`
 *    produces (AC-2 parity). The config resolution below is a faithful replica of the
 *    CLI's (`packages/core/src/cli/run.ts` — `loadConfig`), so the JSON does not drift
 *    from the CLI.
 *
 * The submitted `path` is UNTRUSTED: it is resolved against the server root and any
 * traversal that escapes that root is rejected (`resolveVaultPath`).
 *
 * One-way layering (D-0012 §D1): this module imports the published library
 * (`markdown-contract`, `markdown-contract/declarative`); `packages/core` imports
 * nothing from here.
 */
import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { VERSION, type CorpusConfig, runCorpus } from "markdown-contract";
import { loadConfigFile } from "markdown-contract/declarative";

/** What the router needs from the server: the root untrusted vault paths resolve within. */
export interface RouteContext {
  /** Absolute base dir; a submitted `path` must resolve inside it (traversal jail). */
  root: string;
}

/** The config filenames the CLI auto-discovers, mirrored verbatim from `cli/run.ts` (AC-2). */
const DEFAULT_CONFIG_NAMES = [
  "markdown-contract.config.js",
  "markdown-contract.config.mjs",
  "markdown-contract.config.yaml",
  "markdown-contract.config.yml",
  "markdown-contract.yaml",
  "markdown-contract.yml",
];

/**
 * Route an `/api/*` request. Returns a `Response` for a handled API route, or `null`
 * when the path is not an API route (the server then serves static assets). Unknown
 * `/api/*` paths and wrong methods return a JSON error rather than falling through.
 */
export async function handleApi(req: Request, ctx: RouteContext): Promise<Response | null> {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith("/api/")) return null;

  if (pathname === "/api/health") {
    if (req.method !== "GET") return jsonError(405, "method not allowed", 2);
    return handleHealth();
  }

  if (pathname === "/api/validate") {
    if (req.method !== "POST") return jsonError(405, "method not allowed", 2);
    return handleValidate(req, ctx);
  }

  return jsonError(404, `no such route: ${pathname}`, 2);
}

/** `GET /api/health` → `{ ok: true, version }`. */
export function handleHealth(): Response {
  return Response.json({ ok: true, version: VERSION });
}

/**
 * `POST /api/validate` `{ path, config? }` → `{ findings, stats, exitCode }`.
 *
 * `path` (untrusted) is resolved within the server root and treated as BOTH the run
 * root and the config-discovery base — matching `cd <path> && markdown-contract validate`
 * (config discovery + run root coincide there, exactly as here). `config` (optional) is
 * the explicit config file, resolved relative to the vault, mirroring the CLI's `--config`.
 * Config / usage errors return HTTP 400 with `{ error, exitCode: 2 }` — the CLI's `2`.
 */
export async function handleValidate(req: Request, ctx: RouteContext): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "request body must be JSON", 2);
  }

  const rawPath = (body as { path?: unknown } | null)?.path;
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return jsonError(400, "`path` is required (a string)", 2);
  }
  const configFlag = (body as { config?: unknown }).config;
  if (configFlag !== undefined && typeof configFlag !== "string") {
    return jsonError(400, "`config`, if given, must be a string path", 2);
  }

  let runRoot: string;
  try {
    runRoot = resolveVaultPath(rawPath, ctx.root);
  } catch (err) {
    return jsonError(400, (err as Error).message, 2);
  }
  if (!existsSync(runRoot)) {
    return jsonError(400, `path not found: ${rawPath}`, 2);
  }

  let config: CorpusConfig;
  try {
    config = await resolveConfig(runRoot, configFlag);
  } catch (err) {
    return jsonError(400, (err as Error).message, 2);
  }

  let result: ReturnType<typeof runCorpus>;
  try {
    result = runCorpus(config, { cwd: runRoot });
  } catch (err) {
    return jsonError(400, (err as Error).message, 2);
  }

  return Response.json({
    findings: result.findings,
    stats: result.stats,
    exitCode: result.exitCode,
  });
}

/**
 * Resolve an untrusted path against the server root, rejecting any escape. A relative
 * path resolves within `root`; an absolute path is accepted only if it still lands
 * inside `root`. Anything that climbs out (`..`) or targets another location throws.
 */
export function resolveVaultPath(rawPath: string, root: string): string {
  if (rawPath.includes("\0")) {
    throw new Error("invalid path");
  }
  const base = resolve(root);
  const abs = isAbsolute(rawPath) ? resolve(rawPath) : resolve(base, rawPath);
  const rel = relative(base, abs);
  // `rel === ""` is the root itself (allowed). A leading `..` segment or an absolute
  // `rel` (different root/drive) means `abs` escapes the jail.
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`path escapes the server root: ${rawPath}`);
  }
  return abs;
}

/**
 * Resolve a `CorpusConfig` for a run root, a faithful replica of `cli/run.ts`'s private
 * `loadConfig` (AC-2 — do not diverge). With an explicit `configFlag`, that path
 * (resolved against the vault) is used; otherwise the default config names are probed in
 * the vault. YAML compiles via `loadConfigFile`; `.js`/`.mjs` load via dynamic import of
 * their `default` export. A missing config, an unsupported extension, or a module without
 * a `CorpusConfig` default each throw (the caller maps the throw to a `2`).
 */
export async function resolveConfig(baseDir: string, configFlag?: string): Promise<CorpusConfig> {
  let configPath: string;
  if (configFlag) {
    configPath = isAbsolute(configFlag) ? configFlag : resolve(baseDir, configFlag);
    if (!existsSync(configPath)) {
      throw new Error(`config not found: ${configFlag}`);
    }
  } else {
    const found = DEFAULT_CONFIG_NAMES.map((n) => resolve(baseDir, n)).find((p) => existsSync(p));
    if (!found) {
      throw new Error(
        `no config found (looked for ${DEFAULT_CONFIG_NAMES.join(", ")}); pass config`,
      );
    }
    configPath = found;
  }

  if (/\.ya?ml$/i.test(configPath)) {
    return loadConfigFile(configPath);
  }

  if (!/\.(?:js|mjs)$/.test(configPath)) {
    throw new Error(
      `unsupported config extension: ${configPath} (only .js/.mjs/.yaml/.yml are supported)`,
    );
  }

  const mod = (await import(pathToFileURL(configPath).href)) as { default?: unknown };
  const config = mod.default;
  if (!config || typeof config !== "object" || !Array.isArray((config as CorpusConfig).rules)) {
    throw new Error(`config ${configPath} must \`export default\` a CorpusConfig ({ rules: [...] })`);
  }
  return config as CorpusConfig;
}

/** A uniform JSON error body: `{ error, exitCode }` at the given HTTP status. */
function jsonError(status: number, error: string, exitCode: number): Response {
  return Response.json({ error, exitCode }, { status });
}
