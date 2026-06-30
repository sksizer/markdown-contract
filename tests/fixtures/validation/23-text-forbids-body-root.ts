import { contract, sections, section, textRule } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — body-root `forbids`: a phrase must be ABSENT from the WHOLE document.
// `textRule({ forbids: [...] })` attaches to the contract's `rules` slot and compiles to a
// cross-plane docRule over the whole-document text. `normalize: false` matches exact bytes —
// a retired path class that must appear nowhere (D-0011's worked `}scripts/` example).
//
// GATED on `text-api` (skipped-green until T-TXAP lands the matcher + builders). The expected
// finding id is the illustrative `text/forbids` area id; T-TXAP tightens it to the synthesized
// per-entry id (`text/forbids/doc/<patternHash>`) when it flips the flag.
const v23: ValidationFixture = {
  id: "v23",
  title: "Body-root forbids — phrase must appear nowhere in the document",
  component: "text-api",
  path: "docs/skill.md",
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [section("Summary")]),
      rules: [
        textRule({
          forbids: [
            {
              pattern: "}scripts/",
              normalize: false,
              note: "route through the op substrate (sdlc <noun> <verb>)",
            },
          ],
        }),
      ],
    }),
  cases: [
    {
      label: "pass — the forbidden path class appears nowhere",
      source: loadSource(import.meta.url, "./23-text-forbids-body-root.pass.md"),
      findings: [],
    },
    {
      label: "fail — the document still reaches into }scripts/; the forbid fires at the line",
      source: loadSource(import.meta.url, "./23-text-forbids-body-root.fail.md"),
      findings: [{ id: "text/forbids", level: "error", line: 3 }],
    },
  ],
  // No `.contract.yaml` parity peer yet — the declarative text-constraint loader
  // (T-TXYL) does not exist. T-TXYL adds the twin and drops this flag.
  peerless: true,
  note: "Expected id is the illustrative `text/forbids` area id; tightened in T-TXAP.",
};

export default v23;
