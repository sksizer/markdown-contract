// Barrel for the daemon (re-exports only; no logic lives here).
//   daemon   — startDaemon + options/context (the composition root)
//   registry — durable vault intent (layer 1)
//   status   — in-memory live status (layer 2)
//   runs     — the engine bridge (validate / check / init)
//   config   — the vault config + referenced contract files (read / validate / write)
//   sse      — the live-status wire
//   watcher  — debounced recursive file watching
//   static   — embedded/disk SPA serving
export { DEFAULT_PORT, startDaemon, type DaemonContext, type DaemonOptions } from "./daemon";
export { defaultRegistryPath, Registry, RegistryError, slugId } from "./registry";
export { StatusStore, stateFromDrift, stateFromRun } from "./status";
export { checkVault, findingToDrift, initVault, RunError, validateVault } from "./runs";
export { ConfigError, listConfigFiles, readConfig, saveConfig, saveConfigFile } from "./config";
export { SseHub, type SseEventInput } from "./sse";
export { isRelevantChange, VaultWatcher } from "./watcher";
export { hasUi, serveStatic } from "./static";
