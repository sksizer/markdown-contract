/**
 * The pure, testable CLI core. Parses `argv` (everything after `node bin`), loads the
 * config, runs the corpus, formats the findings, and RETURNS the exit code plus the
 * captured stdout/stderr. NEVER calls `process.exit` and NEVER writes to real streams,
 * so it is unit-testable in-process (see `./index.test.ts`). The thin bin entry
 * (`./index.ts`) wraps this with the single `process.exit` site.
 *
 * Node-standard only (no Bun APIs). Imports flow one way: cli → runner → core.
 */
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { loadConfigFile, loadContractFile } from "../declarative/index.js";
import { runCorpus, type CorpusConfig } from "../runner/index.js";
import { formatHuman, formatJson, formatSarif } from "./format.js";

const USAGE = [
  "usage: markdown-contract validate <path> [--format human|json|sarif]",
  "       [--config <file>] | [--contract <file>] | [--contract <file> --path <dir> ...]",
].join("\n");

/** A single corpus rule (`include`/`exclude` globs → contract) — the unit a CorpusConfig holds. */
type Rule = CorpusConfig["rules"][number];

const DEFAULT_CONFIG_NAMES = [
  "markdown-contract.config.js",
  "markdown-contract.config.mjs",
  "markdown-contract.config.yaml",
  "markdown-contract.config.yml",
  "markdown-contract.yaml",
  "markdown-contract.yml",
];
const VALID_FORMATS = new Set(["human", "json", "sarif"]);

/** The result of the pure CLI core — what the thin wrapper writes and exits on. */
export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * The pure, testable CLI core. Parses `argv` (everything after `node bin`), loads the
 * config, runs the corpus, formats the findings, and returns the exit code plus the
 * captured stdout/stderr. NEVER calls `process.exit` and NEVER writes to real streams.
 *
 * Exit codes (AC-2): `0` clean, `1` error-level findings present, `2` usage/config
 * error (unknown command, bad/missing config, unsupported config extension, bad
 * `--format`). The `2` cases are raised here; `0`/`1` come straight from `runCorpus`.
 */
export async function runCli(
  argv: string[],
  opts?: { cwd?: string },
): Promise<CliResult> {
  const cwd = opts?.cwd ?? process.cwd();

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        format: { type: "string", default: "human" }, // human | json | sarif
        config: { type: "string" },
        contract: { type: "string", multiple: true }, // a YAML contract (repeatable for pairs)
        path: { type: "string", multiple: true }, // the target dir paired with each --contract
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
  } catch (err) {
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}\n${USAGE}` };
  }

  const { values, positionals } = parsed;

  // `--help` → usage on stdout, exit 0. No args at all → usage on stderr, exit 2.
  if (values.help) return { code: 0, stdout: USAGE, stderr: "" };
  if (positionals.length === 0) return { code: 2, stdout: "", stderr: USAGE };

  const [command, ...rest] = positionals;

  if (command !== "validate") {
    return { code: 2, stdout: "", stderr: `markdown-contract: unknown command "${command}"\n${USAGE}` };
  }

  const format = values.format ?? "human";
  if (!VALID_FORMATS.has(format)) {
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: unknown --format "${format}" (expected human|json|sarif)`,
    };
  }

  const pathArg = rest[0];
  const contracts = values.contract ?? [];
  const paths = values.path ?? [];

  // The contract binding comes from EITHER an inline `--contract` (one binary, config-less
  // parameterization — D-0008 § CLI parameterization) OR a `--config` file, never both.
  if (contracts.length > 0 && values.config !== undefined) {
    return { code: 2, stdout: "", stderr: `markdown-contract: use either --contract or --config, not both\n${USAGE}` };
  }
  if (contracts.length === 0 && paths.length > 0) {
    return { code: 2, stdout: "", stderr: `markdown-contract: --path requires a matching --contract\n${USAGE}` };
  }

  // Resolve the run root (the runner's cwd) and the `CorpusConfig`. Both inline and
  // file-config forms compile to one CorpusConfig run through the same `runCorpus`.
  let config: CorpusConfig;
  let runRoot: string;
  try {
    if (contracts.length > 0) {
      ({ config, runRoot } = buildInlineConfig(cwd, contracts, paths, pathArg));
    } else {
      runRoot = pathArg ? resolve(cwd, pathArg) : cwd;
      config = await loadConfig(cwd, values.config);
    }
  } catch (err) {
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
  }

  if (!existsSync(runRoot)) {
    return { code: 2, stdout: "", stderr: `markdown-contract: path not found: ${pathArg ?? runRoot}` };
  }

  let result: { findings: ReturnType<typeof runCorpus>["findings"]; exitCode: number };
  try {
    result = runCorpus(config, { cwd: runRoot });
  } catch (err) {
    // A runtime failure inside the runner (e.g. a contract throwing) is a config/usage
    // problem from the CLI's vantage: exit 2 with the message rather than crash.
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
  }

  const stdout =
    format === "json"
      ? formatJson(result.findings)
      : format === "sarif"
        ? formatSarif(result.findings)
        : formatHuman(result.findings);

  return { code: result.exitCode, stdout, stderr: "" };
}

