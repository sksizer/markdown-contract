/**
 * The vault config files — read/validate/write a vault's `markdown-contract.yaml`
 * AND the `*.contract.yaml` files it references, on behalf of the dashboard's
 * config editor. These are the ONLY vault files the daemon may write; C-0010
 * still holds for the documents themselves (the daemon reads vault docs, it
 * never edits them).
 *
 * Validation goes through the engine's own parsers (`loadConfig` for the router
 * config, `loadContract` for a referenced contract — the same compile
 * `loadConfigFile`/`runCorpus` sit on), so a save can never land a file the
 * engine would reject. Discovery (`listConfigFiles`) deliberately does NOT use
 * `loadConfig`: it parses the router with the plain `yaml` package so it can
 * list referenced files even when some are missing or broken.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

import { loadConfig, loadContract } from "markdown-contract/declarative";
import { parse as parseYaml } from "yaml";

import type {
  ConfigFileEntry,
  ConfigFilesResponse,
  VaultConfigResponse,
  VaultRegistryEntry,
} from "../../types/api";

/** A config/contract save the engine's parser rejects (maps to HTTP 400). */
export class ConfigError extends Error {}

/**
 * The engine's verdict on `raw` as a config: null when it compiles, else the
 * parser's message. Contract refs resolve relative to the config file's
 * directory, exactly as `loadConfigFile` resolves them.
 */
function parseVerdict(raw: string, configPath: string): string | null {
  try {
    loadConfig(raw, dirname(configPath));
    return null;
  } catch (err) {
    return (err as Error).message ?? String(err);
  }
}

/**
 * The engine's verdict on `raw` as a standalone contract document: null when it
 * compiles, else the parser's (`DeclarativeError`) message.
 */
function contractVerdict(raw: string): string | null {
  try {
    loadContract(raw);
    return null;
  } catch (err) {
    return (err as Error).message ?? String(err);
  }
}

/** Write `raw` verbatim and atomically (tmp + rename, as `Registry.save()` does). */
function writeAtomic(path: string, raw: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, raw, "utf8");
  renameSync(tmp, path);
}

/**
 * Read the vault's config file verbatim. A missing file is not an error (the
 * init flow covers scaffolding); a broken on-disk file reports its parse
 * verdict rather than throwing.
 */
export function readConfig(entry: VaultRegistryEntry): VaultConfigResponse {
  if (!existsSync(entry.configPath)) return { exists: false, raw: "", parseError: null };
  const raw = readFileSync(entry.configPath, "utf8");
  return { exists: true, raw, parseError: parseVerdict(raw, entry.configPath) };
}

/**
 * Replace the config file's contents. Validates FIRST — throws `ConfigError`
 * with the engine's message when `raw` doesn't compile — then writes the bytes
 * verbatim and atomically: no reformatting, no newline normalization, no
 * half-written file on a crash.
 */
export function saveConfig(entry: VaultRegistryEntry, raw: string): void {
  const verdict = parseVerdict(raw, entry.configPath);
  if (verdict !== null) throw new ConfigError(verdict);
  writeAtomic(entry.configPath, raw);
}

// ── referenced contract files (the /config/files pair) ─────────────────────────

/** Does this string ref look like a contract FILE path (vs a named/inline ref)? */
function isYamlPath(ref: string): boolean {
  const lower = ref.toLowerCase();
  return lower.endsWith(".yaml") || lower.endsWith(".yml");
}

/** The `contracts:` name→path map's file refs (its string values) and its keys. */
function contractsMapRefs(contracts: unknown): { refs: string[]; keys: Set<string> } {
  const refs: string[] = [];
  const keys = new Set<string>();
  if (contracts === null || typeof contracts !== "object" || Array.isArray(contracts)) {
    return { refs, keys };
  }
  for (const [key, value] of Object.entries(contracts as Record<string, unknown>)) {
    keys.add(key);
    if (typeof value === "string") refs.push(value);
  }
  return { refs, keys };
}

