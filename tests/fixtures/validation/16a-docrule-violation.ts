import {
  contract,
  sections,
  section,
  optional,
  oneOf,
  list,
  docRule,
} from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/16a-docrule-violation.md
// Edge on 16: both planes valid in isolation, yet the cross-plane combination is illegal.
const v16a: ValidationFixture = {
  id: "v16a",
  title: "docRule violation fires",
  component: "validate",
  path: "docs/planning/tasks/wire-up-export.md",
  build: () => {
    const TaskFrontmatter = z
      .object({
        id: z.string().regex(/^T-[0-9A-Z]{4}$/),
        status: z.enum(["open/ready", "in-progress/active", "closed/done", "closed/dropped"]),
        title: z.string().min(1),
      })
      .strict();

    const isWorked = (status: string) => status === "closed/done"; // worked = reached done

    return contract({
      frontmatter: TaskFrontmatter,
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        oneOf(["Goal", "Goal / Problem statement"]),
        section("Acceptance criteria", {
          content: list({ everyItem: "checkbox", minItems: 1 }),
        }),
        optional(
          section("Post-mortem", {
            children: sections({ order: "strict", allowUnknown: false }, [
              section("Acceptance criteria coverage"),
              section("What worked"),
              section("Friction and automation gaps"),
            ]),
          }),
        ),
      ]),
      rules: [
        docRule("task/post-mortem-when-worked", (doc, ctx) => {
          const fm = doc.frontmatter as { status: string };
          const body = doc.body as { section(name: string): unknown };
          return isWorked(fm.status) && !body.section("Post-mortem")
            ? [
                ctx.finding({
                  id: "task/post-mortem-when-worked",
                  message: "a worked task must include a ## Post-mortem section",
                }),
              ]
            : [];
        }),
      ],
    });
  },
  cases: [
    {
      label: "pass — worked task that carries its Post-mortem",
      source: loadSource(import.meta.url, "./16a-docrule-violation.pass.md"),
      findings: [],
    },
    {
      label: "fail — closed/done, Post-mortem absent; only the cross-plane rule fires",
      source: loadSource(import.meta.url, "./16a-docrule-violation.fail.md"),
      findings: [{ id: "task/post-mortem-when-worked", level: "error", line: 3 }],
    },
  ],
};

export default v16a;
