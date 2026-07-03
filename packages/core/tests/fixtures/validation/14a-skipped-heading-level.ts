import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/14a-skipped-heading-level.md
// Edge on 14: an H4 under an H2 skips H3. Resolved: the engine emits
// `structure/heading-depth-jump` (warn, per D-0002 D3 / D-0003) at the deep heading —
// a contract-independent outline check re-derived from the preserved heading depth.
const v14a: ValidationFixture = {
  id: "v14a",
  title: "Skipped heading level (H2 to H4)",
  component: "validate",
  path: "docs/.../README.md",
  note:
    "heading-depth-jump is a warn (D-0002 D3), not an error — the engine scans the projected " +
    "tree for child.depth > parent.depth + 1 and warns at the deep heading.",
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
      findings: [{ id: "structure/heading-depth-jump", level: "warn", line: 5 }],
    },
  ],
};

export default v14a;
