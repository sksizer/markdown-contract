import { contract, maxWords, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/09a-maxwords-exceeded.md
// The content leaf fails (prose over the 120-word budget) while the anchor check
// passes. The leaf-failure id (content/max-words) is inferred, not documented, so
// only `id` is pinned.
const v09a: ValidationFixture = {
  id: "v09a",
  title: "maxWords exceeded",
  component: "content",
  path: "docs/release/brief.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Summary", { anchor: "summary", content: maxWords(120) }),
      ]),
    }),
  cases: [
    {
      label: "pass — anchored and under budget",
      source: loadSource(import.meta.url, "./09a-maxwords-exceeded.pass.md"),
      findings: [],
    },
    {
      label: "fail — anchored but prose runs to 128 words",
      source: loadSource(import.meta.url, "./09a-maxwords-exceeded.fail.md"),
      findings: [{ id: "content/max-words" }],
    },
  ],
};

export default v09a;
