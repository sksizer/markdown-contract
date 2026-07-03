import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/02-multiple-required-sequence.md
// A level holding several required sections; presence is checked per-section,
// order unconstrained. The absent section's exact line is engine-defined, so
// only id + level are pinned.
const v02: ValidationFixture = {
  id: "v02",
  title: "Multiple required sections",
  component: "structure",
  path: "note.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Title"),
        section("Overview"),
        section("Status"),
      ]),
    }),
  cases: [
    {
      label: "pass — all three required sections present",
      source: loadSource(import.meta.url, "./02-multiple-required-sequence.pass.md"),
      findings: [],
    },
    {
      label: "fail — Overview dropped; only the absent one is flagged",
      source: loadSource(import.meta.url, "./02-multiple-required-sequence.fail.md"),
      findings: [{ id: "structure/section-missing", level: "error" }],
    },
  ],
};

export default v02;
