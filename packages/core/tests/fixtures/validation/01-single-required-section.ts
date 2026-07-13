import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/01-single-required-section.md
// The base case: one required H2 resolved by exact, case-sensitive heading text.
const v01: ValidationFixture = {
  id: "v01",
  title: "Single required section",
  component: "structure",
  path: "notes/rollout.md",
  build: () =>
    contract({
      body: sections({}, [section("Overview")]),
    }),
  cases: [
    {
      label: "pass — required ## Overview present",
      source: loadSource(import.meta.url, "./01-single-required-section.pass.md"),
      findings: loadExpected(import.meta.url, "./01-single-required-section.pass.expected.json"),
    },
    {
      label: "fail — only H2 renamed, required section absent",
      source: loadSource(import.meta.url, "./01-single-required-section.fail.md"),
      findings: loadExpected(import.meta.url, "./01-single-required-section.fail.expected.json"),
    },
  ],
};

export default v01;
