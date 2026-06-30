// Barrel for the mock-data layer (re-exports only; no logic lives here).
//   types       — local mirror of the engine's output shapes
//   builders    — fixture factories
//   fixtures    — concrete canned vaults (clean / warning / failing)
//   composables — useMockVaults() / useMockCorpus() access seam
export * from "./types";
export * from "./builders";
export * from "./fixtures";
export * from "./composables";
