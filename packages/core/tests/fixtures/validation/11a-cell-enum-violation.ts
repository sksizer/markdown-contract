import { z } from "zod";
import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/11a-cell-enum-violation.md
// One cell outside its declared z.enum → one localized cell finding. The provenance
// guessed `content/enum`; reconciled (T-5LW7) to the D-0004 `content/<leaf>/<check>`
// scheme → content/table/cell. The S7 row remap is now implemented (the finding
// localizes via rowPos(1) → the `rename` row on line 6), so line is pinned too.
const v11a: ValidationFixture = {
  id: "v11a",
  title: "Cell enum violation",
  component: "content",
  path: "docs/.../TASK.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Files to touch", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            cells: { Kind: z.enum(["add", "modify", "delete"]) },
          }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — every Kind cell in the enum",
      source: loadSource(import.meta.url, "./11a-cell-enum-violation.pass.md"),
      findings: [],
    },
    {
      label: "fail — row 2 Kind is rename, outside the enum",
      source: loadSource(import.meta.url, "./11a-cell-enum-violation.fail.md"),
      findings: [{ id: "content/table/cell", level: "error", line: 6 }],
    },
  ],
};

export default v11a;
