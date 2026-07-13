import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/04-recognized-relative-order.md
// order: "recognized-relative" — recognized sections keep declared order while
// unknowns interleave freely. FAIL inverts a recognized pair. The reordered FAIL
// doc is described, not given verbatim, so the line is left open.
const v04: ValidationFixture = {
  id: "v04",
  title: "Ordering: recognized-relative",
  component: "structure",
  path: "docs/note.md",
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
      label: "pass — recognized order kept, Extra interleaves in a gap",
      source: loadSource(import.meta.url, "./04-recognized-relative-order.pass.md"),
      findings: loadExpected(import.meta.url, "./04-recognized-relative-order.pass.expected.json"),
    },
    {
      label: "fail — Overview precedes Title, recognized pair reversed",
      source: loadSource(import.meta.url, "./04-recognized-relative-order.fail.md"),
      findings: loadExpected(import.meta.url, "./04-recognized-relative-order.fail.expected.json"),
    },
  ],
};

export default v04;
