import { contract, sections, section, code } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/13a-code-wrong-lang.md
// Edge on 13: the code leaf rejects a mismatched (or absent) fence language.
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
      findings: [],
    },
    {
      label: "fail — fence tagged python rejected",
      source: loadSource(import.meta.url, "./13a-code-wrong-lang.fail.md"),
      findings: [{ id: "content/code-lang", level: "error", line: 3 }],
    },
  ],
};

export default v13a;
