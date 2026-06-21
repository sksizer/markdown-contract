import { expect, test } from "vitest";

import {
  code,
  contract,
  ContractError,
  defineConfig,
  docRule,
  gap,
  list,
  maxWords,
  oneOf,
  optional,
  parse,
  rule,
  runCorpus,
  section,
  sections,
  table,
  VERSION,
} from "./index.js";

test("library exposes a version string", () => {
  expect(typeof VERSION).toBe("string");
});

test("every documented runtime export is defined", () => {
  // Combinators + projection + leaves + runner — all functions.
  const fns = {
    parse,
    contract,
    sections,
    section,
    optional,
    oneOf,
    gap,
    rule,
    docRule,
    table,
    list,
    code,
    maxWords,
    runCorpus,
    defineConfig,
  };
  for (const [name, fn] of Object.entries(fns)) {
    expect(typeof fn, name).toBe("function");
  }

  // ContractError is a constructor.
  expect(typeof ContractError).toBe("function");
  const err = new ContractError([], "boom");
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe("ContractError");
  expect(Array.isArray(err.findings)).toBe(true);
});

test("calling a still-unimplemented op throws a clear 'not implemented' error", () => {
  // `parse` is implemented as of T-2HF6 — it returns a DocTree, it does not throw.
  const tree = parse("## A\n\nx\n");
  expect(tree.root.sections[0]?.name).toBe("A");

  // `validate` runs as of the structure plane (T-8RJ5): it returns a ValidationResult
  // (findings + the projection), never throwing. `read` is still stubbed until the typed
  // model + error-gate land (T-3NC8 / T-6PV4).
  const c = contract({});
  const result = c.validate("x", { path: "f.md" });
  expect(Array.isArray(result.findings)).toBe(true);
  expect(result.tree.root).toBeDefined();
  expect(() => c.read("x", { path: "f.md" })).toThrowError(/not implemented/);
});
