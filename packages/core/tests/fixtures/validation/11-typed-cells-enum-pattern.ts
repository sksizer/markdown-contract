import { z } from "zod";
import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/11-typed-cells-enum-pattern.md
// table({ cells: { Col: ZodType } }) — per-cell Zod over a declared column. The
// provenance guessed `table/cell`; reconciled (T-5LW7) to the D-0004
// `content/<leaf>/<check>` scheme → content/table/cell. Its row-precise pos is now
// pinned via rowPos(i), but the example pinned id-only, so only `id` is asserted here.
const v11: ValidationFixture = {
  id: "v11",
  title: "Typed cells: enum / pattern",
  component: "content",
  path: "docs/.../task.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Files", {
          content: table({
            columns: ["File", "Kind", "Location"],
            cells: {
              Kind: z.enum(["add", "modify", "delete"]),
              Location: z.string().regex(/^[A-Za-z0-9._/-]+\/$/),
            },
          }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — every Kind and Location cell conforms",
      source: loadSource(import.meta.url, "./11-typed-cells-enum-pattern.pass.md"),
      findings: [],
    },
    {
      label: "fail — row 2 Kind outside the enum",
      source: loadSource(import.meta.url, "./11-typed-cells-enum-pattern.fail.md"),
      findings: [{ id: "content/table/cell" }],
    },
  ],
};

export default v11;
