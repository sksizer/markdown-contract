import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: D-0020 — v2 counted slots. `minContains: 2` / `maxContains: 3` on a section
// node compile to a repeatable slot with occurrence bounds (the TS `repeatable`/`min`/`max`),
// so a count outside [2, 3] is one `structure/repeat-count`. The YAML twin authors the same
// contract in the mcVersion 2 vocabulary.
const v28: ValidationFixture = {
  id: "v28",
  title: "v2 counted slots: minContains / maxContains bound a repeatable section",
  component: "structure",
  path: "logs/changelog.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: false }, [
        section("Entry", { repeatable: true, min: 2, max: 3 }),
      ]),
    }),
  cases: [
    {
      label: "pass — three Entry peers sit inside the [2, 3] window",
      source: loadSource(import.meta.url, "./28-v2-min-max-contains.pass.md"),
      findings: loadExpected(import.meta.url, "./28-v2-min-max-contains.pass.expected.json"),
    },
    {
      label: "fail — one Entry is below minContains: 2",
      source: loadSource(import.meta.url, "./28-v2-min-max-contains.fail-few.md"),
      findings: loadExpected(import.meta.url, "./28-v2-min-max-contains.fail-few.expected.json"),
    },
    {
      label: "fail — four Entry peers exceed maxContains: 3",
      source: loadSource(import.meta.url, "./28-v2-min-max-contains.fail-many.md"),
      findings: loadExpected(import.meta.url, "./28-v2-min-max-contains.fail-many.expected.json"),
    },
  ],
};

export default v28;
