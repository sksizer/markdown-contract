import {
  contract,
  sections,
  section,
  optional,
  oneOf,
  gap,
} from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/21-real-milestone-or-skill-doctype.md
// A third real entity contract (Milestone): a lenient body, a required Deliverables
// (or Tasks alias) whose free-named H3 categories are admitted by a nested gap().
const v21: ValidationFixture = {
  id: "v21",
  title: "Real Milestone / SKILL.md doc-type",
  component: "validate",
  path: "docs/.../milestones/M-0042.md",
  note:
    "The example's `list` import / per-entry checkbox enforcement is noted as a gap (gap() admits " +
    "free-named H3 subsections without attaching a content leaf), so `list` is not used here. The " +
    "FAIL is described by mutation (status open/wip, ## Deliverables dropped) and reconstructed.",
  build: () => {
    const MilestoneFrontmatter = z
      .object({
        id: z.string().regex(/^M-[0-9A-Z]{4}$/),
        status: z.enum(["open/draft", "open/active", "closed/done", "closed/abandoned"]),
        title: z.string().min(1),
        related: z.array(z.string()).default([]),
      })
      .strict();

    return contract({
      frontmatter: MilestoneFrontmatter,
      body: sections({ order: "none", allowUnknown: true }, [
        section("Goal"),
        section("Success criteria"),
        oneOf(["Deliverables", "Tasks"], {
          children: sections({ order: "none", allowUnknown: true }, [gap()]),
        }),
        optional(section("Out of scope")),
        optional(section("Risks / open questions")),
      ]),
    });
  },
  cases: [
    {
      label: "pass — conforming Milestone; H3 categories admitted by nested gap()",
      source: loadSource(import.meta.url, "./21-real-milestone-or-skill-doctype.pass.md"),
      findings: [],
    },
    {
      label: "fail — status open/wip off-enum; ## Deliverables dropped",
      source: loadSource(import.meta.url, "./21-real-milestone-or-skill-doctype.fail.md"),
      findings: [
        { id: "frontmatter/enum", level: "error", line: 3 },
        { id: "structure/section-missing", level: "error", line: 1 },
      ],
    },
  ],
};

export default v21;
