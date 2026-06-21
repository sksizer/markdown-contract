import { contract, sections, section, table } from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/11a-cell-enum-violation.md
// One cell outside its declared z.enum → one localized cell finding. The id
// (content/enum) is a guess and the row localization is the deferred S7 question,
// so only `id` is pinned.
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
      findings: [{ id: "content/enum" }],
    },
  ],
};

export default v11a;
