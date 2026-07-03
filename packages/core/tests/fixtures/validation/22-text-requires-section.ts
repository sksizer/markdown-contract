import { contract, requires, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — section-scoped `requires`: a phrase must be PRESENT in a section's subtree.
// `requires([{ pattern }])` attaches to the section's `rules` slot and compiles to a node-local
// rule over the section's text — the declarative twin of fixture 17's hand-written
// `summary/mentions-outcome` predicate ("the Summary section must mention the decision outcome").
//
// Greened by T-TXAP (the matcher + builders are live). The expected finding id is the
// synthesized per-entry id `text/requires/<scopeKey>/<patternHash>` (scopeKey = the section's
// generated camel key `summary`); the require miss pins at the section heading (line 1).
const v22: ValidationFixture = {
  id: "v22",
  title: "Section-scoped requires — phrase must be present",
  component: "text-api",
  path: "docs/decision.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Summary", {
          rules: [requires([{ pattern: "outcome", note: "the decision outcome must be named" }])],
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — Summary prose contains 'outcome'",
      source: loadSource(import.meta.url, "./22-text-requires-section.pass.md"),
      findings: [],
    },
    {
      label: "fail — Summary never says 'outcome'; the require fires at the heading",
      source: loadSource(import.meta.url, "./22-text-requires-section.fail.md"),
      findings: [{ id: "text/requires/summary/1tc7itx", level: "error", line: 1 }],
    },
  ],
  note: "Synthesized per-entry id `text/requires/summary/<hash>`; the miss pins at the heading.",
};

export default v22;
