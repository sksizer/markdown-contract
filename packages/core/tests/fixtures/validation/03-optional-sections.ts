import { contract, sections, section, optional } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/03-optional-sections.md
// optional(section(...)) — valid present or absent, no finding either way.
// The FAIL drops a required section; the absent optional contributes nothing.
const v03: ValidationFixture = {
  id: "v03",
  title: "Optional sections",
  component: "structure",
  path: "docs/notes/cache.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Title"),
        section("Overview"),
        optional(section("Notes")),
      ]),
    }),
  cases: [
    {
      label: "pass — required pair present, optional Notes present",
      source: loadSource(import.meta.url, "./03-optional-sections.pass-1.md"),
      findings: [],
    },
    {
      label: "pass — optional Notes omitted entirely",
      source: loadSource(import.meta.url, "./03-optional-sections.pass-2.md"),
      findings: [],
    },
    {
      label: "fail — required Overview dropped; absent optional Notes is silent",
      source: loadSource(import.meta.url, "./03-optional-sections.fail.md"),
      findings: [{ id: "structure/section-missing", level: "error" }],
    },
  ],
};

export default v03;
