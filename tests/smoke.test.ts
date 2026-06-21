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
} from "../src/index.js";

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

test("calling an unimplemented op throws a clear 'not implemented' error", () => {
  expect(() => parse("x")).toThrowError(/not implemented/);

  // `contract()` itself constructs (real-but-hollow), but its doors throw.
  const c = contract({});
  expect(() => c.validate("x", { path: "f.md" })).toThrowError(/not implemented/);
  expect(() => c.read("x", { path: "f.md" })).toThrowError(/not implemented/);
});
