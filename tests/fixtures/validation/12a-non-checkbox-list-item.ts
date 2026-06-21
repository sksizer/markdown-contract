import { contract, sections, section, list } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/12a-non-checkbox-list-item.md
// Edge on 12: the everyItem: "checkbox" predicate fails on a single bare bullet.
const v12a: ValidationFixture = {
  id: "v12a",
  title: "Non-checkbox AC item",
  component: "content",
  path: "docs/tasks/T-XXXX.md",
  build: () =>
    contract({
      body: sections({ order: "none", allowUnknown: true }, [
        section("Acceptance criteria", {
          content: list({ everyItem: "checkbox", minItems: 1 }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — every bullet is a checkbox, clears minItems",
      source: loadSource(import.meta.url, "./12a-non-checkbox-list-item.pass.md"),
      findings: [],
    },
    {
      label: "fail — one plain bullet among three checkbox items",
      source: loadSource(import.meta.url, "./12a-non-checkbox-list-item.fail.md"),
      findings: [{ id: "content/every-item", level: "error", line: 4 }],
    },
  ],
};

export default v12a;
