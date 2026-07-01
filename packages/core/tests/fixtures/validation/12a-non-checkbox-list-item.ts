import { contract, sections, section, list } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/12a-non-checkbox-list-item.md
// Edge on 12: the everyItem: "checkbox" predicate fails on a single bare bullet.
// Note (T-5LW7): the provenance guessed `content/every-item`; reconciled to the
// D-0004 `content/<leaf>/<check>` scheme → content/list/item-kind. The provenance
// pinned line 4, but the bare bullet sits on source line 5 (the finding localizes to
// item.pos); line corrected to 5.
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
      findings: [{ id: "content/list/item-kind", level: "error", line: 5 }],
    },
  ],
};

export default v12a;
