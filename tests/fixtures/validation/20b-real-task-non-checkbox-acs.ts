import {
  contract,
  sections,
  section,
  optional,
  oneOf,
  list,
  table,
  docRule,
} from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/20b-real-task-non-checkbox-acs.md
// Two content-leaf failures firing together on one real task: a Kind cell outside the
// enum and a ## Acceptance criteria list written as plain bullets.
const v20b: ValidationFixture = {
  id: "v20b",
  title: "Real task with non-checkbox acceptance criteria",
  component: "validate",
  path: "docs/planning/tasks/T-132J.md",
  note:
    "TaskFrontmatter is imported from ./schema.ts in the example — reconstructed here as an inlined " +
    "Zod schema admitting planning/backlog. The example's docRule returns bare finding literals " +
    "(missing path); rewritten to ctx.finding(...) to type-check.",
  build: () => {
    const TaskFrontmatter = z
      .object({
        id: z.string().regex(/^T-[0-9A-Z]{4}$/),
        type: z.literal("task").optional(),
        status: z.enum([
          "planning/backlog",
          "open/ready",
          "in-progress/active",
          "closed/done",
          "closed/superseded",
        ]),
        impact: z.enum(["low", "medium", "high"]).optional(),
        complexity: z.enum(["small", "medium", "large"]).optional(),
      })
      .strict();

    return contract({
      frontmatter: TaskFrontmatter,
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        oneOf(["Goal", "Goal / Problem statement"]),
        oneOf(["Today", "Current state"]),
        section("Files to touch", {
          optional: true,
          content: table({
            columns: ["Location", "Kind", "Change"],
            cells: { Kind: z.enum(["add", "modify", "delete"]) },
          }),
        }),
        section("Acceptance criteria", {
          content: list({ everyItem: "checkbox", minItems: 1 }),
        }),
        optional(section("Completion note")),
      ]),
      rules: [
        docRule("task/completion-note-when-closed", (doc, ctx) => {
          const fm = doc.frontmatter as { status: string };
          const body = doc.body as { section(name: string): unknown };
          return fm.status.startsWith("closed/") && !body.section("Completion note")
            ? [
                ctx.finding({
                  id: "task/completion-note-when-closed",
                  level: "error",
                  message: "a closed task must include a Completion note section",
                }),
              ]
            : [];
        }),
      ],
    });
  },
  cases: [
    {
      label: "pass — both bugs fixed: Kind add, ACs are checkboxes",
      source: loadSource(import.meta.url, "./20b-real-task-non-checkbox-acs.pass.md"),
      findings: [],
    },
    {
      label: "fail — Kind 'new' on row 2; both ACs plain bullets",
      source: loadSource(import.meta.url, "./20b-real-task-non-checkbox-acs.fail.md"),
      findings: [
        { id: "content/enum", level: "error", line: 19 },
        { id: "content/every-item", level: "error", line: 23 },
        { id: "content/every-item", level: "error", line: 24 },
      ],
    },
  ],
};

export default v20b;
