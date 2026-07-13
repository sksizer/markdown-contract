// Peer test (CONVENTIONS.md): the view-model derivations as plain
// input → output cases.
import { describe, expect, it } from "bun:test";
import type { FindingRecord, ScanRun } from "../bindings/types";
import {
  groupFindingsByFile,
  joinVaultPath,
  latestRunFor,
  runsForVault,
  statusKeyFor,
  toKitFinding,
} from "./vaultView";

function run(overrides: Partial<ScanRun>): ScanRun {
  return {
    id: "run-1",
    vault_id: "vault-docs",
    started_at: "2026-07-09T10:00:00Z",
    finished_at: "2026-07-09T10:00:01Z",
    trigger: "manual",
    status: "green",
    error_count: 0,
    warn_count: 0,
    report_count: 0,
    error_message: null,
    ...overrides,
  };
}

function record(overrides: Partial<FindingRecord>): FindingRecord {
  return {
    id: "run-1-f0",
    scan_run_id: "run-1",
    finding_id: "structure/section-missing",
    level: "error",
    file_path: "docs/guide.md",
    line: 3,
    col: 1,
    message: "missing required section",
    ...overrides,
  };
}

describe("latestRunFor", () => {
  it("picks the newest run of that vault only", () => {
    const runs = [
      run({ id: "run-a", started_at: "2026-07-09T09:00:00Z" }),
      run({ id: "run-b", started_at: "2026-07-09T11:00:00Z" }),
      run({ id: "run-c", vault_id: "vault-other", started_at: "2026-07-09T12:00:00Z" }),
    ];
    expect(latestRunFor(runs, "vault-docs")?.id).toBe("run-b");
    expect(latestRunFor(runs, "vault-unknown")).toBeNull();
  });
});

describe("runsForVault", () => {
  it("filters to the vault, newest first", () => {
    const runs = [
      run({ id: "run-a", started_at: "2026-07-09T09:00:00Z" }),
      run({ id: "run-b", vault_id: "vault-other" }),
      run({ id: "run-c", started_at: "2026-07-09T11:00:00Z" }),
    ];
    expect(runsForVault(runs, "vault-docs").map((r) => r.id)).toEqual(["run-c", "run-a"]);
  });
});

describe("statusKeyFor", () => {
  it("maps run statuses onto the kit's status language", () => {
    expect(statusKeyFor(run({ status: "green" }))).toBe("green");
    expect(statusKeyFor(run({ status: "findings" }))).toBe("findings");
    expect(statusKeyFor(run({ status: "running" }))).toBe("running");
    expect(statusKeyFor(run({ status: "error" }))).toBe("error");
    expect(statusKeyFor(null)).toBeNull();
    expect(statusKeyFor(run({ status: "something-new" }))).toBeNull();
  });
});

describe("toKitFinding", () => {
  it("maps a persisted record onto the kit Finding shape", () => {
    expect(toKitFinding(record({}))).toEqual({
      id: "structure/section-missing",
      level: "error",
      path: "docs/guide.md",
      pos: { line: 3, col: 1 },
      message: "missing required section",
    });
  });

  it("drops the position when the record has none", () => {
    expect(toKitFinding(record({ line: null, col: null })).pos).toBeUndefined();
  });
});

describe("groupFindingsByFile", () => {
  it("groups per file (sorted) with findings in position order", () => {
    const groups = groupFindingsByFile([
      record({ id: "f1", file_path: "b.md", line: 9 }),
      record({ id: "f2", file_path: "a.md", line: 5 }),
      record({ id: "f3", file_path: "b.md", line: 2 }),
    ]);
    expect(groups.map((g) => g.file)).toEqual(["a.md", "b.md"]);
    expect(groups[1]?.findings.map((f) => f.pos?.line)).toEqual([2, 9]);
  });
});

describe("joinVaultPath", () => {
  it("joins vault-relative paths and leaves absolute ones alone", () => {
    expect(joinVaultPath("/home/me/docs", "guide.md")).toBe("/home/me/docs/guide.md");
    expect(joinVaultPath("/home/me/docs/", "sub/guide.md")).toBe("/home/me/docs/sub/guide.md");
    expect(joinVaultPath("/home/me/docs", "/etc/other.md")).toBe("/etc/other.md");
  });
});
