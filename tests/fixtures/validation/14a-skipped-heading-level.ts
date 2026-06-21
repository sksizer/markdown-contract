import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/14a-skipped-heading-level.md
// Edge on 14: an H4 under an H2 skips H3. The FAIL id/behaviour is invented in the
// example (proposed-shape defers this projection edge), so only the id is pinned.
const v14a: ValidationFixture = {
  id: "v14a",
  title: "Skipped heading level (H2 to H4)",
  component: "projection",
  path: "docs/.../README.md",
  note:
    "The example invents `structure/heading-depth-jump` and flags the FAIL behaviour as undecided " +
    "(proposed-shape §7 defers heading-depth-jump). id pinned; level/line left as stated but provisional.",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Decision", {
          children: sections({ order: "strict", allowUnknown: true }, [
            section("Components", {
              content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
            }),
          ]),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — well-formed H3 Components nested under H2 Decision",
      source: loadSource(import.meta.url, "./14a-skipped-heading-level.pass.md"),
      findings: [],
    },
    {
      label: "fail — Components is H4, skipping H3",
      source: loadSource(import.meta.url, "./14a-skipped-heading-level.fail.md"),
      findings: [{ id: "structure/heading-depth-jump", level: "error", line: 5 }],
    },
  ],
};

export default v14a;
