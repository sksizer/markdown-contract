import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { VaultRegistryEntry } from "../../types/api";
import { ConfigError, listConfigFiles, readConfig, saveConfig, saveConfigFile } from "./config";

/** A config the engine compiles (inline contract, so no contract-file refs needed). */
const VALID = `mcVersion: 2
kind: config
rules:
  - include: ['*.md']
    contract: { body: { order: none, sections: [ { section: Summary } ] } }
`;

/** A config the engine rejects (rules must be a list). */
const INVALID = `mcVersion: 2
kind: config
rules: not-a-list
`;

/** A registered vault in a scratch directory, no config on disk yet. */
function vault(): VaultRegistryEntry {
  const dir = mkdtempSync(join(tmpdir(), "mc-config-"));
  return {
    id: "vault-docs",
    name: "Docs",
    path: dir,
    configPath: join(dir, "markdown-contract.yaml"),
    watch: true,
  };
}

describe("readConfig", () => {
  it("no config on disk yet → { exists: false, raw: '', parseError: null }", () => {
    expect(readConfig(vault())).toEqual({ exists: false, raw: "", parseError: null });
  });

  it("a valid config reads back verbatim with a null parse verdict", () => {
    const entry = vault();
    writeFileSync(entry.configPath, VALID, "utf8");
    expect(readConfig(entry)).toEqual({ exists: true, raw: VALID, parseError: null });
  });

  it("a broken on-disk config still reads verbatim — the verdict carries the parser's message", () => {
    const entry = vault();
    writeFileSync(entry.configPath, INVALID, "utf8");
    const res = readConfig(entry);
    expect(res.exists).toBe(true);
    expect(res.raw).toBe(INVALID);
    expect(res.parseError).toContain("config.rules must be a list");
  });
});

describe("saveConfig", () => {
  it("writes a valid config and readConfig round-trips it", () => {
    const entry = vault();
    saveConfig(entry, VALID);
    expect(readConfig(entry)).toEqual({ exists: true, raw: VALID, parseError: null });
  });

  it("preserves the bytes verbatim — no trailing-newline normalization", () => {
    const entry = vault();
    const noTrailingNewline = VALID.trimEnd();
    saveConfig(entry, noTrailingNewline);
    expect(readFileSync(entry.configPath, "utf8")).toBe(noTrailingNewline);
  });

  it("rejects a config the engine rejects — and leaves the on-disk file untouched", () => {
    const entry = vault();
    writeFileSync(entry.configPath, VALID, "utf8");
    expect(() => saveConfig(entry, INVALID)).toThrow(ConfigError);
    expect(readFileSync(entry.configPath, "utf8")).toBe(VALID);
  });

  it("rejects a contract document handed in as a config, with the engine's message", () => {
    const entry = vault();
    expect(() => saveConfig(entry, "mcVersion: 2\nkind: contract\n")).toThrow(
      /expected a config document/,
    );
  });

  it("writes atomically — no .tmp file left behind", () => {
    const entry = vault();
    saveConfig(entry, VALID);
    expect(existsSync(`${entry.configPath}.tmp`)).toBe(false);
  });
});

// ── the /config/files pair: the router + the contract files it references ──────

/** A router config: one contracts-map ref + one direct rule ref + one named ref. */
const ROUTER = `mcVersion: 2
kind: config
contracts:
  task: contracts/task.contract.yaml
rules:
  - include: ['tasks/*.md']
    contract: task
  - include: ['notes/*.md']
    contract: contracts/note.contract.yaml
`;

/** A standalone contract document the engine compiles. */
const CONTRACT = `mcVersion: 2
kind: contract
body:
  order: none
  sections:
    - section: Summary
`;

/** Write `raw` at `relPath` under the vault root (mkdir as needed). */
function seed(entry: VaultRegistryEntry, relPath: string, raw: string): void {
  const abs = join(dirname(entry.configPath), relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, raw, "utf8");
}

