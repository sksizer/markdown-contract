import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";

import { Registry, RegistryError, slugId } from "./registry";

function scratch(): { registryPath: string; vaultDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "mc-registry-"));
  const vaultDir = join(dir, "vault");
  mkdirSync(vaultDir);
  return { registryPath: join(dir, "vaults.json"), vaultDir };
}

describe("slugId", () => {
  it("slugs a human name into a vault id", () => {
    expect(slugId("My Docs")).toBe("vault-my-docs");
  });
  it("falls back for a name with no usable characters", () => {
    expect(slugId("!!!")).toBe("vault-untitled");
  });
});

describe("Registry", () => {
  it("registers a vault: slug id, resolved path, defaulted configPath, watch on", () => {
    const { registryPath, vaultDir } = scratch();
    const registry = new Registry(registryPath);
    const entry = registry.add({ name: "My Docs", path: vaultDir });
    expect(entry).toMatchObject({
      id: "vault-my-docs",
      name: "My Docs",
      path: vaultDir,
      configPath: join(vaultDir, "markdown-contract.yaml"),
      watch: true,
      schedule: null,
    });
    // ontogen `Vault` needs created_at/updated_at — stamped as ISO strings on add.
    expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.updatedAt).toBe(entry.createdAt);
  });

  it("updates mutable intent (name/watch/schedule) and bumps updatedAt", () => {
    const { registryPath, vaultDir } = scratch();
    const registry = new Registry(registryPath);
    const { id } = registry.add({ name: "Docs", path: vaultDir });
    const updated = registry.update(id, { name: "Renamed", watch: false, schedule: "@daily" });
    expect(updated).toMatchObject({ name: "Renamed", watch: false, schedule: "@daily" });
    // survives a reload (durable intent)
    expect(new Registry(registryPath).get(id)).toMatchObject({ name: "Renamed", watch: false });
    expect(registry.update("nope", { name: "x" })).toBeUndefined();
  });

  it("persists as a versioned file a fresh Registry loads back", () => {
    const { registryPath, vaultDir } = scratch();
    new Registry(registryPath).add({ name: "My Docs", path: vaultDir });
    expect(JSON.parse(readFileSync(registryPath, "utf8")).version).toBe(1);
    expect(new Registry(registryPath).list().map((v) => v.id)).toEqual(["vault-my-docs"]);
  });

  it("expands ~/ — form input arrives unexpanded by any shell", () => {
    const { registryPath } = scratch();
    // a real directory under $HOME, so `~/<name>` genuinely exists
    const homeDir = mkdtempSync(join(homedir(), ".mc-registry-test-"));
    try {
      const entry = new Registry(registryPath).add({
        name: "Home Docs",
        path: `~/${basename(homeDir)}`,
      });
      expect(entry.path).toBe(homeDir);
      expect(entry.configPath).toBe(join(homeDir, "markdown-contract.yaml"));
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("trims surrounding whitespace from a pasted path", () => {
    const { registryPath, vaultDir } = scratch();
    const entry = new Registry(registryPath).add({ name: "Padded", path: `  ${vaultDir}\n` });
    expect(entry.path).toBe(vaultDir);
  });

  it("rejects a path that is not an existing directory", () => {
    const { registryPath, vaultDir } = scratch();
    const registry = new Registry(registryPath);
    expect(() => registry.add({ name: "X", path: join(vaultDir, "nope") })).toThrow(RegistryError);
  });

  it("rejects double-registration of the same path", () => {
    const { registryPath, vaultDir } = scratch();
    const registry = new Registry(registryPath);
    registry.add({ name: "One", path: vaultDir });
    expect(() => registry.add({ name: "Two", path: vaultDir })).toThrow(RegistryError);
  });

  it("suffixes colliding ids from distinct paths", () => {
    const { registryPath, vaultDir } = scratch();
    const other = join(vaultDir, "sub");
    mkdirSync(other);
    const registry = new Registry(registryPath);
    registry.add({ name: "Docs", path: vaultDir });
    expect(registry.add({ name: "Docs", path: other }).id).toBe("vault-docs-2");
  });

  it("removes by id (and reports an unknown id as false)", () => {
    const { registryPath, vaultDir } = scratch();
    const registry = new Registry(registryPath);
    const { id } = registry.add({ name: "Docs", path: vaultDir });
    expect(registry.remove(id)).toBe(true);
    expect(registry.remove(id)).toBe(false);
    expect(registry.list()).toEqual([]);
  });
});
