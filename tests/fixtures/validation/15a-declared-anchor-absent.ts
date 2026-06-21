import { contract, sections, section, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/15a-declared-anchor-absent.md
// Edge on 15: a declared content-record anchor that no block carries → structure/anchor-missing.
const v15a: ValidationFixture = {
  id: "v15a",
  title: "Declared anchor absent in document",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Decision", {
          content: {
            components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
            risks: table({ anchor: "risks", columns: ["Risk", "Mitigation"] }),
          },
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — both tables carry their ^anchor",
      source: loadSource(import.meta.url, "./15a-declared-anchor-absent.pass.md"),
      findings: [],
    },
    {
      label: "fail — second table has no ^risks marker; binding unresolved",
      source: loadSource(import.meta.url, "./15a-declared-anchor-absent.fail.md"),
      findings: [{ id: "structure/anchor-missing", level: "error", line: 1 }],
    },
  ],
};

export default v15a;
