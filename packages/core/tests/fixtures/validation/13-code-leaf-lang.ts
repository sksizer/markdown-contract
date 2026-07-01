import { contract, sections, section, code } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/13-code-leaf-lang.md
// The code({ lang }) content leaf: assert the fence's info-string language.
// Note (T-5LW7): the provenance inferred `content/code-lang`; reconciled to the
// D-0004 `content/<leaf>/<check>` scheme → content/code/lang. Level + line unchanged.
const v13: ValidationFixture = {
  id: "v13",
  title: "Code leaf: language",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [section("Example", { content: code({ lang: "ts" }) })]),
    }),
  cases: [
    {
      label: "pass — fence tagged ts matches declared lang",
      source: loadSource(import.meta.url, "./13-code-leaf-lang.pass.md"),
      findings: [],
    },
    {
      label: "fail — fence tagged js does not match required ts",
      source: loadSource(import.meta.url, "./13-code-leaf-lang.fail.md"),
      findings: [{ id: "content/code/lang", level: "error", line: 3 }],
    },
  ],
};

export default v13;
