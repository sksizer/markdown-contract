import { contract, maxWords, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/09-section-content-leaf-maxwords-anchor.md
// section() with a content leaf (maxWords) + a required anchor. Gaps & questions:
// None. FAIL drops the anchor (prose stays under budget) → structure/anchor-missing
// localized to the ## Summary heading on line 1.
const v09: ValidationFixture = {
  id: "v09",
  title: "Section content leaf: maxWords + required anchor",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [section("Summary", { anchor: "summary", content: maxWords(120) })]),
    }),
  cases: [
    {
      label: "pass — under budget and ^summary anchor present",
      source: loadSource(import.meta.url, "./09-section-content-leaf-maxwords-anchor.pass.md"),
      findings: loadExpected(
        import.meta.url,
        "./09-section-content-leaf-maxwords-anchor.pass.expected.json",
      ),
    },
    {
      label: "fail — anchor dropped, prose still under budget",
      source: loadSource(import.meta.url, "./09-section-content-leaf-maxwords-anchor.fail.md"),
      findings: loadExpected(
        import.meta.url,
        "./09-section-content-leaf-maxwords-anchor.fail.expected.json",
      ),
    },
  ],
};

export default v09;
