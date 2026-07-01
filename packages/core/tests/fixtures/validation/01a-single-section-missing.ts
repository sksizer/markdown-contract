import { contract, sections, section } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/01a-single-section-missing.md
// Failure variant of 01: the one required section is absent. The id and the
// position of an absence are both hedged as under-specified, so only `id` is pinned.
const v01a: ValidationFixture = {
  id: "v01a",
  title: "Required section absent",
  component: "structure",
  path: "notes/widget.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [section("Overview")]),
    }),
  cases: [
    {
      label: "pass — required ## Overview present",
      source: loadSource(import.meta.url, "./01a-single-section-missing.pass.md"),
      findings: [],
    },
    {
      label: "fail — wrong heading, required Overview absent",
      source: loadSource(import.meta.url, "./01a-single-section-missing.fail.md"),
      findings: [{ id: "structure/section-missing" }],
    },
  ],
};

export default v01a;
