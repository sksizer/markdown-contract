/**
 * `loadContract` — compile a declarative YAML contract document into a runtime `Contract`,
 * the same object `contract(...)` produces from the combinators (D-0008). A YAML-authored
 * contract is therefore indistinguishable downstream: same findings, same typed model.
 *
 * Compiles both planes: the **frontmatter** schema (the JSON-Schema-subset node,
 * `schema-v2.ts` → Zod) and the **body grammar** (the v2 vocabulary, `body-v2.ts` → the
 * combinators), plus the contract-root `description` (the outermost finding hint) —
 * `mcVersion: 2`, the only supported version (D-0020; v1 is retired). Cross-cutting
 * `rule` / `docRule`s and the `$ref` code escape hatch remain deferred (D-0008 § Out of scope).
 */
import { readFileSync } from "node:fs";

import { contract } from "../core/grammar.js";
import type { Contract, ContractDef } from "../core/types.js";
import { compileBodyV2 } from "./body-v2.js";
import { DeclarativeError } from "./errors.js";
import { parseDeclarativeDoc } from "./parse.js";
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
  return compileContractObject(doc.raw);
}

/** Read a `*.contract.yaml` file and compile it into a runtime `Contract`. */
export function loadContractFile(path: string): Contract {
  return loadContract(readFileSync(path, "utf8"));
}

/**
 * Build a `Contract` from a raw `{ description?, frontmatter?, body? }` object (no envelope
 * needed — used by inline config contracts): the v2 compiler set (D-0020) — JSON-Schema-subset
 * frontmatter, v2 body vocabulary, root description.
 */
export function compileContractObject(raw: Record<string, unknown>): Contract {
  assertContractKeys(raw);
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

/** The contract root is closed: only the envelope plus the three contract planes. */
function assertContractKeys(raw: Record<string, unknown>): void {
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
 * attaches at the contract level (D-0011 § Match scope — body root). The body compiler has
 * already verified `body` is a mapping.
 */
function attachBodyTextRule(def: ContractDef, body: unknown): void {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const docRule = compileBodyTextRule(body as Record<string, unknown>);
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic default-and-push
    if (docRule) (def.rules ??= []).push(docRule);
  }
}