/** Direct `rules[].contract` file refs: yaml-suffixed strings that are NOT map keys. */
function ruleContractRefs(rules: unknown, contractKeys: Set<string>): string[] {
  if (!Array.isArray(rules)) return [];
  const refs: string[] = [];
  for (const rule of rules) {
    if (rule === null || typeof rule !== "object") continue;
    const contract = (rule as { contract?: unknown }).contract;
    if (typeof contract === "string" && isYamlPath(contract) && !contractKeys.has(contract)) {
      refs.push(contract);
    }
  }
  return refs;
}

/**
 * Every contract-file path a parsed router doc references: all string values of
 * the `contracts:` name→path map, plus every string `rules[].contract` ref that
 * ends in .yaml/.yml and is NOT a key of the contracts map (a key names a map
 * entry; a yaml-suffixed non-key is a direct file ref). Best-effort over an
 * untyped YAML doc — discovery must tolerate shapes `loadConfig` would reject.
 */
function referencedContracts(doc: unknown): string[] {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return [];
  const d = doc as { contracts?: unknown; rules?: unknown };
  const { refs, keys } = contractsMapRefs(d.contracts);
  return [...refs, ...ruleContractRefs(d.rules, keys)];
}

/** True when `resolved` sits inside the vault root (never the root itself). */
function insideVault(entry: VaultRegistryEntry, resolved: string): boolean {
  const rel = relative(resolve(entry.path), resolved);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * The vault's editable contract files: the router config first (always), then
 * every contract file it references, deduped, each read verbatim with its
 * per-kind parse verdict. Referenced paths resolve relative to the config
 * file's directory; refs that escape the vault root are silently dropped. A
 * missing or YAML-broken router yields just the router entry (its `parseError`
 * carries the verdict) — discovery never throws over a bad file.
 */
export function listConfigFiles(entry: VaultRegistryEntry): ConfigFilesResponse {
  const router = readConfig(entry);
  const files: ConfigFileEntry[] = [
    {
      relPath: basename(entry.configPath),
      kind: "config",
      exists: router.exists,
      raw: router.raw,
      parseError: router.parseError,
    },
  ];
  if (!router.exists) return { files };

  let doc: unknown;
  try {
    doc = parseYaml(router.raw);
  } catch {
    return { files }; // not YAML at all — the router entry's parseError already says so
  }

  const baseDir = dirname(entry.configPath);
  const routerPath = resolve(entry.configPath);
  const seen = new Set<string>();
  for (const ref of referencedContracts(doc)) {
    const resolved = resolve(baseDir, ref);
    if (resolved === routerPath || seen.has(resolved)) continue;
    seen.add(resolved);
    if (!insideVault(entry, resolved)) continue;
    const exists = existsSync(resolved);
    const raw = exists ? readFileSync(resolved, "utf8") : "";
    files.push({
      relPath: relative(baseDir, resolved),
      kind: "contract",
      exists,
      raw,
      parseError: exists ? contractVerdict(raw) : null,
    });
  }

  return { files };
}

/**
 * Replace ONE contract-config file's contents by `relPath` (relative to the
 * config file's directory). Throws `ConfigError` (HTTP 400) when `relPath` is
 * absolute, escapes the vault root, or doesn't end in .yaml/.yml. The router
 * itself validates as a config (`loadConfig`); anything else validates as a
 * standalone contract (`loadContract`) and MAY be created if it doesn't exist
 * yet. Bytes land verbatim and atomically, as `saveConfig` does.
 */
export function saveConfigFile(entry: VaultRegistryEntry, relPath: string, raw: string): void {
  if (isAbsolute(relPath)) throw new ConfigError(`relPath must be relative: ${relPath}`);
  if (!isYamlPath(relPath)) throw new ConfigError(`relPath must end in .yaml or .yml: ${relPath}`);

  const resolved = resolve(dirname(entry.configPath), relPath);
  if (resolved === resolve(entry.configPath)) {
    saveConfig(entry, raw); // the router itself — engine-validate as a config
    return;
  }

  if (!insideVault(entry, resolved)) {
    throw new ConfigError(`relPath escapes the vault root: ${relPath}`);
  }
  const verdict = contractVerdict(raw);
  if (verdict !== null) throw new ConfigError(verdict);
  writeAtomic(resolved, raw);
}
