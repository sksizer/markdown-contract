/**
 * The pure, testable CLI core. Parses `argv` (everything after `node bin`), loads the
 * config, runs the corpus, formats the findings, and RETURNS the exit code plus the
 * captured stdout/stderr. NEVER calls `process.exit` and NEVER writes to real streams,
 * so it is unit-testable in-process (see `./index.test.ts`). The thin bin entry
 * (`./index.ts`) wraps this with the single `process.exit` site.
 *
 * Node-standard only (no Bun APIs). Imports flow one way: cli → runner → core.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { stringify as stringifyYaml } from "yaml";

import {
  compileContractObject,
  type InferOptions,
  type InferResult,
  type InferredContract,
  type InferredFile,
  inferConfig,
  loadConfigFile,
  loadContractFile,
} from "../declarative/index.js";
import { type CorpusConfig, runCorpus } from "../runner/index.js";
import { formatHuman, formatJson, formatRunSummary, formatSarif } from "./format.js";

const USAGE = [
  "usage: markdown-contract validate <path> [--format human|json|sarif]",
  "       [--config <file>] | [--contract <file>] | [--contract <file> --path <dir> ...]",
  "       [--glob <glob> ...] [--include <glob> ...] [--exclude <glob> ...]",
  "",
  "       markdown-contract init <dir> ... [--meta] [--depth <n>] [--relax] [--inline]",
  "       [--out <dir>] [--force] [--dry-run] [--check] [--infer-bounds]",
  "       [--max-const-len <n>] [--min-const-examples <n>]",
  "       [--glob <glob> ...] [--include <glob> ...] [--exclude <glob> ...]",
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
 * `parseArgs` over the CLI flag schema — extracted so `runCli` can name its exact
 * return type (`ReturnType<typeof parseCliArgs>`) instead of relying on an implicit
 * `any` for the `parsed` binding.
 */