describe("listConfigFiles", () => {
  it("lists the router first, then every referenced contract (contracts map + direct rule refs)", () => {
    const entry = vault();
    writeFileSync(entry.configPath, ROUTER, "utf8");
    seed(entry, "contracts/task.contract.yaml", CONTRACT);
    // contracts/note.contract.yaml deliberately left missing

    const { files } = listConfigFiles(entry);
    expect(files.map((f) => f.relPath)).toEqual([
      "markdown-contract.yaml",
      "contracts/task.contract.yaml",
      "contracts/note.contract.yaml",
    ]);
    expect(files[0]).toMatchObject({ kind: "config", exists: true, raw: ROUTER });
    expect(files[1]).toMatchObject({
      kind: "contract",
      exists: true,
      raw: CONTRACT,
      parseError: null,
    });
    expect(files[2]).toMatchObject({ kind: "contract", exists: false, raw: "", parseError: null });
  });

  it("a referenced contract that doesn't compile carries the engine's message", () => {
    const entry = vault();
    writeFileSync(entry.configPath, ROUTER, "utf8");
    seed(entry, "contracts/task.contract.yaml", "mcVersion: 2\nkind: config\n");

    const { files } = listConfigFiles(entry);
    const task = files.find((f) => f.relPath === "contracts/task.contract.yaml");
    expect(task?.parseError).toContain("expected a contract document");
  });

  it("tolerates a broken router — just the router entry, raw verbatim, verdict attached", () => {
    const entry = vault();
    const broken = "{{ not yaml at all";
    writeFileSync(entry.configPath, broken, "utf8");

    const { files } = listConfigFiles(entry);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ kind: "config", exists: true, raw: broken });
    expect(files[0]?.parseError).not.toBeNull();
  });

  it("no router on disk yet → just the not-yet-existing router entry", () => {
    const { files } = listConfigFiles(vault());
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ kind: "config", exists: false, raw: "", parseError: null });
  });

  it("silently drops a ref that escapes the vault root", () => {
    const entry = vault();
    writeFileSync(
      entry.configPath,
      "mcVersion: 2\nkind: config\ncontracts:\n  evil: ../outside.contract.yaml\n",
      "utf8",
    );

    const { files } = listConfigFiles(entry);
    expect(files).toHaveLength(1);
    expect(files[0]?.kind).toBe("config");
  });
});

describe("saveConfigFile", () => {
  it("round-trips a referenced contract file's bytes verbatim — and can create it", () => {
    const entry = vault();
    writeFileSync(entry.configPath, ROUTER, "utf8");
    const noTrailingNewline = CONTRACT.trimEnd();

    saveConfigFile(entry, "contracts/note.contract.yaml", noTrailingNewline);

    const abs = join(dirname(entry.configPath), "contracts/note.contract.yaml");
    expect(readFileSync(abs, "utf8")).toBe(noTrailingNewline);
    expect(existsSync(`${abs}.tmp`)).toBe(false);
  });

  it("the router's own relPath validates as a CONFIG (not a contract)", () => {
    const entry = vault();
    saveConfigFile(entry, "markdown-contract.yaml", VALID);
    expect(readConfig(entry)).toEqual({ exists: true, raw: VALID, parseError: null });
    // a contract document is NOT a valid config, so the same relPath rejects it
    expect(() => saveConfigFile(entry, "markdown-contract.yaml", CONTRACT)).toThrow(
      /expected a config document/,
    );
  });

  it("rejects a relPath that escapes the vault root", () => {
    const entry = vault();
    expect(() => saveConfigFile(entry, "../outside.contract.yaml", CONTRACT)).toThrow(ConfigError);
    expect(() => saveConfigFile(entry, "../outside.contract.yaml", CONTRACT)).toThrow(
      /escapes the vault root/,
    );
  });

  it("rejects an absolute relPath", () => {
    const entry = vault();
    expect(() => saveConfigFile(entry, "/etc/evil.contract.yaml", CONTRACT)).toThrow(
      /must be relative/,
    );
  });

  it("rejects a non-yaml extension", () => {
    const entry = vault();
    expect(() => saveConfigFile(entry, "contracts/task.json", CONTRACT)).toThrow(
      /must end in \.yaml or \.yml/,
    );
  });

  it("rejects contract YAML the engine rejects, with the parser's message — nothing written", () => {
    const entry = vault();
    const relPath = "contracts/task.contract.yaml";
    expect(() => saveConfigFile(entry, relPath, "mcVersion: 2\nkind: config\n")).toThrow(
      /expected a contract document/,
    );
    expect(existsSync(join(dirname(entry.configPath), relPath))).toBe(false);
  });
});
