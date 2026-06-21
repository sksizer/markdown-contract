// An SDLC-style corpus config for the CLI e2e tests (T-J9TZ / AC-6).
//
// Maps decision-doc globs → a decision contract and task-doc globs → a task
// contract, both built inline with the engine combinators + zod. The contracts are
// deliberately small but representative: a frontmatter Zod plus a required ordered
// section sequence — enough to produce both frontmatter-enum and structure-missing
// error-level findings on a malformed document.
//
// The engine is imported from the published package name (`markdown-contract` →
// `dist/index.js`), not the `src` tree: both `runCli` and the spawned bin load this
// config through a real Node `import()`, and a raw Node import cannot resolve a
// `../../../src/index.js` (a `.ts` file). The test suite builds `dist` before running.
//
// Globs match on the document's filename prefix anywhere in the tree (`**/D-*.md`,
// `**/T-*.md`), so they hold whether the run covers the whole corpus or is scoped to
// a subtree via `validate <path>` (which re-roots traversal at that subtree).
import { contract, defineConfig, section, sections } from "markdown-contract";
import { z } from "zod";

const decisionFrontmatter = z.strictObject({
  id: z.string().regex(/^D-[0-9]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
});

const taskFrontmatter = z.strictObject({
  id: z.string().regex(/^T-[0-9]{4}$/),
  status: z.enum(["open/ready", "in-progress/active", "closed/done"]),
  title: z.string().min(1),
});

const decisionContract = contract({
  frontmatter: decisionFrontmatter,
  body: sections({ allowUnknown: true }, [section("Context"), section("Decision")]),
});

const taskContract = contract({
  frontmatter: taskFrontmatter,
  body: sections({ allowUnknown: true }, [section("Goal"), section("Approach")]),
});

export default defineConfig({
  rules: [
    { include: ["**/D-*.md", "D-*.md"], contract: decisionContract },
    { include: ["**/T-*.md", "T-*.md"], contract: taskContract },
  ],
});
