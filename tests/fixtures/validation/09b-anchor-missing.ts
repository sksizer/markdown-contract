import { contract, sections, section, maxWords } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/09b-anchor-missing.md
// The anchor-missing failure in isolation: content leaf valid, only the ^summary
// block-id removed. Gaps & questions: None. The finding localizes to the
// ## Summary heading on line 1.
const v09b: ValidationFixture = {
  id: "v09b",
  title: "Required ^anchor absent",
  component: "structure",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Summary", { anchor: "summary", content: maxWords(120) }),
      ]),
    }),
  cases: [
    {
      label: "pass — anchor present, prose under budget",
      source: loadSource(import.meta.url, "./09b-anchor-missing.pass.md"),
      findings: [],
    },
    {
      label: "fail — ^summary block-id absent, prose unchanged",
      source: loadSource(import.meta.url, "./09b-anchor-missing.fail.md"),
      findings: [{ id: "structure/anchor-missing", level: "error", line: 1 }],
    },
  ],
};

export default v09b;
