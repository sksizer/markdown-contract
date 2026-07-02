/**
 * Runs — the daemon's only bridge into the engine. Validation goes through the
 * library API (`runCorpus` over a `loadConfigFile` config), never by shelling
 * out; `init` scaffolding reuses the CLI's pure core (`runCli`) so the daemon
 * gets the exact same inference + self-check the terminal does, with captured
 * streams instead of a TTY.
 *
 * Layering per D-0012 D1: this module imports `markdown-contract` (the published
 * library surface) only — nothing reaches into engine internals.
 */
import { existsSync } from "node:fs";

import { runCorpus } from "markdown-contract";
import { runCli } from "markdown-contract/cli";
import { loadConfigFile } from "markdown-contract/declarative";

import type {
  DriftEntry,
  DriftResult,
  Finding,
  InitVaultRequest,
  InitVaultResponse,
  RunResult,
  VaultRegistryEntry,
} from "../../types/api";

/** A run rejected for a caller-fixable reason (e.g. no config yet) — maps to HTTP 409. */
export class RunError extends Error {}

/** Guard shared by validate/check: the vault must have its config on disk. */
function requireConfig(entry: VaultRegistryEntry): void {
  if (!existsSync(entry.configPath)) {
    throw new RunError(`no contract config at ${entry.configPath} — scaffold one first (init)`);
  }
}

/**
 * Validate a vault: load its declarative config and run the corpus with the
 * vault root as cwd. Returns the engine's aggregate result verbatim (the API's
 * `RunResult` mirrors it field-for-field).
 */
export function validateVault(entry: VaultRegistryEntry): RunResult {
  requireConfig(entry);
  const config = loadConfigFile(entry.configPath);
  const { findings, exitCode, stats } = runCorpus(config, { cwd: entry.path });
  return { findings, exitCode, stats };
}

/**
 * Best-effort fold of an error finding into a `DriftEntry` — keyed off the
 * rule-id vocabulary (`structure/…`, `frontmatter/…`, `order`). A prototype
 * heuristic: good enough to drive the drift view; the real `init --check`
 * diffing (re-infer vs on-disk) is future work.
 */
export function findingToDrift(finding: Finding): DriftEntry {
  const at = finding.pos ? `:${finding.pos.line}` : "";
  return {
    kind: driftKind(finding.id.toLowerCase()),
    target: `${finding.path}${at}`,
    detail: `${finding.id} — ${finding.message}`,
  };
}

/** The rule-id → DriftKind keyword fold behind `findingToDrift`. */
function driftKind(id: string): DriftEntry["kind"] {
  const section = id.includes("section");
  if (id.includes("order")) return "order-changed";
  if (id.includes("unknown") || id.includes("unexpected") || id.includes("extra")) {
    return section ? "section-added" : "field-added";
  }
  if (id.includes("missing") || id.includes("absent") || id.includes("required")) {
    return section ? "section-removed" : "field-removed";
  }
  return "field-changed";
}

/**
 * Drift check — the daemon-side mirror of `init --check`: run the EXISTING
 * config over the tree; any error-level finding means the corpus drifted from
 * the committed contract. Error findings become the drift entries (via the
 * heuristic fold above); warn-level findings ride along as advisory warnings.
 */
export function checkVault(entry: VaultRegistryEntry): DriftResult {
  requireConfig(entry);
  const config = loadConfigFile(entry.configPath);
  const { findings } = runCorpus(config, { cwd: entry.path });
  const errors = findings.filter((f) => f.level === "error");
  return {
    drifted: errors.length > 0,
    entries: errors.map(findingToDrift),
    warnings: findings.filter((f) => f.level === "warn").map((f) => `${f.path}: ${f.message}`),
  };
}

/**
 * Scaffold contracts for a vault — `markdown-contract init <root>` through the
 * CLI's pure core, streams captured into the response. `--meta` so each top-level
 * doc family gets its own contract (the shape `validate` auto-discovers).
 */
export async function initVault(
  entry: VaultRegistryEntry,
  req: InitVaultRequest,
): Promise<InitVaultResponse> {
  const argv = ["init", entry.path, "--meta"];
  if (req.dryRun) argv.push("--dry-run");
  if (req.force) argv.push("--force");
  const { code, stdout, stderr } = await runCli(argv, { cwd: entry.path });
  return { code, stdout, stderr };
}
