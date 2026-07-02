import { contract, gap, optional, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/05-strict-prefix-gap-tail.md
// order: "strict" + allowUnknown: false + gap(): a locked prefix then an open tail.
// The finding id for an unknown inside the strict prefix is hedged (reuse
// section-order or mint a new id?), so only `id` is pinned. The FAIL doc is
// described, not given verbatim.
const v05: ValidationFixture = {
  id: "v05",
  title: "Strict order + gap window",
  component: "structure",
  path: "status.md",
  build: () =>
    contract({
      body: sections({ order: "strict", allowUnknown: false }, [
        section("Title"),
        section("Overview"),
        section("Status"),
        gap(),
        optional(section("Appendix")),
      ]),
    }),
  cases: [
    {
      label: "pass — strict prefix, Risks in the gap, Appendix after",
      source: loadSource(import.meta.url, "./05-strict-prefix-gap-tail.pass.md"),
      findings: [],
    },
    {
      label: "fail — Risks moved into the strict prefix before gap()",
      source: loadSource(import.meta.url, "./05-strict-prefix-gap-tail.fail.md"),
      findings: [{ id: "structure/section-order" }],
    },
  ],
};

export default v05;
