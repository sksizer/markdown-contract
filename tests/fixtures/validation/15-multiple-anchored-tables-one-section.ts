import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/15-multiple-anchored-tables-one-section.md
// The content-record form: several anchor-bound table leaves in one section.
// Note (T-5LW7): the provenance guessed `table/column-mismatch` for the risks table
// dropping a declared column; reconciled to the D-0004 `content/<leaf>/<check>` scheme
// → content/table/column-missing (one per missing column). The provenance pinned
// line 9, but the risks table header (node.pos) is source line 8; line corrected to 8.
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
      findings: [{ id: "content/table/column-missing", level: "error", line: 8 }],
    },
  ],
};

export default v15;
