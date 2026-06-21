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

// Provenance: validation/19-real-decision-contract-end-to-end.md
// The §5.1 DecisionContract on a real SDLC Decision README: Zod frontmatter, a
// recognized-relative body, a nested children table subsection, a maxWords leaf.
const v19: ValidationFixture = {
  id: "v19",
  title: "Real Decision contract end-to-end",
  component: "validate",
  path: "docs/.../D-0042/README.md",
  note:
    "The example describes the FAIL by mutation (status open/draft, dropped ^summary, ## Consequences " +
    "moved above ## Context) rather than giving the literal doc; the FAIL source here is reconstructed " +
    "from those mutations, so the three findings pin id+level only (the example's lines 3/8/14 are " +
    "tied to its own reconstruction).",
  build: () => {
    const DecisionFrontmatter = z
      .object({
        id: z.string().regex(/^D-[0-9A-Z]{4}$/),
        status: z.enum([
          "open/proposed",
          "open/accepted",
          "closed/superseded",
          "closed/deprecated",
        ]),
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
      label: "pass — conforming Decision on both planes",
      source: loadSource(import.meta.url, "./19-real-decision-contract-end-to-end.pass.md"),
      findings: [],
    },
    {
      label: "fail — status off-enum, ^summary dropped, Consequences before Context",
      source: loadSource(import.meta.url, "./19-real-decision-contract-end-to-end.fail.md"),
      findings: [
        { id: "frontmatter/enum", level: "error" },
        { id: "structure/anchor-missing", level: "error" },
        { id: "structure/section-order", level: "error" },
      ],
    },
  ],
};

export default v19;
