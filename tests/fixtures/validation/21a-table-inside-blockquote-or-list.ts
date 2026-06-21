import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/21a-table-inside-blockquote-or-list.md
// A projection edge: a section's table authored inside a blockquote. Resolved: D4 says the
// quoted table is NOT hoisted to section.blocks, so the declared table slot finds no block —
// the structure kind-gate fires `structure/block-missing` (the invented `table-missing` folds
// into the existing kind-gate id, as 15a/15 already do).
const v21a: ValidationFixture = {
  id: "v21a",
  title: "Table inside a blockquote / list item",
  component: "validate",
  path: "docs/.../milestone.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Deliverables", {
          content: table({ columns: ["Item", "Status"], minRows: 1 }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — table at section top level projects to a table BlockNode",
      source: loadSource(import.meta.url, "./21a-table-inside-blockquote-or-list.pass.md"),
      findings: [],
    },
    {
      label: "fail — table quoted inside a > blockquote; declared table unreachable",
      source: loadSource(import.meta.url, "./21a-table-inside-blockquote-or-list.fail.md"),
      findings: [{ id: "structure/block-missing" }],
    },
  ],
};

export default v21a;
