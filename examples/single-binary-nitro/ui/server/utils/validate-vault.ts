/**
 * The daemon's validate logic — everything `POST /api/validate` does, as a
 * plain function with no framework types, so it carries a peer unit test that
 * runs under `bun test` without ever building the Nuxt app. The h3 route
 * (`../api/validate.post.ts`) is a thin adapter over {@link validateVault}.
 *
 * Ported from the peer example's `src/daemon/routes.ts` (T-DAEM shape): the
 * SAME wire contract, the SAME config resolution — a faithful replica of the
 * CLI's (`packages/core/src/cli/run.ts` — `loadConfig`), so the JSON the API
 * returns does not drift from what `markdown-contract validate` prints.
 *
 * Trust model (D-0012 §D1): the loopback-only bind IS the security boundary.
 * The daemon runs as — and has exactly the authority of — the local user, the
 * same as the CLI face, so a submitted `path` may name any tree that user can
 * read (absolute, or relative to the daemon's working directory). There is no
 * auth and no path jail, and there must be no non-loopback bind to compensate.
 *
 * One-way layering: this module imports the published library
 * (`markdown-contract`, `markdown-contract/declarative`) and nothing from
 * `apps/web`; `packages/core` imports nothing from here.
 */
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { type CorpusConfig, runCorpus } from "markdown-contract";
import { loadConfigFile } from "markdown-contract/declarative";

import type { ApiError, ValidateResponse } from "../../../types/api";

/** The config filenames the CLI auto-discovers, mirrored verbatim from `cli/run.ts`. */
const DEFAULT_CONFIG_NAMES = [
  "markdown-contract.config.js",
  "markdown-contract.config.mjs",
  "markdown-contract.config.yaml",
  "markdown-contract.config.yml",
  "markdown-contract.yaml",
  "markdown-contract.yml",
];

/** What {@link validateVault} hands back for the route to emit: HTTP status + JSON body. */
export interface ValidateOutcome {
  status: number;
  body: ValidateResponse | ApiError;
}

/**
 * Run `POST /api/validate` semantics over an already-parsed request body:
 * validate the envelope, resolve the vault and its config, run the corpus
 * in-process, and map every failure mode to the CLI's usage-error `2` at
 * HTTP 400 — exactly the peer example's behavior.
 *
 * `path` is treated as BOTH the run root and the config-discovery base —
 * matching `cd <path> && markdown-contract validate`. `config` (optional) is
 * the explicit config file, resolved relative to the vault, mirroring the
 * CLI's `--config`. `root` is the base dir relative paths resolve against
 * (the daemon's cwd).
 */
export async function validateVault(body: unknown, root: string): Promise<ValidateOutcome> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return usageError("request body must be JSON");
  }

  const rawPath = (body as { path?: unknown }).path;
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return usageError("`path` is required (a string)");
  }
  const configFlag = (body as { config?: unknown }).config;
  if (configFlag !== undefined && typeof configFlag !== "string") {
    return usageError("`config`, if given, must be a string path");
  }

  let runRoot: string;
  try {
    runRoot = resolveVaultPath(rawPath, root);
  } catch (err) {
    return usageError((err as Error).message);
  }
  if (!existsSync(runRoot)) {
    return usageError(`path not found: ${rawPath}`);
  }

  let config: CorpusConfig;
  try {
    config = await resolveConfig(runRoot, configFlag);
  } catch (err) {
    return usageError((err as Error).message);
  }

  let result: ReturnType<typeof runCorpus>;
  try {
    result = runCorpus(config, { cwd: runRoot });
  } catch (err) {
    return usageError((err as Error).message);
  }

  return {
    status: 200,
    body: {
      findings: result.findings,
      stats: result.stats,
      exitCode: result.exitCode,
    },
  };
}

/**
 * Resolve a submitted vault path: absolute paths pass through, relative paths
 * resolve against `root` (the daemon's cwd). NUL bytes are rejected; nothing
 * else is — per the loopback trust model above, the requester IS the local
 * user, so any tree that user can read is fair game (exactly like the CLI).
 */
export function resolveVaultPath(rawPath: string, root: string): string {
  if (rawPath.includes("\0")) {
    throw new Error("invalid path");
  }
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(root, rawPath);
}

/**
 * Resolve a `CorpusConfig` for a run root, a faithful replica of `cli/run.ts`'s
 * private `loadConfig` (CLI parity — do not diverge). With an explicit
 * `configFlag`, that path (resolved against the vault) is used; otherwise the
 * default config names are probed in the vault. YAML compiles via
 * `loadConfigFile`; `.js`/`.mjs` load via dynamic import of their `default`
 * export. A missing config, an unsupported extension, or a module without a
 * `CorpusConfig` default each throw (the caller maps the throw to a `2`).
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
    throw new Error(
      `config ${configPath} must \`export default\` a CorpusConfig ({ rules: [...] })`,
    );
  }
  return config as CorpusConfig;
}

/** A uniform usage-error outcome: `{ error, exitCode: 2 }` at HTTP 400 (the CLI's `2`). */
function usageError(error: string): ValidateOutcome {
  return { status: 400, body: { error, exitCode: 2 } };
}
