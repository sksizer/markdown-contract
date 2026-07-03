import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/02a-one-of-several-missing.md
// One of several required sections absent → exactly one section-missing finding.
// The pos of a missing section is the open question, so only `id` is pinned.
const v02a: ValidationFixture = {
  id: "v02a",
  title: "One of several required missing",
  component: "structure",
  path: "docs/note.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Title"),
        section("Overview"),
        section("Status"),
      ]),
    }),
  cases: [
    {
      label: "pass — all three sections present",
      source: loadSource(import.meta.url, "./02a-one-of-several-missing.pass.md"),
      findings: [],
    },
    {
      label: "fail — Overview omitted",
      source: loadSource(import.meta.url, "./02a-one-of-several-missing.fail.md"),
      findings: [{ id: "structure/section-missing" }],
    },
  ],
};

export default v02a;
