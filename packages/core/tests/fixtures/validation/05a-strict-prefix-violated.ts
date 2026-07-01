import { contract, sections, section, optional, gap } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/05a-strict-prefix-violated.md
// An unknown section inside the strict prefix → structure/section-order.
// Gaps & questions: None; the FAIL sample is verbatim with Risks on line 5.
const v05a: ValidationFixture = {
  id: "v05a",
  title: "Unknown inside the strict prefix",
  component: "structure",
  path: "docs/.../sample.md",
  build: () =>
    contract({
      body: sections({ order: "strict", allowUnknown: false }, [
        section("Title"),
        section("Overview"),
        section("Status"),
        gap(),
        optional(section("Appendix")),
      ]),
    }),
  cases: [
    {
      label: "pass — strict prefix [Title, Overview, Status]",
      source: loadSource(import.meta.url, "./05a-strict-prefix-violated.pass.md"),
      findings: [],
    },
    {
      label: "fail — unknown Risks sits inside the strict prefix",
      source: loadSource(import.meta.url, "./05a-strict-prefix-violated.fail.md"),
      findings: [{ id: "structure/section-order", level: "error", line: 5 }],
    },
  ],
};

export default v05a;
