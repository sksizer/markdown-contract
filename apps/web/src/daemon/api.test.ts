/**
 * Peer test for the reshaped ONTOGEN route table (`./api.ts`). Boots the real
 * `startDaemon` on an ephemeral port with a throwaway registry and drives it over
 * HTTP — so it exercises the assembled request path (Bun routing → registry /
 * scan store / engine → ontogen DTO), the exact shape `createHttpTransport()`
 * consumes.
 *
 * Runs under `bun test` (not vitest): `Bun.serve` is a Bun-only API. The fixture
 * vault (`./fixtures/vault/`, one error finding) is registered via the ontogen
 * `POST /api/vaults` and then read/scanned through the ontogen endpoints.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { VaultStatus } from "../../types/api";
import type { FindingRecord, OpenerPreference, ScanRun, Vault } from "../../types/ontogen";
import { startDaemon } from "./daemon";

const vaultDir = fileURLToPath(new URL("./fixtures/vault", import.meta.url));

let daemon: ReturnType<typeof startDaemon>;
let base: string;
let vaultId: string;

const getJson = async <T = unknown>(path: string): Promise<T> =>
  (await fetch(`${base}${path}`)).json() as Promise<T>;
const send = (path: string, method: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const sendJson = async <T = unknown>(path: string, method: string, body?: unknown): Promise<T> =>
  (await send(path, method, body)).json() as Promise<T>;

beforeAll(async () => {
  const registryPath = join(mkdtempSync(join(tmpdir(), "mc-ontogen-")), "vaults.json");
  daemon = startDaemon({ port: 0, registryPath, watch: false });
  base = `http://127.0.0.1:${daemon.server.port}`;
  // Register through the ontogen create endpoint (a full CreateVaultInput; the
  // server is authoritative over id + timestamps).
  const res = await send("/api/vaults", "POST", {
    id: "client-supplied-ignored",
    name: "Fixture",
    path: vaultDir,
    config_path: "",
    watch_enabled: true,
    schedule: null,
    created_at: "",
    updated_at: "",
  });
  expect(res.status).toBe(201);
  vaultId = ((await res.json()) as Vault).id;
});

afterAll(() => daemon.stop());

describe("GET /api/vaults", () => {
  test("returns the flat ontogen Vault[] shape (not the legacy {vaults} envelope)", async () => {
    const vaults = await getJson<Vault[]>("/api/vaults");
    expect(Array.isArray(vaults)).toBe(true);
    expect(vaults[0]).toMatchObject({
      id: vaultId,
      name: "Fixture",
      path: vaultDir,
      config_path: join(vaultDir, "markdown-contract.yaml"),
      watch_enabled: true,
      schedule: null,
    });
    expect(typeof vaults[0]?.created_at).toBe("string");
    expect(typeof vaults[0]?.updated_at).toBe("string");
  });
});

describe("GET /api/vaults/:id", () => {
  test("returns a single Vault", async () => {
    const vault = await getJson<Vault>(`/api/vaults/${vaultId}`);
    expect(vault).toMatchObject({ id: vaultId, name: "Fixture" });
  });
  test("404s an unknown id with a JSON error", async () => {
    const res = await fetch(`${base}/api/vaults/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown vault: nope" });
  });
});

describe("POST /api/scans/now", () => {
  test("runs the corpus and returns the finalized ScanRun", async () => {
    const res = await send("/api/scans/now", "POST", { vault_id: vaultId });
    expect(res.status).toBe(200);
    const run = (await res.json()) as ScanRun;
    expect(run).toMatchObject({
      vault_id: vaultId,
      trigger: "manual",
      status: "failed", // the fixture has one error-level finding
      error_count: 1,
      warn_count: 0,
      report_count: 0,
      error_message: null,
    });
    expect(run.id).toMatch(/^scan-/);
  });

  test("404s a scan of an unknown vault", async () => {
    const res = await send("/api/scans/now", "POST", { vault_id: "nope" });
    expect(res.status).toBe(404);
  });
});

describe("scan-runs + finding-records collections", () => {
  test("the manual scan is readable as a ScanRun and a flat FindingRecord", async () => {
    const runs = await getJson<ScanRun[]>("/api/scan-runs");
    expect(runs.length).toBeGreaterThanOrEqual(1);
    const run = runs.at(-1) as ScanRun;
    expect(run).toMatchObject({ vault_id: vaultId, status: "failed" });

    const records = await getJson<FindingRecord[]>("/api/finding-records");
    expect(records.at(-1)).toMatchObject({
      scan_run_id: run.id,
      finding_id: "structure/section-missing",
      level: "error",
      file_path: "bad.md",
      line: 5,
      col: 1,
    });

    // fetchable by id, 404 otherwise
    expect(await getJson<ScanRun>(`/api/scan-runs/${run.id}`)).toMatchObject({ id: run.id });
    expect((await fetch(`${base}/api/scan-runs/nope`)).status).toBe(404);
  });
});

describe("GET /api/vault-status (editor read model — identity + derived status)", () => {
  test("returns rich VaultStatus[] with live state after a scan", async () => {
    const statuses = await getJson<VaultStatus[]>("/api/vault-status");
    const status = statuses.find((s) => s.id === vaultId);
    // camelCase identity (unlike the ontogen snake_case Vault) + the DERIVED status
    // the dashboard renders — the join `/api/vaults` (identity only) can't provide.
    expect(status).toMatchObject({
      id: vaultId,
      name: "Fixture",
      path: vaultDir,
      state: "findings", // the fixture's one error finding, surfaced by the earlier scan
    });
    expect(status?.result?.findings?.[0]).toMatchObject({ id: "structure/section-missing" });
  });

  test("GET /api/vault-status/:id returns one status; 404s an unknown id", async () => {
    expect(await getJson<VaultStatus>(`/api/vault-status/${vaultId}`)).toMatchObject({
      id: vaultId,
      name: "Fixture",
    });
    const res = await fetch(`${base}/api/vault-status/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown vault: nope" });
  });
});

describe("opener-preferences CRUD (generic collection)", () => {
  test("create → list → update → delete round-trips over HTTP", async () => {
    const created = await send("/api/opener-preferences", "POST", {
      id: "pref-code",
      app_id: "code",
      enabled: true,
      sort_order: 0,
    });
    expect(created.status).toBe(201);

    const prefs = await getJson<OpenerPreference[]>("/api/opener-preferences");
    expect(prefs.map((p) => p.id)).toContain("pref-code");

    const updated = await sendJson<OpenerPreference>("/api/opener-preferences/pref-code", "PUT", {
      enabled: false,
    });
    expect(updated).toEqual({ id: "pref-code", app_id: "code", enabled: false, sort_order: 0 });

    expect((await send("/api/opener-preferences/pref-code", "DELETE")).status).toBe(204);
    expect((await fetch(`${base}/api/opener-preferences/pref-code`)).status).toBe(404);
  });

  test("a duplicate id is a 409 conflict", async () => {
    await send("/api/opener-preferences", "POST", {
      id: "dup",
      app_id: "a",
      enabled: true,
      sort_order: 0,
    });
    const again = await send("/api/opener-preferences", "POST", {
      id: "dup",
      app_id: "a",
      enabled: true,
      sort_order: 0,
    });
    expect(again.status).toBe(409);
  });
});

describe("openers (web stubs) + echo", () => {
  test("the web daemon publishes no local openers", async () => {
    expect(await getJson<unknown[]>("/api/openers/list")).toEqual([]);
  });
  test("launching a path is refused as desktop-only (501)", async () => {
    const res = await send("/api/openers/open-path", "POST", { path: "/x", app_id: "code" });
    expect(res.status).toBe(501);
  });
  test("echo returns the message verbatim", async () => {
    const res = await send("/api/echos", "POST", { message: "hi" });
    expect(await res.json()).toBe("hi");
  });
});

describe("DELETE /api/vaults/:id", () => {
  test("unregisters a vault and 204s (files untouched)", async () => {
    const scratchVault = mkdtempSync(join(tmpdir(), "mc-vault-"));
    const created = await sendJson<Vault>("/api/vaults", "POST", {
      id: "x",
      name: "Throwaway",
      path: scratchVault,
      config_path: "",
      watch_enabled: false,
      schedule: null,
      created_at: "",
      updated_at: "",
    });
    expect((await send(`/api/vaults/${created.id}`, "DELETE")).status).toBe(204);
    expect((await fetch(`${base}/api/vaults/${created.id}`)).status).toBe(404);
  });
});
