/**
 * `loadConfig` — compile a declarative YAML meta-config (`kind: config`) into the runner's
 * `CorpusConfig` (D-0008 § meta-config). The data form of `defineConfig({ rules })`: a `rules`
 * list mapping `include` / `exclude` globs to a contract, plus an optional `contracts` name map.
 *
 * In v1 a contract ref is a `.yaml` contract file (resolved relative to the config file) or an
 * inline contract object. Referencing a code-authored `.js` / `.ts` contract module is the
 * deferred code escape (D-0008 § Out of scope) and is rejected with a clear error.
 */
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

import type { Contract } from "../core/types.js";
import type { CorpusConfig } from "../runner/index.js";
import { DeclarativeError } from "./errors.js";
import { compileContractObject, loadContractFile } from "./load.js";
import { parseDeclarativeDoc } from "./parse.js";

const isMap = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Compile a declarative YAML config (text) into a `CorpusConfig`. `baseDir` anchors contract-ref paths. */
export function loadConfig(yamlText: string, baseDir: string): CorpusConfig {
  const doc = parseDeclarativeDoc(yamlText);
  if (doc.kind !== "config") {
    throw new DeclarativeError(`expected a config document (kind: config), got kind: ${doc.kind}`);
  }
  return compileConfig(doc.raw, baseDir);
}

/** Read a YAML config file and compile it; contract refs resolve relative to the file's directory. */
export function loadConfigFile(path: string): CorpusConfig {
  const abs = resolve(path);
  return loadConfig(readFileSync(abs, "utf8"), dirname(abs));
}

function compileConfig(raw: Record<string, unknown>, baseDir: string): CorpusConfig {
  const contracts = isMap(raw.contracts) ? raw.contracts : {};
  if (!Array.isArray(raw.rules)) {
    throw new DeclarativeError("config.rules must be a list of { include, exclude?, contract }");
  }
  const rules = raw.rules.map((r, i) => compileRule(r, `rules[${i}]`, contracts, baseDir));
  return { rules };
}

function compileRule(
  rule: unknown,
  path: string,
  contracts: Record<string, unknown>,
  baseDir: string,
): { include: string[]; exclude?: string[]; contract: Contract; name?: string } {
  if (!isMap(rule)) throw new DeclarativeError(`${path}: a rule must be a mapping`);
  if (!Array.isArray(rule.include) || rule.include.length === 0 || !rule.include.every((g) => typeof g === "string")) {
    throw new DeclarativeError(`${path}.include must be a non-empty list of globs`);
  }
  const out: { include: string[]; exclude?: string[]; contract: Contract; name?: string } = {
    include: rule.include as string[],
    contract: resolveContract(rule.contract, `${path}.contract`, contracts, baseDir),
    // A string contract ref IS the human contract name (e.g. `capability`, `task`) — carry it as the
    // rule's label for the CLI run summary. Inline contract objects have no name, so leave it unset.
    name: typeof rule.contract === "string" ? rule.contract : undefined,
  };
  if ("exclude" in rule) {
    if (!Array.isArray(rule.exclude) || !rule.exclude.every((g) => typeof g === "string")) {
      throw new DeclarativeError(`${path}.exclude must be a list of globs`);
    }
    out.exclude = rule.exclude as string[];
  }
  return out;
}

function resolveContract(
  ref: unknown,
  path: string,
  contracts: Record<string, unknown>,
  baseDir: string,
): Contract {
  if (ref === undefined) throw new DeclarativeError(`${path}: a rule needs a contract (a name, a .yaml path, or an inline contract)`);
  if (isMap(ref)) {
    // An inline contract object (frontmatter? / body?) — no envelope needed here.
    return compileContractObject(ref);
  }
  if (typeof ref !== "string") {
    throw new DeclarativeError(`${path}: contract must be a name, a .yaml path, or an inline contract`);
  }
  // A name resolves through the `contracts` map; otherwise the string is itself a path.
  const target = typeof contracts[ref] === "string" ? (contracts[ref] as string) : ref;
  if (!/\.ya?ml$/i.test(target)) {
    throw new DeclarativeError(
      `${path}: in v1 a contract ref must be a .yaml file (got '${target}'); referencing a code-authored .js/.ts contract is the deferred code escape (D-0008)`,
    );
  }
  return loadContractFile(isAbsolute(target) ? target : resolve(baseDir, target));
}
