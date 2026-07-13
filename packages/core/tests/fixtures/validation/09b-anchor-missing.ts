import { contract, maxWords, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

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
      body: sections({}, [section("Summary", { anchor: "summary", content: maxWords(120) })]),
    }),
  cases: [
    {
      label: "pass — anchor present, prose under budget",
      source: loadSource(import.meta.url, "./09b-anchor-missing.pass.md"),
      findings: loadExpected(import.meta.url, "./09b-anchor-missing.pass.expected.json"),
    },
    {
      label: "fail — ^summary block-id absent, prose unchanged",
      source: loadSource(import.meta.url, "./09b-anchor-missing.fail.md"),
      findings: loadExpected(import.meta.url, "./09b-anchor-missing.fail.expected.json"),
    },
  ],
};

export default v09b;
