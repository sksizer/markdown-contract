/**
 * YAML artifact verification — parses each artifact and compiles it through the REAL
 * declarative front-end (`markdown-contract/declarative`, i.e. the packages/core dist
 * build), so a snippet that the engine would reject fails the check.
 *
 * Classification (level of verification per shape — see check-artifacts.ts):
 *   - `kind: contract` documents        → loadContract (full envelope + plane compile)
 *   - `kind: config` documents          → loadConfig with STUB contract files written
 *     for every referenced `*.contract.yaml` path (the referenced files are outside
 *     the artifact, so their content is not verified — only the config itself)
 *   - contract fragments (frontmatter/body, or a bare `- section:` list) → wrapped
 *     and compiled via compileContractObject
 *   - config fragments (bare `rules:`)  → wrapped in a synthesized envelope +
 *     contracts map, then loadConfig as above
 *   - GitHub-Actions step lists         → YAML parse + every `markdown-contract`
 *     line inside `run:` verified against the real CLI --help surface
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
// The real declarative front-end from the packages/core build (workspace dep).
import { compileContractObject, loadConfig, loadContract } from "markdown-contract/declarative";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { checkCliArtifact, type HelpSurface } from "./cli.js";

const STUB_CONTRACT = "mcVersion: 2\nkind: contract\nbody:\n  sections:\n    - section: Stub\n";

const isMap = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isGhaStep = (v: unknown): boolean => isMap(v) && ("run" in v || "uses" in v);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Collect every string contract ref (named map entries + per-rule `.yaml` paths). */
function contractRefsOf(doc: Record<string, unknown>): string[] {
  const refs: string[] = [];
  if (isMap(doc.contracts)) {
    for (const v of Object.values(doc.contracts)) if (typeof v === "string") refs.push(v);
  }
  if (Array.isArray(doc.rules)) {
    for (const rule of doc.rules) {
      if (isMap(rule) && typeof rule.contract === "string" && /\.ya?ml$/i.test(rule.contract)) {
        refs.push(rule.contract);
      }
    }
  }
  return refs;
}

/** Write stub files for every `*.yaml` contract ref so loadConfig can resolve them. */
function stubContractRefs(doc: Record<string, unknown>, baseDir: string): void {
  for (const ref of contractRefsOf(doc)) {
    if (!/\.ya?ml$/i.test(ref)) continue;
    const path = resolve(baseDir, ref);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, STUB_CONTRACT);
  }
}

/** A bare `rules:` fragment → a full `kind: config` doc with a synthesized contracts map. */
function wrapConfigFragment(doc: Record<string, unknown>): Record<string, unknown> {
  const contracts: Record<string, string> = isMap(doc.contracts)
    ? ({ ...doc.contracts } as Record<string, string>)
    : {};
  if (Array.isArray(doc.rules)) {
    for (const rule of doc.rules) {
      if (!isMap(rule) || typeof rule.contract !== "string") continue;
      // A bare name whose map entry lives outside the fragment: synthesize it.
      if (!/\.ya?ml$/i.test(rule.contract) && !(rule.contract in contracts)) {
        contracts[rule.contract] = `./${rule.contract}.contract.yaml`;
      }
    }
  }
  return { mcVersion: 2, kind: "config", contracts, rules: doc.rules };
}

/**
 * Verify one YAML artifact. `scratchDir` is a per-example directory used as the
 * config base dir (stub contract files land there); `help` verifies CLI lines
 * embedded in GitHub-Actions `run:` steps.
 */
export function checkYamlArtifact(
  artifact: string,
  scratchDir: string,
  help: HelpSurface,
): string[] {
  let doc: unknown;
  try {
    doc = parseYaml(artifact);
  } catch (err) {
    return [`invalid YAML: ${message(err)}`];
  }

  try {
    if (Array.isArray(doc)) {
      if (doc.length > 0 && doc.every(isGhaStep)) {
        // GitHub-Actions steps: parse-validated; verify embedded CLI invocations.
        const runs = doc
          .map((s) => (isMap(s) && typeof s.run === "string" ? s.run : ""))
          .join("\n");
        return checkCliArtifact(runs, help, false);
      }
      // A bare section-list fragment of a contract body.
      compileContractObject({ body: { sections: doc } });
      return [];
    }
    if (!isMap(doc)) return ["YAML document is neither a mapping nor a list"];

    if (doc.kind === "contract") {
      loadContract(artifact);
      return [];
    }
    if (doc.kind === "config") {
      mkdirSync(scratchDir, { recursive: true });
      stubContractRefs(doc, scratchDir);
      loadConfig(artifact, scratchDir);
      return [];
    }
    if ("rules" in doc && !("frontmatter" in doc) && !("body" in doc)) {
      // Config fragment (bare `rules:` list).
      const wrapped = wrapConfigFragment(doc);
      mkdirSync(scratchDir, { recursive: true });
      stubContractRefs(wrapped, scratchDir);
      loadConfig(stringifyYaml(wrapped), scratchDir);
      return [];
    }
    // Contract fragment ({ frontmatter?, body? } without the envelope).
    compileContractObject(doc);
    return [];
  } catch (err) {
    return [`declarative compile failed: ${message(err)}`];
  }
}
