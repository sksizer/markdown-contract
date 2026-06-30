import { contract, sections, section, requires } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — `regex` match spec: a single regex entry expresses an OR-of-literals (the
// v1 disjunction escape). The `Failure modes` section must document at least one lease failure
// marker — `LEASE-CONFLICT ref=` or `LEASE-MISSING ref=` — captured as one alternation. A
// regex miss reports like a `requires` miss, at the section heading.
//
// Greened by T-TXAP (the matcher + builders are live). The expected finding id is the
// synthesized per-entry id `text/requires/<scopeKey>/<patternHash>` (scopeKey = the section's
// generated camel key `failureModes`); a regex miss reports like a `requires` miss, at the heading.
const v25: ValidationFixture = {
  id: "v25",
  title: "Regex requires — one alternation entry expresses OR-of-literals",
  component: "text-api",
  path: "docs/skill.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Failure modes", {
          rules: [requires([{ regex: "LEASE-(CONFLICT|MISSING) ref=", note: "lease failure markers" }])],
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — a LEASE-CONFLICT marker matches the alternation",
      source: loadSource(import.meta.url, "./25-text-regex.pass.md"),
      findings: [],
    },
    {
      label: "fail — no lease marker present; the regex require fires at the heading",
      source: loadSource(import.meta.url, "./25-text-regex.fail.md"),
      findings: [{ id: "text/requires/failureModes/17j7bdw", level: "error", line: 1 }],
    },
  ],
  // No `.contract.yaml` parity peer yet — the declarative text-constraint loader
  // (T-TXYL) does not exist. T-TXYL adds the twin and drops this flag.
  peerless: true,
  note: "Synthesized id `text/requires/failureModes/<hash>`; a regex miss pins at the heading.",
};

export default v25;
