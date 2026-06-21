import {
  contract,
  sections,
  section,
  optional,
  gap,
  table,
  maxWords,
} from "../../../src/index.js";
import { z } from "zod";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/19a-real-decision-three-findings.md
// The §5.3 combined-failure merge on a real Decision: one validate() pass trips
// frontmatter/enum, structure/anchor-missing, and structure/section-order, ordered
// by ascending pos.line.
const v19a: ValidationFixture = {
  id: "v19a",
  title: "Real Decision with the §5.3 failure trio",
  component: "validate",
  path: "docs/.../D-0099/README.md",
  build: () => {
    const DecisionFrontmatter = z
      .object({
        id: z.string().regex(/^D-[0-9A-Z]{4}$/),
        status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
        title: z.string().min(1),
        related: z.array(z.string()).default([]),
      })
      .strict();

    return contract({
      frontmatter: DecisionFrontmatter,
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Summary", { anchor: "summary", content: maxWords(120) }),
        section("Context"),
        section("Decision", {
          children: sections({ order: "strict", allowUnknown: true }, [
            section("Components", {
              content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
            }),
          ]),
        }),
        optional(section("Why")),
        optional(
          section("Options considered", {
            children: sections({ order: "none", allowUnknown: true }, [gap()]),
          }),
        ),
        optional(section("Consequences")),
        optional(section("Out of scope")),
        optional(section("Notes")),
      ]),
    });
  },
  cases: [
    {
      label: "pass — conforming: status in enum, ^summary anchored, Why after Decision",
      source: loadSource(import.meta.url, "./19a-real-decision-three-findings.pass.md"),
      findings: [],
    },
    {
      label: "fail — status open/draft, no ^summary, ## Why before ## Decision",
      source: loadSource(import.meta.url, "./19a-real-decision-three-findings.fail.md"),
      findings: [
        { id: "frontmatter/enum", level: "error", line: 3 },
        { id: "structure/anchor-missing", level: "error", line: 10 },
        { id: "structure/section-order", level: "error", line: 18 },
      ],
    },
  ],
};

export default v19a;
