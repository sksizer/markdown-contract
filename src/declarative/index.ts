/**
 * `markdown-contract/declarative` — the declarative front-end (D-0008).
 *
 * Compiles a versioned YAML contract document into the engine's runtime `Contract`, so a
 * consumer can author contracts as data (no TypeScript) and get identical findings and the
 * same typed model. This is a front-end over `core`; it never modifies the engine, and the
 * one-way layering (cli → runner → core; declarative → core) is preserved.
 *
 * v1 covers the frontmatter + structure + content planes as pure declarative YAML. The code
 * escape hatch (`$ref`) and cross-cutting rules are deferred (D-0008 § Out of scope).
 */
export { loadContract, loadContractFile, compileContractObject } from "./load.js";
export { loadConfig, loadConfigFile } from "./config.js";
export { DeclarativeError } from "./errors.js";
export type { DeclarativeDoc } from "./parse.js";
// Config inference (D-0009): the `init` pipeline that scaffolds a tight-but-accepting config.
export { inferConfig } from "./infer.js";
export type {
  InferOptions,
  InferredContract,
  InferredFile,
  InferResult,
} from "./infer.js";
