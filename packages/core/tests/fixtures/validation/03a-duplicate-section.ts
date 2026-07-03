import { contract, optional, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/03a-duplicate-section.md
// A sibling heading repeated → structure/duplicate-section (id named in §6).
// Which occurrence carries the pos is not committed, so the line is left open.
const v03a: ValidationFixture = {
  id: "v03a",
  title: "Duplicate section heading",
  component: "structure",
  path: "note.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Title"),
        optional(section("Overview")),
      ]),
    }),
  cases: [
    {
      label: "pass — Title then a single Overview",
      source: loadSource(import.meta.url, "./03a-duplicate-section.pass.md"),
      findings: [],
    },
    {
      label: "fail — Overview heading repeated",
      source: loadSource(import.meta.url, "./03a-duplicate-section.fail.md"),
      findings: [{ id: "structure/duplicate-section", level: "error" }],
    },
  ],
};

export default v03a;
