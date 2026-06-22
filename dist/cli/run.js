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
import { runCorpus } from "../runner/index.js";
import { formatHuman, formatJson, formatSarif } from "./format.js";
const USAGE = "usage: markdown-contract validate <path> [--format human|json|sarif] [--config <file>]";
const DEFAULT_CONFIG_NAMES = ["markdown-contract.config.js", "markdown-contract.config.mjs"];
const VALID_FORMATS = new Set(["human", "json", "sarif"]);
/**
 * The pure, testable CLI core. Parses `argv` (everything after `node bin`), loads the
 * config, runs the corpus, formats the findings, and returns the exit code plus the
 * captured stdout/stderr. NEVER calls `process.exit` and NEVER writes to real streams.
 *
 * Exit codes (AC-2): `0` clean, `1` error-level findings present, `2` usage/config
 * error (unknown command, bad/missing config, unsupported config extension, bad
 * `--format`). The `2` cases are raised here; `0`/`1` come straight from `runCorpus`.
 */
export async function runCli(argv, opts) {
    const cwd = opts?.cwd ?? process.cwd();
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            options: {
                format: { type: "string", default: "human" }, // human | json | sarif
                config: { type: "string" },
                help: { type: "boolean", short: "h" },
            },
            allowPositionals: true,
        });
    }
    catch (err) {
        return { code: 2, stdout: "", stderr: `markdown-contract: ${err.message}\n${USAGE}` };
    }
    const { values, positionals } = parsed;
    // `--help` → usage on stdout, exit 0. No args at all → usage on stderr, exit 2.
    if (values.help)
        return { code: 0, stdout: USAGE, stderr: "" };
    if (positionals.length === 0)
        return { code: 2, stdout: "", stderr: USAGE };
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
    // Resolve the run root: an explicit `<path>` scopes the traversal to that subtree
    // (it becomes the runner's cwd); otherwise the run covers the whole `cwd`.
    const pathArg = rest[0];
    const runRoot = pathArg ? resolve(cwd, pathArg) : cwd;
    if (!existsSync(runRoot)) {
        return { code: 2, stdout: "", stderr: `markdown-contract: path not found: ${pathArg}` };
    }
    // Load the config. The config's globs are written relative to the config's own
    // directory / the run root, so config resolution is anchored at `cwd`.
    let config;
    try {
        config = await loadConfig(cwd, values.config);
    }
    catch (err) {
        return { code: 2, stdout: "", stderr: `markdown-contract: ${err.message}` };
    }
    let result;
    try {
        result = runCorpus(config, { cwd: runRoot });
    }
    catch (err) {
        // A runtime failure inside the runner (e.g. a contract throwing) is a config/usage
        // problem from the CLI's vantage: exit 2 with the message rather than crash.
        return { code: 2, stdout: "", stderr: `markdown-contract: ${err.message}` };
    }
    const stdout = format === "json"
        ? formatJson(result.findings)
        : format === "sarif"
            ? formatSarif(result.findings)
            : formatHuman(result.findings);
    return { code: result.exitCode, stdout, stderr: "" };
}
/**
 * Load a `CorpusConfig` from a `.js`/`.mjs` module via dynamic `import()`. With an
 * explicit `--config`, that path (resolved against `cwd`) is used; otherwise the
 * default names are probed in `cwd`. The module's `default` export is the config.
 * A `.ts` config (or any unsupported extension), a missing file, or a module without
 * a `default` export each throw — the caller maps the throw to a `2` exit.
 */
async function loadConfig(cwd, configFlag) {
    let configPath;
    if (configFlag) {
        configPath = isAbsolute(configFlag) ? configFlag : resolve(cwd, configFlag);
        if (!existsSync(configPath)) {
            throw new Error(`config not found: ${configFlag}`);
        }
    }
    else {
        const found = DEFAULT_CONFIG_NAMES.map((n) => resolve(cwd, n)).find((p) => existsSync(p));
        if (!found) {
            throw new Error(`no config found (looked for ${DEFAULT_CONFIG_NAMES.join(", ")}); pass --config <file>`);
        }
        configPath = found;
    }
    if (!/\.(?:js|mjs)$/.test(configPath)) {
        throw new Error(`unsupported config extension: ${configPath} (only .js/.mjs are supported; a .ts config needs a loader)`);
    }
    const mod = (await import(pathToFileURL(configPath).href));
    const config = mod.default;
    if (!config || typeof config !== "object" || !Array.isArray(config.rules)) {
        throw new Error(`config ${configPath} must \`export default\` a CorpusConfig ({ rules: [...] })`);
    }
    return config;
}
//# sourceMappingURL=run.js.map