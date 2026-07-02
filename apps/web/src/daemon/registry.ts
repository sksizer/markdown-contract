/**
 * The vault registry — layer 1 of D-0012 §D4's three-layer model: durable
 * *intent* (which vaults, which config), a human-editable versioned JSON file
 * under the OS config dir. The daemon reads and writes THIS file only; it never
 * edits the vault documents themselves (C-0010).
 *
 * Live status (layer 2) is deliberately NOT here — see `./status.ts`; history
 * (layer 3, SQLite) is deferred entirely.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import type { RegisterVaultRequest, VaultRegistryEntry } from "../../types/api";

/** The on-disk shape — versioned from the first release (D-0012 open question, resolved: yes). */
interface RegistryFile {
  version: 1;
  vaults: VaultRegistryEntry[];
}

/**
 * The platform-conventional registry file path (D-0012 §D4):
 *   darwin  → ~/Library/Application Support/markdown-contract/vaults.json
 *   linux   → $XDG_CONFIG_HOME/markdown-contract/vaults.json (~/.config fallback)
 *   win32   → %APPDATA%\markdown-contract\vaults.json
 */
export function defaultRegistryPath(): string {
  const home = homedir();
  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", "markdown-contract", "vaults.json");
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    return join(process.env.APPDATA, "markdown-contract", "vaults.json");
  }
  const configHome = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(configHome, "markdown-contract", "vaults.json");
}

/** Slugify a vault name into an id stem, e.g. "My Docs" → "vault-my-docs". */
export function slugId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `vault-${slug === "" ? "untitled" : slug}`;
}

/** A registration rejected for a caller-fixable reason (maps to HTTP 400). */
export class RegistryError extends Error {}

/**
 * Expand a leading `~` to the home directory. Paths arrive from the web form,
 * not a shell, so nothing has expanded `~` for the user — without this,
 * `~/docs` would resolve relative to the daemon's cwd.
 */
function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/**
 * The registry: loads the versioned file once, mutates in memory, and persists
 * every mutation atomically (tmp + rename) so a crash never half-writes the file.
 * A missing file is an empty registry; the file is created on first save.
 */
export class Registry {
  readonly path: string;
  private vaults: VaultRegistryEntry[] = [];

  constructor(path?: string) {
    this.path = resolve(path ?? defaultRegistryPath());
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    const raw = JSON.parse(readFileSync(this.path, "utf8")) as RegistryFile;
    if (raw.version !== 1 || !Array.isArray(raw.vaults)) {
      throw new Error(
        `unsupported registry file at ${this.path} (expected { version: 1, vaults: [] })`,
      );
    }
    this.vaults = raw.vaults;
  }

  private save(): void {
    const file: RegistryFile = { version: 1, vaults: this.vaults };
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    renameSync(tmp, this.path);
  }

  list(): VaultRegistryEntry[] {
    return [...this.vaults];
  }

  get(id: string): VaultRegistryEntry | undefined {
    return this.vaults.find((v) => v.id === id);
  }

  /**
   * Register a vault. The path is untrusted input (D-0012): `~` is expanded,
   * then it is resolved to an absolute path and must be an existing directory. `configPath` defaults to
   * `<path>/markdown-contract.yaml` and may not exist yet (the init flow covers
   * that). Ids are slugs of the name, suffixed `-2`, `-3`… on collision.
   */
  add(req: RegisterVaultRequest): VaultRegistryEntry {
    if (typeof req.name !== "string" || req.name.trim() === "") {
      throw new RegistryError("a vault needs a non-empty name");
    }
    if (typeof req.path !== "string" || req.path.trim() === "") {
      throw new RegistryError("a vault needs a path");
    }
    const path = resolve(expandTilde(req.path.trim()));
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      throw new RegistryError(`vault path is not an existing directory: ${path}`);
    }
    if (this.vaults.some((v) => v.path === path)) {
      throw new RegistryError(`a vault is already registered at ${path}`);
    }
    const stem = slugId(req.name);
    let id = stem;
    for (let n = 2; this.vaults.some((v) => v.id === id); n += 1) id = `${stem}-${n}`;
    const entry: VaultRegistryEntry = {
      id,
      name: req.name.trim(),
      path,
      configPath: req.configPath
        ? resolve(expandTilde(req.configPath.trim()))
        : join(path, "markdown-contract.yaml"),
      watch: true,
    };
    this.vaults.push(entry);
    this.save();
    return entry;
  }

  /** Unregister a vault (the files on disk are untouched). Returns false when unknown. */
  remove(id: string): boolean {
    const before = this.vaults.length;
    this.vaults = this.vaults.filter((v) => v.id !== id);
    if (this.vaults.length === before) return false;
    this.save();
    return true;
  }

  /** Persist a watch-toggle (part of durable intent, so it survives restarts). */
  setWatch(id: string, watching: boolean): VaultRegistryEntry | undefined {
    const entry = this.vaults.find((v) => v.id === id);
    if (!entry) return undefined;
    entry.watch = watching;
    this.save();
    return entry;
  }
}
