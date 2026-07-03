/**
 * Peer test for the JSON API router — the module-level contract, without a
 * server: `handleApi` routes (or declines) a `Request`; `resolveVaultPath` and
 * `resolveConfig` are plain input→output functions.
 */
import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { handleApi, resolveConfig, resolveVaultPath } from "./routes";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));
const ctx = { root: fixturesDir };

describe("handleApi", () => {
  test("declines non-API paths with null (the server then serves the SPA)", async () => {
    expect(await handleApi(new Request("http://127.0.0.1/"), ctx)).toBeNull();
    expect(await handleApi(new Request("http://127.0.0.1/_nuxt/app.js"), ctx)).toBeNull();
  });

  test("GET /api/health → 200 { ok, version }", async () => {
    const res = await handleApi(new Request("http://127.0.0.1/api/health"), ctx);
    expect(res?.status).toBe(200);
    expect(await res?.json()).toMatchObject({ ok: true });
  });

  test("wrong method on a route is a JSON 405", async () => {
    const res = await handleApi(
      new Request("http://127.0.0.1/api/health", { method: "POST" }),
      ctx,
    );
    expect(res?.status).toBe(405);
    expect(await res?.json()).toEqual({ error: "method not allowed", exitCode: 2 });
  });

  test("a non-JSON validate body is a 400 usage error", async () => {
    const res = await handleApi(
      new Request("http://127.0.0.1/api/validate", { method: "POST", body: "not json" }),
      ctx,
    );
    expect(res?.status).toBe(400);
    expect(await res?.json()).toEqual({ error: "request body must be JSON", exitCode: 2 });
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
