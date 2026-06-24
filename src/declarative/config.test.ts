import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCli } from "../cli/run.js";
import { runCorpus } from "../runner/index.js";
import { DeclarativeError, loadConfig, loadConfigFile } from "./index.js";

const CONTRACT = `mcVersion: 1
kind: contract
body:
  order: none
  sections:
    - section: Summary
`;

const CONFIG = `mcVersion: 1
kind: config
contracts:
  doc: ./doc.contract.yaml
rules:
  - include: ['*.md']
    contract: doc
`;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "mc-dyc-config-"));
  writeFileSync(join(dir, "doc.contract.yaml"), CONTRACT);
  writeFileSync(join(dir, "mc.yaml"), CONFIG);
  writeFileSync(join(dir, "good.md"), "## Summary\n\nhello\n");
  writeFileSync(join(dir, "bad.md"), "## Other\n\nhello\n"); // missing Summary → error
  mkdirSync(join(dir, "clean"));
  writeFileSync(join(dir, "clean", "ok.md"), "## Summary\n\nok\n");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig — YAML meta-config → CorpusConfig", () => {
  it("resolves a named .yaml contract ref and runs the corpus (failing tree → exit 1)", () => {
    const config = loadConfigFile(join(dir, "mc.yaml"));
    expect(config.rules).toHaveLength(1);
    const r = runCorpus(config, { cwd: dir });
    expect(r.exitCode).toBe(1);
    expect(r.findings.some((f) => f.id === "structure/section-missing")).toBe(true);
  });

  it("a clean subtree exits 0", () => {
    const config = loadConfigFile(join(dir, "mc.yaml"));
    const r = runCorpus(config, { cwd: join(dir, "clean") });
    expect(r.exitCode).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it("supports an inline contract object", () => {
    const yaml = `mcVersion: 1
kind: config
rules:
  - include: ['*.md']
    contract: { body: { order: none, sections: [ { section: Summary } ] } }
`;
    const r = runCorpus(loadConfig(yaml, dir), { cwd: join(dir, "clean") });
    expect(r.exitCode).toBe(0);
  });

  it("rejects a code-authored contract ref (the deferred code escape)", () => {
    const yaml = `mcVersion: 1
kind: config
rules:
  - include: ['*.md']
    contract: ./contracts/task.ts
`;
    expect(() => loadConfig(yaml, dir)).toThrow(DeclarativeError);
  });

  it("rejects a contract document handed in as a config", () => {
    expect(() => loadConfig(CONTRACT, dir)).toThrow(DeclarativeError);
  });
});

describe("CLI — validate with a .yaml config", () => {
  it("a failing tree with --config x.yaml → exit 1", async () => {
    const res = await runCli(["validate", dir, "--config", join(dir, "mc.yaml")], { cwd: dir });
    expect(res.code).toBe(1);
  });

  it("a clean subtree with --config x.yaml → exit 0", async () => {
    const res = await runCli(["validate", join(dir, "clean"), "--config", join(dir, "mc.yaml")], {
      cwd: dir,
    });
    expect(res.code).toBe(0);
  });
});

describe("CLI — config-less --contract parameterization", () => {
  const contract = () => join(dir, "doc.contract.yaml");

  it("one contract over a tree (failing tree → exit 1)", async () => {
    const res = await runCli(["validate", dir, "--contract", contract()], { cwd: dir });
    expect(res.code).toBe(1); // bad.md has no Summary section
  });

  it("one contract over a clean subtree → exit 0", async () => {
    const res = await runCli(["validate", join(dir, "clean"), "--contract", contract()], { cwd: dir });
    expect(res.code).toBe(0);
  });

  it("inline contract/path pair routes by directory (clean subtree → exit 0)", async () => {
    const res = await runCli(["validate", "--contract", contract(), "--path", "clean"], { cwd: dir });
    expect(res.code).toBe(0);
  });

  it("inline pair pointed at the failing tree → exit 1", async () => {
    const res = await runCli(["validate", "--contract", contract(), "--path", "."], { cwd: dir });
    expect(res.code).toBe(1);
  });

  it("--contract and --config together → exit 2", async () => {
    const res = await runCli(
      ["validate", dir, "--contract", contract(), "--config", join(dir, "mc.yaml")],
      { cwd: dir },
    );
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("either --contract or --config");
  });

  it("--path without --contract → exit 2", async () => {
    const res = await runCli(["validate", dir, "--path", "clean"], { cwd: dir });
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("--path requires a matching --contract");
  });

  it("contract/path count mismatch → exit 2", async () => {
    const res = await runCli(
      ["validate", "--contract", contract(), "--contract", contract(), "--path", "clean"],
      { cwd: dir },
    );
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("matching --path");
  });

  it("positional <path> combined with pairs → exit 2", async () => {
    const res = await runCli(
      ["validate", dir, "--contract", contract(), "--path", "clean"],
      { cwd: dir },
    );
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("positional");
  });

  it("a non-YAML --contract ref → exit 2 (code escape deferred)", async () => {
    const res = await runCli(["validate", dir, "--contract", join(dir, "contract.ts")], { cwd: dir });
    expect(res.code).toBe(2);
    expect(res.stderr).toContain(".yaml");
  });
});
