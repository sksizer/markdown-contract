import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/10c-table-extra-column.md
// extraColumns: "error" reports an undeclared column. Gaps & questions: Resolved
// (C2) — content/table/column-extra (error) at the table's pos, line 3.
const v10c: ValidationFixture = {
  id: "v10c",
  title: "Table with an extra column",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Files", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            minRows: 1,
            extraColumns: "error",
          }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — only the three declared columns",
      source: loadSource(import.meta.url, "./10c-table-extra-column.pass.md"),
      findings: [],
    },
    {
      label: "fail — extra undeclared Owner column",
      source: loadSource(import.meta.url, "./10c-table-extra-column.fail.md"),
      findings: [{ id: "content/table/column-extra", level: "error", line: 3 }],
    },
  ],
};

export default v10c;
