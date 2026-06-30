import { contract, sections, section, requires } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — occurrence count on a `requires` entry: a phrase must appear at least `min`
// times in the bound scope. Here every checklist step must be marked `DONE` — the section
// requires the `DONE` marker at least twice. A below-`min` document is a count violation,
// reported under the `text/count` area (distinct from a plain presence `text/requires` miss).
//
// GATED on `text-api` (skipped-green until T-TXAP lands the matcher + builders). The expected
// finding id is the illustrative `text/count` area id; T-TXAP tightens it to the synthesized
// per-entry id when it flips the flag.
const v24: ValidationFixture = {
  id: "v24",
  title: "Occurrence count — phrase must appear at least min times",
  component: "text-api",
  path: "docs/checklist.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Checklist", {
          rules: [requires([{ pattern: "DONE", min: 2, note: "every step must be marked DONE" }])],
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — 'DONE' appears twice, meeting the minimum",
      source: loadSource(import.meta.url, "./24-text-requires-count.pass.md"),
      findings: [],
    },
    {
      label: "fail — 'DONE' appears once, below min:2; the count fires at the heading",
      source: loadSource(import.meta.url, "./24-text-requires-count.fail.md"),
      findings: [{ id: "text/count", level: "error", line: 1 }],
    },
  ],
  // No `.contract.yaml` parity peer yet — the declarative text-constraint loader
  // (T-TXYL) does not exist. T-TXYL adds the twin and drops this flag.
  peerless: true,
  note: "Expected id is the illustrative `text/count` area id; tightened in T-TXAP.",
};

export default v24;
