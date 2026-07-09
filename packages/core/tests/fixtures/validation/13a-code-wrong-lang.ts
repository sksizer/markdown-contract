import { code, contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: validation/13a-code-wrong-lang.md
// Edge on 13: the code leaf rejects a mismatched (or absent) fence language.
// Note (T-5LW7): the provenance inferred `content/code-lang`; reconciled to the
// D-0004 `content/<leaf>/<check>` scheme → content/code/lang. Level + line unchanged.
const v13a: ValidationFixture = {
  id: "v13a",
  title: "Code block wrong/absent language",
  component: "content",
  path: "docs/.../page.md",
  build: () =>
    contract({
      body: sections({}, [section("Example", { content: code({ lang: "ts" }) })]),
    }),
  cases: [
    {
      label: "pass — fence retagged ts",
      source: loadSource(import.meta.url, "./13a-code-wrong-lang.pass.md"),
      findings: loadExpected(import.meta.url, "./13a-code-wrong-lang.pass.expected.json"),
    },
    {
      label: "fail — fence tagged python rejected",
      source: loadSource(import.meta.url, "./13a-code-wrong-lang.fail.md"),
      findings: loadExpected(import.meta.url, "./13a-code-wrong-lang.fail.expected.json"),
    },
  ],
};

export default v13a;
