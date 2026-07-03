import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/10b-table-missing-column.md
// A declared column absent from the table header. The id
// (content/table/column-missing) is inferred, not documented, so only `id` is
// pinned.
const v10b: ValidationFixture = {
  id: "v10b",
  title: "Table missing a declared column",
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
      label: "pass — all declared columns present, two rows",
      source: loadSource(import.meta.url, "./10b-table-missing-column.pass.md"),
      findings: [],
    },
    {
      label: "fail — Change column dropped from the header",
      source: loadSource(import.meta.url, "./10b-table-missing-column.fail.md"),
      findings: [{ id: "content/table/column-missing" }],
    },
  ],
};

export default v10b;
