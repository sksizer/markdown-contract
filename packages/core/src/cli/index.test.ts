/**
 * e2e tests for the corpus runner + the markdown-contract CLI (T-J9TZ).
 *
 * Two layers:
 *  - IN-PROCESS (`runCli` / `runCorpus`) over the checked-in SDLC-style fixture corpus
 *    (`tests/fixtures/corpus/`): a clean subtree exits 0, the failing corpus exits 1,
 *    `--format json|sarif` parse and carry the expected findings, and a bad/missing
 *    config exits 2. `runCli` returns `{ code, stdout, stderr }` and never exits, so
 *    these run with no subprocess.
 *  - THE BUILT BIN (AC-5): `spawnSync` the real `dist/cli/index.js` over the corpus and
 *    assert the exit code + parseable stdout.
 *
 * `runCli` and the spawned bin both load the config through a real Node `import()`. A
 * raw Node `import()` cannot resolve vitest-transformed `.ts`, so the corpus config
 * imports the engine from the published package name (`markdown-contract` → the built
 * `dist/index.js`); we therefore `npm run build` ONCE in a top-level `beforeAll` so
 * both `dist/index.js` (the config's import target) and `dist/cli/index.js` (the bin)
 * exist before any test runs.
 *
 * The fixture corpus (AC-6) holds two clean docs (a decision + a task) and one bad
 * decision (status outside the enum AND a missing required section ⇒ two error-level
 * findings); the config maps `D-*` / `T-*` globs to small inline contracts.
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { CorpusConfig, Finding } from "../index.js";
import { runCorpus } from "../index.js";
import { runCli } from "./index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CORPUS = resolve(HERE, "../../tests/fixtures/corpus");
const CONFIG = resolve(CORPUS, "markdown-contract.config.mjs");
const CLEAN_SUBTREE = resolve(CORPUS, "tasks"); // only the clean task lives here

/** Load the corpus config the same way `runCli`/the bin do — via a real Node import. */
async function loadConfig(): Promise<CorpusConfig> {
  const mod = (await import(pathToFileURL(CONFIG).href)) as { default: CorpusConfig };
  return mod.default;
}

// Build once: the config imports `markdown-contract` (→ dist/index.js) and the bin is
// dist/cli/index.js. Both must exist before any test in this file runs.
beforeAll(() => {
  execSync("npm run build", { cwd: REPO, stdio: "ignore" });
}, 120_000);

describe("runCli — in-process over the fixture corpus", () => {
  test("failing corpus → exit 1 (the bad decision has error-level findings)", async () => {
    const r = await runCli(["validate", CORPUS, "--config", CONFIG], { cwd: CORPUS });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("finding(s)");
  });

  test("clean subtree → exit 0 (scoping to tasks/ covers only the clean task)", async () => {
    const r = await runCli(["validate", CLEAN_SUBTREE, "--config", CONFIG], { cwd: CORPUS });
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
  });

  test("--format json parses and contains the expected finding ids", async () => {
    const r = await runCli(["validate", CORPUS, "--config", CONFIG, "--format", "json"], {
      cwd: CORPUS,
    });
    expect(r.code).toBe(1);
    const findings = JSON.parse(r.stdout) as Finding[];
    expect(Array.isArray(findings)).toBe(true);
    const ids = findings.map((f) => f.id);
    // The bad decision fires a frontmatter enum error and a missing-section error.
    expect(ids).toContain("frontmatter/enum");
    expect(ids).toContain("structure/section-missing");
    // Every finding carries its file path (stamped by ctx.path).
    expect(findings.every((f) => typeof f.path === "string" && f.path.length > 0)).toBe(true);
  });

  test("--format sarif parses and is SARIF 2.1.0-shaped", async () => {
    const r = await runCli(["validate", CORPUS, "--config", CONFIG, "--format", "sarif"], {
      cwd: CORPUS,
    });
    const log = JSON.parse(r.stdout) as {
      version: string;
      $schema: string;
      runs: Array<{
        tool: { driver: { name: string; rules: Array<{ id: string }> } };
        results: Array<{
          ruleId: string;
          level: string;
          message: { text: string };
          locations: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>;
        }>;
      }>;
    };
    expect(log.version).toBe("2.1.0");
    expect(typeof log.$schema).toBe("string");
    expect(log.runs[0]?.tool.driver.name).toBe("markdown-contract");
    const results = log.runs[0]?.results ?? [];
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((x) => x.ruleId)).toContain("frontmatter/enum");
    // SARIF levels map error→error; the enum finding is error-level.
    expect(results.some((x) => x.level === "error")).toBe(true);
    expect(results[0]?.locations[0]?.physicalLocation.artifactLocation.uri).toBeTruthy();
  });

  test("missing config → exit 2 with a clear message", async () => {
    const r = await runCli(["validate", CORPUS, "--config", resolve(CORPUS, "nope.mjs")], {
      cwd: CORPUS,
    });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("config not found");
  });

  test("unsupported .ts config → exit 2", async () => {
    const r = await runCli(
      ["validate", CORPUS, "--config", resolve(CORPUS, "..", "..", "harness.ts")],
      { cwd: CORPUS },
    );
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("unsupported config extension");
  });

  test("unknown command → exit 2", async () => {
    const r = await runCli(["frobnicate"], { cwd: CORPUS });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("unknown command");
  });

  test("--help → usage on stdout, exit 0", async () => {
    const r = await runCli(["--help"], { cwd: CORPUS });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("usage:");
  });

  test("no args → usage on stderr, exit 2", async () => {
    const r = await runCli([], { cwd: CORPUS });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("usage:");
  });

  test("bad --format → exit 2", async () => {
    const r = await runCli(["validate", CORPUS, "--config", CONFIG, "--format", "xml"], {
      cwd: CORPUS,
    });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("unknown --format");
  });
});

describe("runCorpus — pure library API", () => {
  test("aggregates findings and returns exit 1 on an error-level finding", async () => {
    const config = await loadConfig();
    const { findings, exitCode } = runCorpus(config, { cwd: CORPUS });
    expect(exitCode).toBe(1);
    expect(findings.some((f) => f.level === "error")).toBe(true);
  });

  test("clean subtree aggregates no error-level finding ⇒ exit 0", async () => {
    const config = await loadConfig();
    const { findings, exitCode } = runCorpus(config, { cwd: CLEAN_SUBTREE });
    expect(exitCode).toBe(0);
    expect(findings.some((f) => f.level === "error")).toBe(false);
  });
});

describe("the built bin (AC-5)", () => {
  test("spawn the real bin over the corpus → exit 1, parseable json stdout", () => {
    const bin = resolve(REPO, "dist/cli/index.js");
    const r = spawnSync("node", [bin, "validate", CORPUS, "--config", CONFIG, "--format", "json"], {
      cwd: CORPUS,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    const findings = JSON.parse(r.stdout) as Finding[];
    expect(Array.isArray(findings)).toBe(true);
    expect(findings.map((f) => f.id)).toContain("frontmatter/enum");
  });

  test("spawn the real bin over the clean subtree → exit 0", () => {
    const bin = resolve(REPO, "dist/cli/index.js");
    const r = spawnSync("node", [bin, "validate", CLEAN_SUBTREE, "--config", CONFIG], {
      cwd: CORPUS,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
  });
});
