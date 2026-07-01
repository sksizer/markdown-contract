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
      // Reconciled (matches v11/v11a/v20b): the content plane's D-0004 id scheme is
      // `content/<leaf>/<check>`, so a cell-enum violation is `content/table/cell`, not the
      // provenance's best-effort `table/cell`. Row-precise pos: the offending `rename` row is on
      // line 10 (frontmatter 1-4, blank 5, heading 6, blank 7, header 8, separator 9, data 10);
      // the provenance's `line: 5` miscounted.
      findings: [{ id: "content/table/cell", level: "error", line: 10 }],
    },
  ],
};

export default v18;
