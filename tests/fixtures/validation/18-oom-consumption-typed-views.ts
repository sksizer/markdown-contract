import { contract, sections, section, table } from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/18-oom-consumption-typed-views.md
// The §6 object model as a consumer surface: read(), TableView iteration, byAnchor,
// dual-key access. The FAIL arm shows read()'s error door (a cell outside the enum).
const v18: ValidationFixture = {
  id: "v18",
  title: "OOM consumption: typed rows, byAnchor, dual-key",
  component: "consumption",
  path: "docs/.../tasks/T-0042.md",
  build: () => {
    const TaskFrontmatter = z
      .object({
        id: z.string().regex(/^T-[0-9A-Z]{4}$/),
        status: z.enum(["open/ready", "in-progress/active", "closed/done"]),
      })
      .strict();

    return contract({
      frontmatter: TaskFrontmatter,
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Files to touch", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            cells: { Kind: z.enum(["new", "modify", "delete"]) },
          }),
        }),
      ]),
    });
  },
  cases: [
    {
      label: "pass — frontmatter matches; typed Files-to-touch table promotes to a field",
      source: loadSource(import.meta.url, "./18-oom-consumption-typed-views.pass.md"),
      findings: [],
    },
    {
      label: "fail — row 1 Kind 'rename' outside the enum; read() error door",
      source: loadSource(import.meta.url, "./18-oom-consumption-typed-views.fail.md"),
      findings: [{ id: "table/cell", level: "error", line: 5 }],
    },
  ],
};

export default v18;
