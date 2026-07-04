/**
 * Peer test for the validate logic — the whole `POST /api/validate` contract,
 * exercised WITHOUT a Nuxt build or a server: `validateVault` is a plain
 * body→outcome function, `resolveVaultPath` / `resolveConfig` plain
 * input→output. The fixture vault beside this file has its own
 * `markdown-contract.yaml`, so the pinned outcome here is exactly what
 * `markdown-contract validate` prints for that tree (CLI parity).
 */
import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { resolveConfig, resolveVaultPath, validateVault } from "./validate-vault";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));

describe("validateVault", () => {
  test("returns the findings, stats, and exit code for a fixture vault (CLI parity)", async () => {
    const outcome = await validateVault({ path: "vault" }, fixturesDir);

    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({
      findings: [
        {
          id: "structure/section-missing",
          level: "error",
          path: "bad.md",
          message: "required section ‘Summary’ is missing",
          pos: { line: 5, col: 1 },
        },
      ],
      stats: {
        filesScanned: 4,
        filesMatched: 2,
        filesUnmatched: 2,
        matchedByRule: [2],
      },
      exitCode: 1,
    });
  });

  test("accepts an absolute vault path (the loopback trust model: no path jail)", async () => {
    const outcome = await validateVault({ path: `${fixturesDir}/vault` }, "/somewhere/unrelated");

    expect(outcome.status).toBe(200);
    expect(outcome.body).toMatchObject({ exitCode: 1 });
  });

  test("a non-object body is the JSON usage error (h3 hands invalid JSON through as a string)", async () => {
    expect(await validateVault("not json", fixturesDir)).toEqual({
      status: 400,
      body: { error: "request body must be JSON", exitCode: 2 },
    });
  });

  test("rejects a missing `path` field", async () => {
    expect(await validateVault({}, fixturesDir)).toEqual({
      status: 400,
      body: { error: "`path` is required (a string)", exitCode: 2 },
    });
  });

  test("reports a missing config as a usage error (exit 2)", async () => {
    // The fixtures dir itself has no config file — config discovery fails.
    const outcome = await validateVault({ path: "." }, fixturesDir);

    expect(outcome.status).toBe(400);
    expect(outcome.body).toMatchObject({ exitCode: 2 });
  });
});

describe("resolveVaultPath", () => {
  test("a relative path resolves against the root (the daemon's cwd)", () => {
    expect(resolveVaultPath("vault", "/base")).toBe("/base/vault");
  });

  test("an absolute path passes through untouched (no jail — loopback trust model)", () => {
    expect(resolveVaultPath("/somewhere/else", "/base")).toBe("/somewhere/else");
  });

  test("a NUL byte is rejected", () => {
    expect(() => resolveVaultPath("vault\0", "/base")).toThrow("invalid path");
  });
});

describe("resolveConfig", () => {
  test("auto-discovers markdown-contract.yaml in the vault (like the bare CLI)", async () => {
    const config = await resolveConfig(`${fixturesDir}/vault`);
    expect(Array.isArray(config.rules)).toBe(true);
  });

  test("a missing explicit config throws (the caller maps this to exit 2)", async () => {
    await expect(resolveConfig(`${fixturesDir}/vault`, "no-such.yaml")).rejects.toThrow(
      "config not found: no-such.yaml",
    );
  });

  test("a vault without any default config name throws with the probe list", async () => {
    await expect(resolveConfig(fixturesDir)).rejects.toThrow(/no config found/);
  });
});
