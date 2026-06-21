import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/10a-table-empty-and-minrows.md
// A header-only table with the right columns but zero data rows. The leaf id
// (content/table-min-rows) and level are inferred, not documented, so only `id`
// is pinned.
const v10a: ValidationFixture = {
  id: "v10a",
  title: "Empty table / below minRows",
  component: "content",
  path: "docs/.../task.md",
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
      label: "pass — columns match and one data row",
      source: loadSource(import.meta.url, "./10a-table-empty-and-minrows.pass.md"),
      findings: [],
    },
    {
      label: "fail — data row dropped, header-only table",
      source: loadSource(import.meta.url, "./10a-table-empty-and-minrows.fail.md"),
      findings: [{ id: "content/table-min-rows" }],
    },
  ],
};

export default v10a;
