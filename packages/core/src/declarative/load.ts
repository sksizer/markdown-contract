/**
 * `loadContract` — compile a declarative YAML contract document into a runtime `Contract`,
 * the same object `contract(...)` produces from the combinators (D-0008). A YAML-authored
 * contract is therefore indistinguishable downstream: same findings, same typed model.
 *
 * Compiles both planes: the **frontmatter** schema (schema-DSL → Zod) and the **body grammar**
 * (sections / leaves → the combinators). Cross-cutting `rule` / `docRule`s and the `$ref` code
 * escape hatch are deferred and not part of v1 (D-0008 § Out of scope).
 */
import { readFileSync } from "node:fs";

import type { z } from "zod";

import { contract } from "../core/grammar.js";
import type { Contract, ContractDef } from "../core/types.js";
import { compileBody } from "./body.js";
import { DeclarativeError } from "./errors.js";
import { parseDeclarativeDoc } from "./parse.js";
import { compileObjectSchema } from "./schema.js";
import { compileBodyTextRule } from "./text.js";

/** Compile a declarative YAML contract (text) into a runtime `Contract`. */
export function loadContract(yamlText: string): Contract {
  const doc = parseDeclarativeDoc(yamlText);
  if (doc.kind !== "contract") {
    throw new DeclarativeError(
      `expected a contract document (kind: contract), got kind: ${doc.kind}`,
    );
  }
  return compileContractObject(doc.raw);
}

/** Read a `*.contract.yaml` file and compile it into a runtime `Contract`. */
export function loadContractFile(path: string): Contract {
  return loadContract(readFileSync(path, "utf8"));
}

/** Build a `Contract` from a raw `{ frontmatter?, body? }` object (no envelope needed — used by inline config contracts). */
export function compileContractObject(raw: Record<string, unknown>): Contract {
  const def: ContractDef = {};

  if (raw.frontmatter !== undefined) {
    def.frontmatter = compileFrontmatter(raw.frontmatter) as unknown as ContractDef["frontmatter"];
  }

  if (raw.body !== undefined) {
    def.body = compileBody(raw.body) as unknown as ContractDef["body"];
    // `requires:` / `forbids:` on the body root (sibling of `sections:`) → one document-scoped
    // `textRule` docRule. The body grammar (`SectionSeq` / `LevelOpts`) cannot carry it, so it
    // attaches at the contract level (D-0011 § Match scope — body root). `compileBody` has already
    // verified `raw.body` is a mapping.
    if (raw.body !== null && typeof raw.body === "object" && !Array.isArray(raw.body)) {
      const docRule = compileBodyTextRule(raw.body as Record<string, unknown>);
      if (docRule) (def.rules ??= []).push(docRule);
    }
  }

  return contract(def);
}

function compileFrontmatter(fm: unknown): z.ZodType {
  if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
    throw new DeclarativeError(
      "frontmatter must be a mapping with an optional 'strict' flag and a 'fields' map",
    );
  }
  const node = fm as Record<string, unknown>;
  return compileObjectSchema(node.fields, node.strict === true, "frontmatter");
}
