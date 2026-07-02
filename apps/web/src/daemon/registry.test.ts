import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    expect(entry).toEqual({
      id: "vault-my-docs",
      name: "My Docs",
      path: vaultDir,
      configPath: join(vaultDir, "markdown-contract.yaml"),
      watch: true,
    });
  });

  it("persists as a versioned file a fresh Registry loads back", () => {
    const { registryPath, vaultDir } = scratch();
    new Registry(registryPath).add({ name: "My Docs", path: vaultDir });
    expect(JSON.parse(readFileSync(registryPath, "utf8")).version).toBe(1);
    expect(new Registry(registryPath).list().map((v) => v.id)).toEqual(["vault-my-docs"]);
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