function parseCliArgs(argv: string[]) {
  return parseArgs({
    args: argv,
    options: {
      format: { type: "string", default: "human" }, // human | json | sarif
      config: { type: "string" },
      contract: { type: "string", multiple: true }, // a YAML contract (repeatable for pairs)
      path: { type: "string", multiple: true }, // the target dir paired with each --contract
      glob: { type: "string", multiple: true }, // include filter (alias of --include), relative to run root
      include: { type: "string", multiple: true }, // include filter, relative to run root
      exclude: { type: "string", multiple: true }, // exclude filter, relative to run root
      help: { type: "boolean", short: "h" },
      // `init` flags (D-0009 § The CLI surface).
      meta: { type: "boolean" }, // emit a meta-config + per-dir contracts (default: single)
      depth: { type: "string" }, // directory cut for --meta (default 1; 0 == single)
      relax: { type: "boolean" }, // loosen generation toward a permissive floor
      inline: { type: "boolean" }, // one self-contained config instead of contracts/ files
      out: { type: "string" }, // where to write (default: cwd)
      force: { type: "boolean" }, // overwrite an existing config (default: refuse)
      "dry-run": { type: "boolean" }, // print the would-be files to stdout; write nothing
      check: { type: "boolean" }, // verify an existing config still accepts the tree
      "infer-bounds": { type: "boolean" }, // opt into pattern / min / max inference
      "max-const-len": { type: "string" }, // cap: strings longer than this never become const/enum
      "min-const-examples": { type: "string" }, // floor: a uniform scalar needs >= n docs to become const
    },
    allowPositionals: true,
  });
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
export async function runCli(argv: string[], opts?: { cwd?: string }): Promise<CliResult> {
  const cwd = opts?.cwd ?? process.cwd();

  let parsed: ReturnType<typeof parseCliArgs>;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: ${(err as Error).message}\n${USAGE}`,
    };
  }

  const { values, positionals } = parsed;

  // `--help` → usage on stdout, exit 0. No args at all → usage on stderr, exit 2.
  if (values.help) return { code: 0, stdout: USAGE, stderr: "" };
  if (positionals.length === 0) return { code: 2, stdout: "", stderr: USAGE };

  const [command, ...rest] = positionals;

  if (command === "init") {
    return runInit(cwd, rest, values);
  }

  if (command !== "validate") {
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: unknown command "${command}"\n${USAGE}`,
    };
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
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: use either --contract or --config, not both\n${USAGE}`,
    };
  }
  if (contracts.length === 0 && paths.length > 0) {
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: --path requires a matching --contract\n${USAGE}`,
    };
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
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: path not found: ${pathArg ?? runRoot}`,
    };
  }

  // Global glob pre-filter (relative to the run root), applied in EVERY mode incl.
  // --config. `--glob` is the friendly alias of `--include`; both feed the include set.
  const include = [...(values.glob ?? []), ...(values.include ?? [])];
  const exclude = values.exclude ?? [];

  let result: ReturnType<typeof runCorpus>;
  try {
    result = runCorpus(config, {
      cwd: runRoot,
      include: include.length > 0 ? include : undefined,
      exclude: exclude.length > 0 ? exclude : undefined,
    });
  } catch (err) {
    // A runtime failure inside the runner (e.g. a contract throwing) is a config/usage
    // problem from the CLI's vantage: exit 2 with the message rather than crash.
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
  }

  // The human format gains an additive run summary (total + per-contract counts) above the
  // findings report; json/sarif are byte-for-byte the bare finding outputs (summary is human-only).
  const stdout =
    format === "json"
      ? formatJson(result.findings)
      : format === "sarif"
        ? formatSarif(result.findings)
        : `${formatRunSummary(
            result.stats,
            config.rules.map((r) => r.name),
          )}\n\n${formatHuman(result.findings)}`;

  return { code: result.exitCode, stdout, stderr: "" };
}

/** The parsed-flag bag `runCli` threads into `runInit` (the `init`-relevant subset of `parseArgs` values). */
interface InitFlags {
  meta?: boolean;
  depth?: string;
  relax?: boolean;
  inline?: boolean;
  out?: string;
  force?: boolean;
  "dry-run"?: boolean;
  check?: boolean;
  "infer-bounds"?: boolean;
  "max-const-len"?: string;
  "min-const-examples"?: string;
  glob?: string[];
  include?: string[];
  exclude?: string[];
}

/** The default config filename `init` writes and `--check` loads back (a `markdown-contract.yaml` router/inline config). */
const INIT_CONFIG_NAME = "markdown-contract.yaml";

/**
 * `markdown-contract init <dir>…` — infer a tight-but-accepting config from existing markdown
 * (D-0009 § The CLI surface), then IO + self-check around the pure `inferConfig` pipeline.
 *
 * The pure inference is in `../declarative/infer`; this verb owns everything stateful around it:
 *  - **scope** — `--include` / `--exclude` / `--glob` choose which files feed inference, exactly
 *    as `validate` scopes a run; the same globs also scope the self-check.
 *  - **`--dry-run`** — print the would-be files to stdout and write nothing (exit 0).
 *  - **write** — otherwise write `result.files` under `--out` (default cwd), REFUSING to clobber
 *    an existing config without `--force` (exit 2). Single-contract mode additionally writes a
 *    `markdown-contract.yaml` router so `validate <dir>` auto-discovers the scaffold.
 *  - **self-check** — after writing, load the scaffold back through `loadConfigFile` and run it
 *    over the corpus via `runCorpus`; an error-level finding is an inferer bug, reported loudly
 *    (it should never happen — accept-by-construction, D-0009 § Self-check).
 *  - **`--check`** — do NOT infer or write: load the EXISTING config and run it over the tree;
 *    exit 0 if clean, 1 if any error-level finding (the CI drift guard).
 *
 * Multiple roots merge into one run: each root is inferred and self-checked against its own tree
 * (globs are run-root-relative, so each root's contracts are verified with that root as cwd), and
 * the emitted files carry every root's contracts. A summary (groups, files, warnings, self-check)
 * is printed to stdout; usage/config errors exit 2.
 */
function runInit(cwd: string, roots: string[], flags: InitFlags): CliResult {
  if (roots.length === 0) {
    return {
      code: 2,
      stdout: "",
      stderr: `markdown-contract: init needs at least one <dir>\n${USAGE}`,
    };
  }

  // --depth parses to a non-negative integer; a bad value is a usage error.
  let depth: number | undefined;
  if (flags.depth !== undefined) {
    depth = Number(flags.depth);
    if (!Number.isInteger(depth) || depth < 0) {
      return {
        code: 2,
        stdout: "",
        stderr: `markdown-contract: --depth must be a non-negative integer (got '${flags.depth}')`,
      };
    }
  }

  // --max-const-len: a non-negative integer (0 disables string const/enum). Bad value → usage error.
  let maxConstStringLength: number | undefined;
  if (flags["max-const-len"] !== undefined) {
    maxConstStringLength = Number(flags["max-const-len"]);
    if (!Number.isInteger(maxConstStringLength) || maxConstStringLength < 0) {
      return {
        code: 2,
        stdout: "",
        stderr: `markdown-contract: --max-const-len must be a non-negative integer (got '${flags["max-const-len"]}')`,
      };
    }
  }

  // --min-const-examples: an integer >= 1 (1 restores pinning on a single example). Bad value → usage error.
  let minConstExamples: number | undefined;
  if (flags["min-const-examples"] !== undefined) {
    minConstExamples = Number(flags["min-const-examples"]);
    if (!Number.isInteger(minConstExamples) || minConstExamples < 1) {
      return {
        code: 2,
        stdout: "",
        stderr: `markdown-contract: --min-const-examples must be an integer >= 1 (got '${flags["min-const-examples"]}')`,
      };
    }
  }

  const include = [...(flags.glob ?? []), ...(flags.include ?? [])];
  const exclude = flags.exclude ?? [];
  const scope = {
    include: include.length > 0 ? include : undefined,
    exclude: exclude.length > 0 ? exclude : undefined,
  };

  const absRoots = roots.map((r) => (isAbsolute(r) ? r : resolve(cwd, r)));
  for (const root of absRoots) {
    if (!existsSync(root)) {
      return { code: 2, stdout: "", stderr: `markdown-contract: path not found: ${root}` };
    }
  }

  const outDir = flags.out ? (isAbsolute(flags.out) ? flags.out : resolve(cwd, flags.out)) : cwd;

  // --check: verify an EXISTING config against the tree(s); never infer or write.
  if (flags.check === true) {
    return runInitCheck(absRoots, scope);
  }

  const opts: InferOptions = {
    meta: flags.meta === true,
    relax: flags.relax === true,
    inline: flags.inline === true,
    inferBounds: flags["infer-bounds"] === true,
    ...(depth !== undefined ? { depth } : {}),
    ...(maxConstStringLength !== undefined ? { maxConstStringLength } : {}),
    ...(minConstExamples !== undefined ? { minConstExamples } : {}),
    ...scope,
  };

  // Infer one result per root, then merge into the files to write (and verify per root).
  let results: InferResult[];
  try {
    results = absRoots.map((root) => inferConfig(root, opts));
  } catch (err) {
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
  }

  const files = mergeFiles(results, opts);

  // --dry-run: print the would-be files; write nothing.
  if (flags["dry-run"] === true) {
    return { code: 0, stdout: renderDryRun(files, results), stderr: "" };
  }

  // Refuse to clobber an existing config (the router, or any per-contract file) without --force.
  if (flags.force !== true) {
    const clash = files.map((f) => resolve(outDir, f.path)).find((p) => existsSync(p));
    if (clash !== undefined) {
      return {
        code: 2,
        stdout: "",
        stderr: `markdown-contract: refusing to overwrite ${clash} (pass --force to overwrite)`,
      };
    }
  }

  // Write every file under --out.
  try {
    for (const file of files) {
      const abs = resolve(outDir, file.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, file.content, "utf8");
    }
  } catch (err) {
    return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
  }

  // Self-check: load each root's contracts back and run them over that root (accept-by-construction).
  const selfCheckErrors = selfCheck(results, absRoots, scope);

  const summary = renderSummary(results, files, selfCheckErrors);
  // A self-check failure is an inferer bug, surfaced loudly with a non-zero exit.
  return selfCheckErrors.length > 0
    ? { code: 1, stdout: summary, stderr: "" }
    : { code: 0, stdout: summary, stderr: "" };
}

/**
 * `--check` (D-0009 § Self-check): load the EXISTING config near each root and run it over the
 * tree. No inference, no write. Exit 0 when every root is clean, 1 when any error-level finding
 * appears (a doc drifted from the inferred shape — the CI drift guard). A missing config is a
 * usage error (exit 2): `--check` verifies a config that already exists.
 */
function runInitCheck(
  absRoots: string[],
  scope: { include?: string[]; exclude?: string[] },
): CliResult {
  let hadError = false;
  const lines: string[] = [];
  for (const root of absRoots) {
    const configPath = resolve(root, INIT_CONFIG_NAME);
    if (!existsSync(configPath)) {
      return {
        code: 2,
        stdout: "",
        stderr: `markdown-contract: no config to --check at ${configPath}`,
      };
    }
    let result: ReturnType<typeof runCorpus>;
    try {
      result = runCorpus(loadConfigFile(configPath), { cwd: root, ...scope });
    } catch (err) {
      return { code: 2, stdout: "", stderr: `markdown-contract: ${(err as Error).message}` };
    }
    const errors = result.findings.filter((f) => f.level === "error");
    if (errors.length > 0) hadError = true;
    lines.push(
      `check ${root}: ${errors.length === 0 ? "clean" : `${errors.length} error finding(s) — drifted`}`,
    );
  }
  return { code: hadError ? 1 : 0, stdout: lines.join("\n"), stderr: "" };
}

/**
 * Merge each root's `InferResult.files` into the single set the verb writes. In meta mode every
 * root already emits a self-contained `markdown-contract.yaml` (+ `contracts/`), so the files
 * pass through (a multi-root run keeps the first root's config as the discoverable router; the
 * self-check verifies each root independently). In single-contract mode each root emits one
 * `<name>.contract.yaml`; the verb additionally synthesizes a `markdown-contract.yaml` router
 * over those contracts so `validate <dir>` auto-discovers the scaffold (D-0009 § Step 5 leaves
 * single mode as a bare contract file; the router is the discovery affordance the verb adds).
 */
function mergeFiles(results: InferResult[], opts: InferOptions): InferredFile[] {
  if (opts.meta === true) {
    // Meta mode: each root self-describes. Keep the first root's router/contracts as the output;
    // additional roots' files are de-duplicated by path (first wins) so a re-run diffs cleanly.
    const seen = new Set<string>();
    const out: InferredFile[] = [];
    for (const r of results) {
      for (const f of r.files) {
        if (!seen.has(f.path)) {
          seen.add(f.path);
          out.push(f);
        }
      }
    }
    return out;
  }

  // Single mode: write each root's contract file + a router that references them all.
  const contracts: InferredContract[] = results.flatMap((r) => r.contracts);
  const files: InferredFile[] = results.flatMap((r) => r.files);
  const registry: Record<string, string> = {};
  for (const c of contracts) registry[c.name] = `./${c.name}.contract.yaml`;
  const router = {
    mcVersion: 1,
    kind: "config",
    contracts: registry,
    rules: contracts.map((c) => ({ include: c.include, contract: c.name })),
  };
  return [{ path: INIT_CONFIG_NAME, content: stringifyYaml(router) }, ...files];
}

/**
 * Self-check the written scaffold (D-0009 § Self-check): compile each root's contracts and run
 * them over that root via `runCorpus`. Each root is checked with itself as cwd, so the run-root-
 * relative globs route exactly the files inference saw. Returns the error-level findings (a
 * non-empty list means an emitted constraint is tighter than the data allows — an inferer bug).
 */
function selfCheck(
  results: InferResult[],
  absRoots: string[],
  scope: { include?: string[]; exclude?: string[] },
): string[] {
  const errors: string[] = [];
  results.forEach((r, i) => {
    const root = absRoots[i]!;
    // Compile each contract on its own so a build-time guard (e.g. contract/key-collision) is
    // reported as a clean, attributed self-check failure — naming the contract and its globs —
    // instead of escaping as an uncaught throw that crashes the verb (T-KCOL).
    const rules: CorpusConfig["rules"] = [];
    let compileFailed = false;
    for (const c of r.contracts) {
      try {
        rules.push({ include: c.include, contract: compileContractObject(c.def) });
      } catch (err) {
        errors.push(
          `${root}: contract '${c.name}' (${c.include.join(", ")}) failed to compile — ${(err as Error).message}`,
        );
        compileFailed = true;
      }
    }
    if (compileFailed) return;
    let findings: ReturnType<typeof runCorpus>["findings"];
    try {
      findings = runCorpus({ rules }, { cwd: root, ...scope }).findings;
    } catch (err) {
      errors.push(`${root}: self-check failed to run — ${(err as Error).message}`);
      return;
    }
    for (const f of findings) {
      if (f.level === "error") errors.push(`${root}: ${f.path} — ${f.id} (${f.message})`);
    }
  });
  return errors;
}

/** Render the `--dry-run` output: each would-be file as a `# path` banner followed by its content. */
function renderDryRun(files: InferredFile[], results: InferResult[]): string {
  const blocks = files.map((f) => `# ${f.path}\n${f.content}`);
  const warnings = results.flatMap((r) => r.warnings);
  const trailer = warnings.length > 0 ? [``, `# warnings:`, ...warnings.map((w) => `#  ${w}`)] : [];
  return [...blocks, ...trailer].join("\n").trimEnd();
}

/** Render the post-write human summary: groups/files, any warnings, and the self-check verdict. */
function renderSummary(
  results: InferResult[],
  files: InferredFile[],
  selfCheckErrors: string[],
): string {
  const groups = results.reduce((n, r) => n + r.contracts.length, 0);
  const warnings = results.flatMap((r) => r.warnings);
  const lines = [
    `init: inferred ${groups} contract(s); wrote ${files.length} file(s):`,
    ...files.map((f) => `  ${f.path}`),
  ];
  for (const w of warnings) lines.push(`warning: ${w}`);
  lines.push(
    selfCheckErrors.length === 0
      ? `self-check: clean (the scaffold accepts its own corpus)`
      : `self-check: FAILED — the scaffold rejects its own corpus (this is an inferer bug):`,
  );
  for (const e of selfCheckErrors) lines.push(`  ${e}`);
  return lines.join("\n");
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
    return {
      config: { rules: [{ include: ["**/*.md"], contract: load(contracts[0]!) }] },
      runRoot,
    };
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
