import { describe, expect, it } from "bun:test";

import type { Finding } from "../../types/api";
import { ScanStore } from "./scans";

/** A store with deterministic, sequential ids so cases read exactly. */
function store(): ScanStore {
  let n = 0;
  return new ScanStore(() => `scan-${++n}`);
}

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  id: "structure/section-missing",
  level: "error",
  path: "bad.md",
  message: "required section ‘Summary’ is missing",
  pos: { line: 5, col: 1 },
  ...overrides,
});

describe("ScanStore.ingest", () => {
  it("records a passing run with no findings", () => {
    const s = store();
    const run = s.ingest("vault-docs", "manual", []);
    expect(run).toMatchObject({
      id: "scan-1",
      vault_id: "vault-docs",
      trigger: "manual",
      status: "passed",
      error_count: 0,
    });
    expect(s.runs.list()).toEqual([run]);
    expect(s.findings.list()).toEqual([]);
  });

  it("records a failing run and flattens its findings into records", () => {
    const s = store();
    const run = s.ingest("vault-docs", "watch", [finding(), finding({ level: "warn" })]);
    expect(run.status).toBe("failed");
    expect(run.error_count).toBe(1);
    expect(run.warn_count).toBe(1);
    const records = s.findings.list();
    expect(records.map((r) => r.id)).toEqual(["scan-1-0", "scan-1-1"]);
    expect(records[0]).toMatchObject({
      scan_run_id: "scan-1",
      file_path: "bad.md",
      line: 5,
      col: 1,
    });
  });

  it("records a run that threw as an error carrying the message", () => {
    const s = store();
    const run = s.ingest("vault-docs", "manual", [], "no contract config");
    expect(run.status).toBe("error");
    expect(run.error_message).toBe("no contract config");
    expect(s.findings.list()).toEqual([]);
  });

  it("accumulates runs across ingests", () => {
    const s = store();
    s.ingest("vault-a", "manual", []);
    s.ingest("vault-b", "manual", []);
    expect(s.runs.list().map((r) => r.vault_id)).toEqual(["vault-a", "vault-b"]);
  });
});
