import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/21a-table-inside-blockquote-or-list.md
// A projection edge: a section's table authored inside a blockquote. The FAIL outcome
// is undecided (proposed-shape §7 defers it) and structure/table-missing is invented.
const v21a: ValidationFixture = {
  id: "v21a",
  title: "Table inside a blockquote / list item",
  component: "projection",
  path: "docs/.../milestone.md",
  note:
    "FAIL behaviour is not pinned: the example invents `structure/table-missing` and notes the " +
    "projection could instead hoist the quoted table (passing silently). id pinned only; the engine " +
    "may legitimately produce no finding here.",
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
      findings: [{ id: "structure/table-missing" }],
    },
  ],
};

export default v21a;
