import { contract, sections, section, requires } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — section-scoped `requires`: a phrase must be PRESENT in a section's subtree.
// `requires([{ pattern }])` attaches to the section's `rules` slot and compiles to a node-local
// rule over the section's text — the declarative twin of fixture 17's hand-written
// `summary/mentions-outcome` predicate ("the Summary section must mention the decision outcome").
//
// GATED on `text-api` (skipped-green until T-TXAP lands the matcher + builders). The expected
// finding id is the illustrative `text/requires` area id; T-TXAP tightens it to the synthesized
// per-entry id (`text/requires/<scopeKey>/<patternHash>`) when it flips the flag.
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
      findings: [{ id: "text/requires", level: "error", line: 1 }],
    },
  ],
  // No `.contract.yaml` parity peer yet — the declarative text-constraint loader
  // (T-TXYL) does not exist. T-TXYL adds the twin and drops this flag.
  peerless: true,
  note: "Expected id is the illustrative `text/requires` area id; tightened in T-TXAP.",
};

export default v22;
