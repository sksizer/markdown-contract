/**
 * `markdown-contract/declarative` — the declarative front-end (D-0008).
 *
 * Compiles a versioned YAML contract document into the engine's runtime `Contract`, so a
 * consumer can author contracts as data (no TypeScript) and get identical findings and the
 * same typed model. This is a front-end over `core`; it never modifies the engine, and the
 * one-way layering (cli → runner → core; declarative → core) is preserved.
 *
 * `mcVersion: 2` (D-0020) covers the frontmatter + structure + content planes as pure
 * declarative YAML — v1 is retired (the codemod in `scripts/migrate-v1-to-v2.ts` migrates).
 * The code escape hatch (`$ref`) and cross-cutting rules are deferred (D-0008 § Out of scope).
 */

export { loadConfig, loadConfigFile } from "./config.js";
export { DeclarativeError } from "./errors.js";
export type {
  InferOptions,
  InferResult,
  InferredContract,
  InferredFile,
} from "./infer.js";
// Config inference (D-0009): the `init` pipeline that scaffolds a tight-but-accepting config.
export { inferConfig } from "./infer.js";
export { compileContractObject, loadContract, loadContractFile } from "./load.js";
export type { DeclarativeDoc } from "./parse.js";
