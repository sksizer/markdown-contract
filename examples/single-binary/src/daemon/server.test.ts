/**
 * Peer test for the daemon server. Boots the real `Bun.serve` on an ephemeral
 * port (`port: 0`) and drives it over HTTP — so it exercises the assembled
 * request path (routing → config discovery → `runCorpus` → JSON), not a mock.
 *
 * Runs under `bun test` (not vitest): `Bun.serve` is a Bun-only API. The
 * fixture vault lives beside this file (`./fixtures/vault/`) with its own
 * `markdown-contract.yaml`, so `POST /api/validate { path }` here returns
 * exactly what `markdown-contract validate` prints for that tree (CLI parity).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { VERSION } from "markdown-contract";

import { serve } from "./server";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));

let server: ReturnType<typeof serve>;
let base: string;

beforeAll(() => {
  // Root relative-path resolution at the fixtures dir so the vault resolves as `vault`.
  server = serve({ port: 0, root: fixturesDir });
  base = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  void server.stop(true);
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

  test("accepts an absolute vault path (the loopback trust model: no path jail)", async () => {
    const res = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: `${fixturesDir}/vault` }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()) as { exitCode: number }).toMatchObject({ exitCode: 1 });
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

  test("rejects a missing `path` field", async () => {
    const res = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "`path` is required (a string)", exitCode: 2 });
  });
});

describe("GET /api/health", () => {
  test("reports ok and the library version", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: VERSION });
  });
});

describe("the SPA face", () => {
  test("`/` always answers with an HTML page (embedded SPA, disk build, or the no-UI notice)", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  test("an unknown /api route is a JSON 404, never the SPA fallback", async () => {
    const res = await fetch(`${base}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no such route: /api/nope", exitCode: 2 });
  });
});
