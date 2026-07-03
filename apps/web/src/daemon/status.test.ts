import { describe, expect, it } from "bun:test";

import type { RunResult, VaultRegistryEntry } from "../../types/api";
import { StatusStore, stateFromDrift, stateFromRun } from "./status";

const entry: VaultRegistryEntry = {
  id: "vault-docs",
  name: "Docs",
  path: "/tmp/docs",
  configPath: "/tmp/docs/markdown-contract.yaml",
};

const clean: RunResult = {
  findings: [],
  exitCode: 0,
  stats: { filesScanned: 3, filesMatched: 3, filesUnmatched: 0, matchedByRule: [3] },
};

const failing: RunResult = {
  ...clean,
  exitCode: 1,
  findings: [{ id: "structure/section-missing", level: "error", path: "a.md", message: "missing" }],
};

describe("state folds", () => {
  it("a clean run is green", () => {
    expect(stateFromRun(clean)).toBe("green");
  });
  it("any finding means findings", () => {
    expect(stateFromRun(failing)).toBe("findings");
  });
  it("drift folds on the drifted flag", () => {
    expect(stateFromDrift({ drifted: true, entries: [], warnings: [] })).toBe("drift");
    expect(stateFromDrift({ drifted: false, entries: [], warnings: [] })).toBe("green");
  });
});

describe("StatusStore", () => {
  it("a validated vault carries its result and folded state", () => {
    const store = new StatusStore();
    const status = store.markValidated(entry, failing);
    expect(status.state).toBe("findings");
    expect(status.result).toBe(failing);
    expect(store.get("vault-docs")?.state).toBe("findings");
  });

  it("a re-run in flight keeps the previous result visible", () => {
    const store = new StatusStore();
    store.markValidated(entry, clean);
    const running = store.markRunning(entry);
    expect(running.state).toBe("running");
    expect(running.result).toBe(clean);
  });

  it("snapshot returns a bare running row for a vault never run", () => {
    const store = new StatusStore();
    const [status] = store.snapshot([entry]);
    expect(status?.state).toBe("running");
    expect(status?.result).toBeUndefined();
  });

  it("an error replaces the result with the failure detail", () => {
    const store = new StatusStore();
    store.markValidated(entry, clean);
    const status = store.markError(entry, "no config");
    expect(status.state).toBe("error");
    expect(status.error).toEqual({ message: "no config" });
    expect(status.result).toBeUndefined();
  });
});
