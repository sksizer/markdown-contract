import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/15-multiple-anchored-tables-one-section.md
// The content-record form: several anchor-bound table leaves in one section.
const v15: ValidationFixture = {
  id: "v15",
  title: "Multiple anchored tables in one section",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Decision", {
          content: {
            components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
            risks: table({ anchor: "risks", columns: ["Risk", "Mitigation"] }),
          },
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — both anchored tables resolve and match their declared columns",
      source: loadSource(import.meta.url, "./15-multiple-anchored-tables-one-section.pass.md"),
      findings: [],
    },
    {
      label: "fail — risks table drops the declared Mitigation column",
      source: loadSource(import.meta.url, "./15-multiple-anchored-tables-one-section.fail.md"),
      findings: [{ id: "table/column-mismatch", level: "error", line: 9 }],
    },
  ],
};

export default v15;
