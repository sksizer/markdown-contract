/**
 * Peer test for the daemon server. Boots the real `Bun.serve` on an ephemeral port
 * (`port: 0`) and drives it over HTTP — so it exercises the assembled request path
 * (routing → path guard → config discovery → `runCorpus` → JSON), not a mock.
 *
 * Runs under `bun test` (not vitest): `Bun.serve` is a Bun-only API. The fixture vault
 * lives beside this file (`./fixtures/vault/`) with its own `markdown-contract.yaml`, so
 * `POST /api/validate { path }` here returns exactly what `markdown-contract validate`
 * prints for that tree (AC-2 / AC-4).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { VERSION } from "markdown-contract";

import { serve } from "./server.js";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));

let server: ReturnType<typeof serve>;
let base: string;

beforeAll(() => {
  // Root the traversal jail at the fixtures dir so the vault resolves as `vault`.
  server = serve({ port: 0, root: fixturesDir });
  base = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

describe("POST /api/validate", () => {
  test("returns the findings, stats, and exit code for a fixture vault (CLI parity)", async () => {
    const res = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "vault" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
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

  test("rejects a path that escapes the server root (untrusted input)", async () => {
    const res = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "../../../../etc" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "path escapes the server root: ../../../../etc",
      exitCode: 2,
    });
  });

  test("reports a missing config as a usage error (exit 2)", async () => {
    const res = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // The fixtures dir itself has no config file — config discovery fails.
      body: JSON.stringify({ path: "." }),
    });

    expect(res.status).toBe(400);
    expect((await res.json()) as { exitCode: number }).toMatchObject({ exitCode: 2 });
  });
});

describe("GET /api/health", () => {
  test("reports ok and the library version", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: VERSION });
  });
});

describe("loopback bind guard (AC-1)", () => {
  test("refuses a non-loopback bind", () => {
    expect(() => serve({ port: 0, host: "0.0.0.0" })).toThrow(/non-loopback/);
  });
});
