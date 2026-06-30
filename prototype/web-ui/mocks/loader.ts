/**
 * THE single mock loader — one object (`mockApi`) that serves every D-0012 §D3
 * route's payload from the fixtures.
 *
 * This is the seam both surfaces resolve data through: the Storybook decorator
 * and the Nuxt app shell go through the composables, which go through `mockApi`.
 * When the real daemon lands, this object is the one thing swapped for a `fetch`
 * client hitting the live `/api` routes — the route methods here mirror those
 * routes one-for-one, so the call sites never change.
 *
 * Imports flow loader → fixtures (never the reverse, and never the composables),
 * so there is no import cycle.
 */
import { cleanDrift, mockSseEvents, mockVaultStatuses } from "./api-fixtures";
import { makeResult, makeStats, makeVaultStatus } from "./builders";
import { mockVaults } from "./fixtures";
import type {
  CheckResponse,
  RegisterVaultRequest,
  RegisterVaultResponse,
  SseEvent,
  ValidateResponse,
  VaultDetailResponse,
  VaultListResponse,
  VaultStatus,
  VaultSummary,
} from "./types";

/** Slugify a vault name into an id stem, the way the registry would. */
function slugId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `vault-${slug === "" ? "untitled" : slug}`;
}

export const mockApi = {
  /** GET /api/vaults — the registry plus each vault's last status. */
  listVaults(): VaultListResponse {
    return { vaults: mockVaultStatuses };
  },

  /** GET /api/vaults/:id — a single vault's detail (undefined when unknown). */
  getVault(id: string): VaultDetailResponse | undefined {
    const vault = mockVaultStatuses.find((v) => v.id === id);
    return vault ? { vault } : undefined;
  },

  /** POST /api/vaults — register a path + config, returning a fresh green vault. */
  registerVault(req: RegisterVaultRequest): RegisterVaultResponse {
    const vault: VaultStatus = makeVaultStatus({
      id: slugId(req.name),
      name: req.name,
      path: req.path,
      configPath: req.configPath ?? `${req.path}/markdown-contract.yaml`,
      state: "green",
      result: makeResult([], makeStats({ filesScanned: 0, filesMatched: 0, matchedByRule: [] })),
    });
    return { vault };
  },

  /** POST /api/vaults/:id/validate — run → findings (undefined when unknown). */
  validateVault(id: string): ValidateResponse | undefined {
    const vault = mockVaultStatuses.find((v) => v.id === id);
    if (!vault) return undefined;
    const result =
      vault.result ?? makeResult([], makeStats({ filesScanned: 0, filesMatched: 0, matchedByRule: [] }));
    return { result };
  },

  /** GET /api/vaults/:id/check — drift via `init --check` (undefined when unknown). */
  checkVault(id: string): CheckResponse | undefined {
    const vault = mockVaultStatuses.find((v) => v.id === id);
    if (!vault) return undefined;
    return { drift: vault.drift ?? cleanDrift };
  },

  /** GET /api/events — the live-status SSE event sequence. */
  events(): SseEvent[] {
    return mockSseEvents;
  },

  /** The validated-vault product fixtures the dashboard binds to. */
  vaultSummaries(): VaultSummary[] {
    return mockVaults;
  },
};