/**
 * Build a `CorpusConfig` from inline `--contract` flags — the config-less parameterization
 * of the same binary (D-0008 § CLI parameterization). Two shapes:
 *
 * - **one contract, no `--path`**: apply that contract to every `*.md` under the positional
 *   `<path>` (the run root) — a single catch-all rule `include: ['**\/*.md']`.
 * - **paired `--contract` + `--path`**: one rule per pair, `include: ['<dir>/**\/*.md']`,
 *   matched relative to the run root (the cwd); a positional `<path>` is not used here.
 *
 * Contract refs must be `.yaml`/`.yml` (a code-authored contract is the deferred code escape).
 * Throws on a count mismatch or an unsupported ref; the caller maps the throw to a `2` exit.
 */
function buildInlineConfig(
  cwd: string,
  contracts: string[],
  paths: string[],
  pathArg?: string,
): { config: CorpusConfig; runRoot: string } {
  const load = (ref: string): Rule["contract"] => {
    if (!/\.ya?ml$/i.test(ref)) {
      throw new Error(
        `--contract must be a .yaml/.yml contract file (got '${ref}'); a code-authored contract is the deferred code escape`,
      );
    }
    return loadContractFile(isAbsolute(ref) ? ref : resolve(cwd, ref));
  };

  // Single contract over a tree: `validate <path> --contract x.yaml`.
  if (paths.length === 0) {
    if (contracts.length !== 1) {
      throw new Error(
        `multiple --contract needs a matching --path for each (got ${contracts.length} --contract and no --path)`,
      );
    }
    const runRoot = pathArg ? resolve(cwd, pathArg) : cwd;
    return { config: { rules: [{ include: ["**/*.md"], contract: load(contracts[0]!) }] }, runRoot };
  }

  // Paired routing: `validate --contract a.yaml --path d1 --contract b.yaml --path d2`.
  if (paths.length !== contracts.length) {
    throw new Error(
      `each --contract needs a matching --path (got ${contracts.length} --contract and ${paths.length} --path)`,
    );
  }
  if (pathArg !== undefined) {
    throw new Error(
      `a positional <path> can't be combined with --contract/--path pairs; the --path of each pair is its target`,
    );
  }
  const rules: Rule[] = contracts.map((ref, i) => {
    const dir = paths[i]!.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
    const include = dir === "" || dir === "." ? "**/*.md" : `${dir}/**/*.md`;
    return { include: [include], contract: load(ref) };
  });
  return { config: { rules }, runRoot: cwd };
}

/**
 * Load a `CorpusConfig` from a `.js`/`.mjs` module via dynamic `import()`. With an
 * explicit `--config`, that path (resolved against `cwd`) is used; otherwise the
 * default names are probed in `cwd`. The module's `default` export is the config.
 * A `.ts` config (or any unsupported extension), a missing file, or a module without
 * a `default` export each throw — the caller maps the throw to a `2` exit.
 */
async function loadConfig(cwd: string, configFlag?: string): Promise<CorpusConfig> {
  let configPath: string;
  if (configFlag) {
    configPath = isAbsolute(configFlag) ? configFlag : resolve(cwd, configFlag);
    if (!existsSync(configPath)) {
      throw new Error(`config not found: ${configFlag}`);
    }
  } else {
    const found = DEFAULT_CONFIG_NAMES.map((n) => resolve(cwd, n)).find((p) => existsSync(p));
    if (!found) {
      throw new Error(
        `no config found (looked for ${DEFAULT_CONFIG_NAMES.join(", ")}); pass --config <file>`,
      );
    }
    configPath = found;
  }

  // A declarative YAML config compiles to a CorpusConfig via the declarative front-end.
  if (/\.ya?ml$/i.test(configPath)) {
    return loadConfigFile(configPath);
  }

  if (!/\.(?:js|mjs)$/.test(configPath)) {
    throw new Error(
      `unsupported config extension: ${configPath} (only .js/.mjs/.yaml/.yml are supported; a .ts config needs a loader)`,
    );
  }

  const mod = (await import(pathToFileURL(configPath).href)) as { default?: unknown };
  const config = mod.default;
  if (!config || typeof config !== "object" || !Array.isArray((config as CorpusConfig).rules)) {
    throw new Error(
      `config ${configPath} must \`export default\` a CorpusConfig ({ rules: [...] })`,
    );
  }
  return config as CorpusConfig;
}
