/**
 * Mock data access — the seam the real app will later swap for a `runCorpus`-backed
 * client. Today these return canned fixtures synchronously; the call sites
 * (pages, components) never know whether the data is mock or real.
 *
 * Named `use*` so they read as Vue/Nuxt composables at the call site. They are
 * plain functions (no reactivity needed for static fixtures), which keeps them
 * usable from Storybook stories and decorators too, not just inside a Nuxt setup.
 */
import { mockApi } from "./loader";
import type { RunResult, VaultSummary } from "./types";

/** All managed vaults and their latest validation status. */
export function useMockVaults(): VaultSummary[] {
  return mockApi.vaultSummaries();
}

/**
 * The latest corpus run for a single vault (defaults to the first vault).
 * Mirrors what a future `useCorpus(vaultId)` would return from the engine.
 */
export function useMockCorpus(vaultId?: string): RunResult | undefined {
  const vaults = mockApi.vaultSummaries();
  const vault = vaultId ? vaults.find((v) => v.id === vaultId) : vaults[0];
  return vault?.result;
}
