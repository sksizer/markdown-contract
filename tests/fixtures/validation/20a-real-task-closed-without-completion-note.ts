import { contract, sections, section, oneOf, list, table } from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/20a-real-task-closed-without-completion-note.md
// The frontmatter conditional closed/* ⇒ completion_note lives in the per-type Zod as a
// .refine, surfacing as a frontmatter/* finding — not a cross-plane docRule.
const v20a: ValidationFixture = {
  id: "v20a",
  title: "Closed task missing Completion note",
  component: "validate",
  path: "docs/planning/tasks/T-0006.md",
  build: () => {
    const TaskFrontmatter = z
      .object({
        id: z.string().regex(/^T-[0-9A-Z]{4}$/),
        status: z.enum([
          "planning/draft",
          "open/ready",
          "in-progress/active",
          "closed/done",
          "closed/superseded",
        ]),
        completion_note: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      })
      .strict()
      .refine((fm) => !fm.status.startsWith("closed/") || fm.completion_note !== undefined, {
        path: ["completion_note"],
        message: "a closed task must record a completion_note",
      });

    return contract({
      frontmatter: TaskFrontmatter,
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        oneOf(["Goal", "Goal / Problem statement"]),
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
      ]),
    });
  },
  cases: [
    {
      label: "pass — closed task carries its completion_note frontmatter key",
      source: loadSource(import.meta.url, "./20a-real-task-closed-without-completion-note.pass.md"),
      findings: [],
    },
    {
      label: "fail — status closed/done with no completion_note key",
      source: loadSource(import.meta.url, "./20a-real-task-closed-without-completion-note.fail.md"),
      findings: [{ id: "frontmatter/refine", level: "error", line: 5 }],
    },
  ],
};

export default v20a;
