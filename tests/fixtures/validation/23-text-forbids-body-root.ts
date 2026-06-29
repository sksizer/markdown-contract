import { contract, sections, section, textRule } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// D-0011 / C-0009 — body-root `forbids`: a phrase must be ABSENT from the WHOLE document.
// `textRule({ forbids: [...] })` attaches to the contract's `rules` slot and compiles to a
// cross-plane docRule over the whole-document text. `normalize: false` matches exact bytes —
// a retired path class that must appear nowhere (D-0011's worked `}scripts/` example).
//
// Greened by T-TXAP (the matcher + builders are live). The expected finding id is the
// synthesized per-entry id `text/forbids/doc/<patternHash>`. The forbid pins at the offending
// line: the `DocRule` sees only the typed `Doc`, which does not expose per-paragraph source
// lines, so the whole-document scope text anchors a section's prose just after its heading
// (heading line 1 + 1 = line 2) — one line early vs the source's line 3 (the document's blank
// line between heading and prose is invisible to the typed model). See the T-TXAP builder.
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
      findings: [{ id: "text/forbids/doc/o9pijh", level: "error", line: 2 }],
    },
  ],
  // No `.contract.yaml` parity peer yet — the declarative text-constraint loader
  // (T-TXYL) does not exist. T-TXYL adds the twin and drops this flag.
  peerless: true,
  note: "Synthesized id `text/forbids/doc/<hash>`; line is 2 (model anchors prose at heading+1), not the source's 3.",
};

export default v23;
