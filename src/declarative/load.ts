/**
 * `loadContract` — compile a declarative YAML contract document into a runtime `Contract`,
 * the same object `contract(...)` produces from the combinators (D-0008). A YAML-authored
 * contract is therefore indistinguishable downstream: same findings, same typed model.
 *
 * This step of the series compiles the **frontmatter plane** (the schema-DSL → Zod). The
 * **body grammar** (sections / leaves) lands in the next PR; until then a document carrying a
 * `body` is rejected with a clear `DeclarativeError` rather than silently ignored.
 */
import { readFileSync } from "node:fs";

import type { z } from "zod";

import { contract } from "../core/grammar.js";
import type { Contract, ContractDef } from "../core/types.js";
import { DeclarativeError } from "./errors.js";
import { parseDeclarativeDoc } from "./parse.js";
import { compileObjectSchema } from "./schema.js";

/** Compile a declarative YAML contract (text) into a runtime `Contract`. */
export function loadContract(yamlText: string): Contract {
  const doc = parseDeclarativeDoc(yamlText);
  if (doc.kind !== "contract") {
    throw new DeclarativeError(`expected a contract document (kind: contract), got kind: ${doc.kind}`);
  }
  return compileContract(doc.raw);
}

/** Read a `*.contract.yaml` file and compile it into a runtime `Contract`. */
export function loadContractFile(path: string): Contract {
  return loadContract(readFileSync(path, "utf8"));
}

function compileContract(raw: Record<string, unknown>): Contract {
  const def: ContractDef = {};

  if (raw.frontmatter !== undefined) {
    def.frontmatter = compileFrontmatter(raw.frontmatter) as unknown as ContractDef["frontmatter"];
  }

  if (raw.body !== undefined) {
    // The body-grammar + content-leaf compiler lands in the next PR of the series.
    throw new DeclarativeError(
      "body grammar is not yet supported in this build (frontmatter/schema step); it lands in the next PR of the series",
    );
  }

  return contract(def);
}

function compileFrontmatter(fm: unknown): z.ZodType {
  if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
    throw new DeclarativeError("frontmatter must be a mapping with an optional 'strict' flag and a 'fields' map");
  }
  const node = fm as Record<string, unknown>;
  return compileObjectSchema(node.fields, node.strict === true, "frontmatter");
}
