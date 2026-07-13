import { contract, oneOf, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/06a-oneof-none-present.md
// No member of a required oneOf set present → exactly one section-missing for the
// whole group. The id is inferred and the absent-group pos is under-specified, so
// only `id` is pinned.
const v06a: ValidationFixture = {
  id: "v06a",
  title: "No alias spelling present",
  component: "structure",
  path: "tasks/tidy-cache.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        oneOf(["Goal", "Goal / Problem statement", "Objective statement"]),
      ]),
    }),
  cases: [
    {
      label: "pass — one declared spelling present",
      source: loadSource(import.meta.url, "./06a-oneof-none-present.pass.md"),
      findings: loadExpected(import.meta.url, "./06a-oneof-none-present.pass.expected.json"),
    },
    {
      label: "fail — only an undeclared ## Objective heading present",
      source: loadSource(import.meta.url, "./06a-oneof-none-present.fail.md"),
      findings: loadExpected(import.meta.url, "./06a-oneof-none-present.fail.expected.json"),
    },
  ],
};

export default v06a;
