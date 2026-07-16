/**
 * `loadContract` — compile a declarative YAML contract document into a runtime `Contract`,
 * the same object `contract(...)` produces from the combinators (D-0008). A YAML-authored
 * contract is therefore indistinguishable downstream: same findings, same typed model.
 *
 * Compiles both planes: the **frontmatter** schema (schema-DSL → Zod) and the **body grammar**
 * (sections / leaves → the combinators). The document's `mcVersion` picks the compiler set:
 * v1 (D-0008) keeps the house dialect unchanged; v2 (D-0020) compiles the JSON-Schema-subset
 * frontmatter (`schema-v2.ts`), the v2 body vocabulary (`body-v2.ts`), and the contract-root
 * `description` (the outermost finding hint). Cross-cutting `rule` / `docRule`s and the `$ref`
 * code escape hatch remain deferred in both (D-0008 § Out of scope).
 */
import { readFileSync } from "node:fs";

import type { z } from "zod";

import { contract } from "../core/grammar.js";
import type { Contract, ContractDef } from "../core/types.js";
import { compileBody } from "./body.js";
import { compileBodyV2 } from "./body-v2.js";
import { DeclarativeError } from "./errors.js";
import { parseDeclarativeDoc } from "./parse.js";
import { compileObjectSchema } from "./schema.js";
import { compileObjectSchemaV2 } from "./schema-v2.js";
import { compileBodyTextRule } from "./text.js";

/** Compile a declarative YAML contract (text) into a runtime `Contract`. */
export function loadContract(yamlText: string): Contract {
  const doc = parseDeclarativeDoc(yamlText);
  if (doc.kind !== "contract") {
    throw new DeclarativeError(
      `expected a contract document (kind: contract), got kind: ${doc.kind}`,
    );
  }
  return compileContractObject(doc.raw, doc.mcVersion);
}

/** Read a `*.contract.yaml` file and compile it into a runtime `Contract`. */
export function loadContractFile(path: string): Contract {
  return loadContract(readFileSync(path, "utf8"));
}

/**
 * Build a `Contract` from a raw `{ frontmatter?, body?, … }` object (no envelope needed — used
 * by inline config contracts, which compile with their CONFIG document's `mcVersion`).
 * `mcVersion` defaults to 1 so existing callers keep the v1 compilers.
 */
export function compileContractObject(raw: Record<string, unknown>, mcVersion = 1): Contract {
  return mcVersion === 2 ? compileContractObjectV2(raw) : compileContractObjectV1(raw);
}

/** The v1 compiler set (D-0008) — byte-identical to the pre-v2 behavior. */
function compileContractObjectV1(raw: Record<string, unknown>): Contract {
  const def: ContractDef = {};

  if (raw.frontmatter !== undefined) {
    def.frontmatter = compileFrontmatter(raw.frontmatter) as unknown as ContractDef["frontmatter"];
  }

  if (raw.body !== undefined) {
    def.body = compileBody(raw.body) as unknown as ContractDef["body"];
    attachBodyTextRule(def, raw.body);
  }

  return contract(def);
}

/** The v2 compiler set (D-0020): JSON-Schema-subset frontmatter, v2 body vocabulary, root description. */
function compileContractObjectV2(raw: Record<string, unknown>): Contract {
  assertContractKeysV2(raw);
  const def: ContractDef = {};

  if (raw.description !== undefined) {
    if (typeof raw.description !== "string") {
      throw new DeclarativeError("contract: description must be a string");
    }
    def.description = raw.description;
  }

  if (raw.frontmatter !== undefined) {
    def.frontmatter = compileObjectSchemaV2(
      raw.frontmatter,
      "frontmatter",
    ) as unknown as ContractDef["frontmatter"];
  }

  if (raw.body !== undefined) {
    def.body = compileBodyV2(raw.body) as unknown as ContractDef["body"];
    attachBodyTextRule(def, raw.body);
  }

  return contract(def);
}

/** v2 keeps the contract root closed too: only the envelope plus the three contract planes. */
function assertContractKeysV2(raw: Record<string, unknown>): void {
  const allowed = new Set(["mcVersion", "kind", "frontmatter", "body", "description"]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new DeclarativeError(`contract: unknown key '${key}'`);
    }
  }
}

/**
 * `requires:` / `forbids:` on the body root (sibling of `sections:`) → one document-scoped
 * `textRule` docRule. The body grammar (`SectionSeq` / `LevelOpts`) cannot carry it, so it
 * attaches at the contract level (D-0011 § Match scope — body root); shared verbatim by v1
 * and v2. The body compiler has already verified `body` is a mapping.
 */
function attachBodyTextRule(def: ContractDef, body: unknown): void {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const docRule = compileBodyTextRule(body as Record<string, unknown>);
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic default-and-push
    if (docRule) (def.rules ??= []).push(docRule);
  }
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
