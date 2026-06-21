import { contract, sections, section, optional, oneOf } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/06-alias-sets-oneof.md
// oneOf(names) — one required slot, several interchangeable spellings.
// Gaps & questions: None. An unfilled slot emits one structure/section-missing;
// the absent-slot line is engine-defined, so only id + level are pinned.
const v06: ValidationFixture = {
  id: "v06",
  title: "Alias sets via oneOf",
  component: "structure",
  path: "docs/notes/goal.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        oneOf(["Goal", "Goal / Problem statement"]),
        optional(section("Notes")),
      ]),
    }),
  cases: [
    {
      label: "pass — short spelling present",
      source: loadSource(import.meta.url, "./06-alias-sets-oneof.pass-1.md"),
      findings: [],
    },
    {
      label: "pass — long spelling present, optional Notes omitted",
      source: loadSource(import.meta.url, "./06-alias-sets-oneof.pass-2.md"),
      findings: [],
    },
    {
      label: "fail — heading matches no alias spelling",
      source: loadSource(import.meta.url, "./06-alias-sets-oneof.fail.md"),
      findings: [{ id: "structure/section-missing", level: "error" }],
    },
  ],
};

export default v06;
