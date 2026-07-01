import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/10-table-leaf-columns-minrows.md
// table({ columns, minRows }) content leaf. Gaps & questions: None. FAIL drops the
// data rows → content/table/min-rows on the table header, line 3.
// Note (T-5LW7): the provenance pinned the bare `table/min-rows`; reconciled to the
// D-0004 `content/<leaf>/<check>` scheme (content/table/min-rows), the id the
// validator emits. Level + line are unchanged.
const v10: ValidationFixture = {
  id: "v10",
  title: "Table leaf: columns + minRows",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Files", {
          content: table({ columns: ["Location", "Kind", "Change"], minRows: 1 }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — columns match and two data rows",
      source: loadSource(import.meta.url, "./10-table-leaf-columns-minrows.pass.md"),
      findings: [],
    },
    {
      label: "fail — header-only table, zero data rows",
      source: loadSource(import.meta.url, "./10-table-leaf-columns-minrows.fail.md"),
      findings: [{ id: "content/table/min-rows", level: "error", line: 3 }],
    },
  ],
};

export default v10;
