import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/14b-content-before-first-subheading.md
// Projection edge: pre-subheading blocks attach to the parent SectionNode.blocks;
// the children grammar resolves the H3s independently.
const v14b: ValidationFixture = {
  id: "v14b",
  title: "Content before the first sub-heading",
  component: "projection",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Decision", {
          children: sections({ order: "strict", allowUnknown: true }, [
            section("Components", {
              content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
            }),
          ]),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — lead paragraph and table sit in Decision.blocks; child grammar still matches",
      source: loadSource(import.meta.url, "./14b-content-before-first-subheading.pass.md"),
      findings: [],
    },
    {
      label: "fail — ### Components heading dropped; required subsection absent",
      source: loadSource(import.meta.url, "./14b-content-before-first-subheading.fail.md"),
      findings: [{ id: "structure/section-missing", level: "error", line: 1 }],
    },
  ],
};

export default v14b;
