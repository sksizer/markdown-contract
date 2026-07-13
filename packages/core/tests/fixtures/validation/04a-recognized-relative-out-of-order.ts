import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/04a-recognized-relative-out-of-order.md
// Two recognized sections in the wrong relative order. Gaps & questions: None.
// The FAIL sample is given verbatim and the finding localizes to the Title
// heading on line 5.
const v04a: ValidationFixture = {
  id: "v04a",
  title: "Recognized sections out of declared order",
  component: "structure",
  path: "docs/.../sample.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Title"),
        section("Overview"),
        section("Status"),
      ]),
    }),
  cases: [
    {
      label: "pass — recognized order kept, unknown interleaves",
      source: loadSource(import.meta.url, "./04a-recognized-relative-out-of-order.pass.md"),
      findings: loadExpected(
        import.meta.url,
        "./04a-recognized-relative-out-of-order.pass.expected.json",
      ),
    },
    {
      label: "fail — Overview (declared 2nd) precedes Title (declared 1st)",
      source: loadSource(import.meta.url, "./04a-recognized-relative-out-of-order.fail.md"),
      findings: loadExpected(
        import.meta.url,
        "./04a-recognized-relative-out-of-order.fail.expected.json",
      ),
    },
  ],
};

export default v04a;
