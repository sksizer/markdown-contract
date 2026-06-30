// Barrel for the mock-data layer (re-exports only; no logic lives here).
//   types        — engine-output mirror + the API seam (re-exported from ../types/api)
//   builders     — fixture factories
//   fixtures     — concrete canned vaults (clean / warning / failing)
//   api-fixtures — API-seam fixtures (every status state, drift, SSE)
//   loader       — the single mock loader (mockApi) backing both surfaces
//   composables  — useMockVaults() / useMockCorpus() access seam
export * from "./types";
export * from "./builders";
export * from "./fixtures";
export * from "./api-fixtures";
export * from "./loader";
export * from "./composables";
