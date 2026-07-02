import { describe, expect, it } from "bun:test";

import { isRelevantChange } from "./watcher";

describe("isRelevantChange", () => {
  it("a markdown edit is relevant", () => {
    expect(isRelevantChange("notes/first.md")).toBe(true);
  });
  it("a contract config edit is relevant", () => {
    expect(isRelevantChange("markdown-contract.yaml")).toBe(true);
    expect(isRelevantChange("contracts/notes.contract.yml")).toBe(true);
  });
  it("non-document files are noise", () => {
    expect(isRelevantChange("assets/logo.png")).toBe(false);
    expect(isRelevantChange("notes/first.md.swp")).toBe(false);
  });
  it("ignored trees never trigger", () => {
    expect(isRelevantChange(".git/index.md")).toBe(false);
    expect(isRelevantChange("node_modules/pkg/readme.md")).toBe(false);
    expect(isRelevantChange(".obsidian/workspace.md")).toBe(false);
  });
  it("an unknown change (null filename) triggers, to be safe", () => {
    expect(isRelevantChange(null)).toBe(true);
  });
});
