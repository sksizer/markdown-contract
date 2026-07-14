import { describe, expect, it } from "bun:test";

import type { Finding, VaultRegistryEntry } from "../../types/api";
import { buildScanRun, countByLevel, findingToRecord, vaultToDto } from "./dto";

describe("vaultToDto", () => {
  it("maps a registry entry onto the flat ontogen Vault shape", () => {
    const entry: VaultRegistryEntry = {
      id: "vault-docs",
      name: "Docs",
      path: "/tmp/docs",
      configPath: "/tmp/docs/markdown-contract.yaml",
      watch: true,
      schedule: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    expect(vaultToDto(entry)).toEqual({
      id: "vault-docs",
      name: "Docs",
      path: "/tmp/docs",
      config_path: "/tmp/docs/markdown-contract.yaml",
      watch_enabled: true,
      schedule: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });

  it("defaults watch_enabled to true and timestamps to empty when absent", () => {
    const entry: VaultRegistryEntry = {
      id: "vault-x",
      name: "X",
      path: "/tmp/x",
      configPath: "/tmp/x/markdown-contract.yaml",
    };
    const dto = vaultToDto(entry);
    expect(dto.watch_enabled).toBe(true);
    expect(dto.schedule).toBeNull();
    expect(dto.created_at).toBe("");
    expect(dto.updated_at).toBe("");
  });
});

describe("countByLevel", () => {
  it("tallies findings per severity", () => {
    const findings: Finding[] = [
      { id: "a", level: "error", path: "a.md", message: "" },
      { id: "b", level: "warn", path: "b.md", message: "" },
      { id: "c", level: "error", path: "c.md", message: "" },
      { id: "d", level: "report", path: "d.md", message: "" },
    ];
    expect(countByLevel(findings)).toEqual({ error_count: 2, warn_count: 1, report_count: 1 });
  });
});

describe("findingToRecord", () => {
  it("flattens a finding with a position", () => {
    const finding: Finding = {
      id: "structure/section-missing",
      level: "error",
      path: "bad.md",
      message: "required section ‘Summary’ is missing",
      pos: { line: 5, col: 1 },
    };
    expect(findingToRecord(finding, "scan-1", 0)).toEqual({
      id: "scan-1-0",
      scan_run_id: "scan-1",
      finding_id: "structure/section-missing",
      level: "error",
      file_path: "bad.md",
      line: 5,
      col: 1,
      message: "required section ‘Summary’ is missing",
    });
  });

  it("maps an absent position to null line/col", () => {
    const finding: Finding = { id: "x", level: "warn", path: "a.md", message: "m" };
    const rec = findingToRecord(finding, "scan-1", 3);
    expect(rec.line).toBeNull();
    expect(rec.col).toBeNull();
    expect(rec.id).toBe("scan-1-3");
  });
});

describe("buildScanRun", () => {
  const base = {
    id: "scan-1",
    vaultId: "vault-docs",
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:00:01.000Z",
    trigger: "manual",
  };

  it("a clean run is passed with zero counts", () => {
    expect(buildScanRun({ ...base, findings: [] })).toEqual({
      id: "scan-1",
      vault_id: "vault-docs",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:01.000Z",
      trigger: "manual",
      status: "passed",
      error_count: 0,
      warn_count: 0,
      report_count: 0,
      error_message: null,
    });
  });

  it("an error-level finding makes the run failed", () => {
    const run = buildScanRun({
      ...base,
      findings: [{ id: "a", level: "error", path: "a.md", message: "" }],
    });
    expect(run.status).toBe("failed");
    expect(run.error_count).toBe(1);
    expect(run.error_message).toBeNull();
  });

  it("a run that threw is an error carrying the message", () => {
    const run = buildScanRun({ ...base, findings: [], errorMessage: "no config" });
    expect(run.status).toBe("error");
    expect(run.error_message).toBe("no config");
  });
});
