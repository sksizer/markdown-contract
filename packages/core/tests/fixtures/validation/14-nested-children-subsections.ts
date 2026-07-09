import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/14-nested-children-subsections.md
// section({ children: sections(...) }) — a nested body grammar one level down.
const v14: ValidationFixture = {
  id: "v14",
  title: "Nested children (subsections)",
  component: "structure",
  path: "decision.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Decision", {
          children: sections({ order: "strict", allowUnknown: true }, [
            section("Components"),
            section("Resolution"),
          ]),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — child H3s match [Components, Resolution] in strict order",
      source: loadSource(import.meta.url, "./14-nested-children-subsections.pass.md"),
      findings: loadExpected(
        import.meta.url,
        "./14-nested-children-subsections.pass.expected.json",
      ),
    },
    {
      label: "fail — H3s swapped; child grammar is strict, out of order",
      source: loadSource(import.meta.url, "./14-nested-children-subsections.fail.md"),
      findings: loadExpected(
        import.meta.url,
        "./14-nested-children-subsections.fail.expected.json",
      ),
    },
  ],
};

export default v14;
