/**
 * Page generator — renders the example catalog (`docs/catalog/*.yaml`) into Starlight
 * pages under `src/content/docs/`. Run via `bun run generate` (the `dev` and `build`
 * scripts run it first), so the YAML stays the single source of truth and the emitted
 * files are build artifacts (gitignored, never hand-edited).
 *
 * Emits:
 *   - `src/content/docs/index.md` — the landing page: the problem, the solution, and
 *     pointers into the guide, reference, and appendix sections.
 *   - `src/content/docs/appendix/examples/index.md` — the whole-catalog browse index.
 *   - `src/content/docs/appendix/examples/<category>/index.md` — one overview page per
 *     category (every example in rank order).
 *   - `src/content/docs/appendix/examples/<category>/<id>.md` — one page per example:
 *     what it shows, the artifact verbatim in a fenced block, and what it exercises.
 *     Planned examples carry a `Planned` badge and an aside; they are excluded from
 *     the artifact regression check.
 *
 * The examples live under `/appendix/` deliberately: the guide pages teach, the
 * reference specifies, and the appendix holds the worked material. Sidebar ordering
 * comes from per-page `sidebar.order` frontmatter (= the example's rank; the category
 * overview is 0), consumed by the `autogenerate` groups declared in `astro.config.mjs`.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";

import {
  type CatalogCategory,
  type CatalogExample,
  type CategoryKey,
  indexExamples,
  isPlanned,
  loadCatalog,
} from "./catalog.js";

const DOCS_DIR = resolve(import.meta.dirname, "../src/content/docs");
const APPENDIX_DIR = resolve(DOCS_DIR, "appendix");
const EXAMPLES_DIR = resolve(APPENDIX_DIR, "examples");

/** Markdown fence language per artifact kind. */
const FENCE_LANG: Record<CatalogExample["artifact_kind"], string> = {
  cli: "sh",
  code: "ts",
  yaml: "yaml",
  mixed: "text",
};

/** Per-kind framing: how the artifact is implemented and where its result shows. */
const KIND_FRAMING: Record<CatalogExample["artifact_kind"], string> = {
  cli: "A terminal session: the command as you'd run it, followed by the output it prints; trailing comments note the exit status.",
  code: "A TypeScript program against the library API; inline comments show the resulting values and behavior.",
  yaml: "The declarative YAML artifact, verbatim — no code required.",
  mixed: "Commands, code, and output together; comments mark which is which.",
};

/** Short human label for the artifact kind, shown in each example's metadata caption. */
const KIND_LABEL: Record<CatalogExample["artifact_kind"], string> = {
  cli: "CLI transcript",
  code: "TypeScript",
  yaml: "YAML",
  mixed: "Mixed",
};

/** Per-category link into the hand-authored Reference section (src/content/docs/reference/). */
const REFERENCE_LINKS: Record<CategoryKey, { href: string; label: string }> = {
  validate: { href: "/reference/cli/", label: "CLI reference" },
  author: { href: "/reference/yaml/", label: "Declarative YAML reference" },
  read: { href: "/reference/model/", label: "Typed model reference" },
  automate: { href: "/reference/api/", label: "Library API reference" },
};

/** Site path of an example page. */
const examplePath = (category: CategoryKey, id: string): string =>
  `/appendix/examples/${category}/${id.toLowerCase()}/`;

/** Site path of a category overview page. */
const categoryPath = (category: CategoryKey): string => `/appendix/examples/${category}/`;

/** Fence an artifact verbatim, using a fence longer than any backtick run inside it. */
function fence(body: string, lang: string): string {
  const longestRun = Math.max(2, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
  const marker = "`".repeat(Math.max(3, longestRun + 1));
  const content = body.endsWith("\n") ? body : `${body}\n`;
  return `${marker}${lang}\n${content}${marker}`;
}

/** Serialize page frontmatter through the YAML emitter (never hand-escaped). */
const frontmatter = (data: Record<string, unknown>): string => `---\n${stringifyYaml(data)}---`;

/**
 * The "Continue" footer on each example page: previous/next example (within the
 * category, in rank order — the same order as the sidebar), the category overview,
 * the whole-catalog browse index, and the category's Reference page. Makes every
 * page self-navigating without the sidebar.
 */
function exampleFooter(category: CatalogCategory, example: CatalogExample): string {
  const at = category.examples.findIndex((e) => e.id === example.id);
  const prev = category.examples[at - 1];
  const next = category.examples[at + 1];
  const ref = REFERENCE_LINKS[category.category];
  const lines = [
    prev
      ? `- **Previous:** [${prev.name}](${examplePath(category.category, prev.id)})`
      : "- **Previous:** _this is the first example of the group_",
    next
      ? `- **Next:** [${next.name}](${examplePath(category.category, next.id)})`
      : "- **Next:** _this is the last example of the group_",
    `- **Group:** [${category.title}](${categoryPath(category.category)}) · [All examples](/appendix/examples/)`,
    `- **Reference:** [${ref.label}](${ref.href})`,
  ];
  return ["## Continue", "", lines.join("\n"), ""].join("\n");
}

const PLANNED_ASIDE = [
  ":::caution[Planned]",
  "This example describes a **planned** capability that has not shipped yet. The",
  "artifact shows the intended shape; it is excluded from the artifact regression",
  "check until the feature lands.",
  ":::",
].join("\n");

function examplePage(
  category: CatalogCategory,
  example: CatalogExample,
  resolveId: (id: string) => { example: CatalogExample; category: CategoryKey } | undefined,
): string {
  const planned = isPlanned(example);
  const fm: Record<string, unknown> = {
    title: example.name,
    description: example.demonstrates,
    sidebar: {
      order: example.rank,
      label: `${example.rank}. ${example.name}`,
      ...(planned ? { badge: { text: "Planned", variant: "caution" } } : {}),
    },
  };

  const buildsOn = example.builds_on ? resolveId(example.builds_on) : undefined;
  if (example.builds_on && !buildsOn) {
    throw new Error(`${example.id}: builds_on ${example.builds_on} does not exist`);
  }
  const buildsOnLine = buildsOn
    ? `**Builds on:** [${buildsOn.example.name}](${examplePath(
        buildsOn.category,
        buildsOn.example.id,
      )})`
    : `**Builds on:** nothing — start here in [${category.title}](${categoryPath(category.category)}).`;

  const surfaces = example.surfaces.map((s) => `- \`${s.replace(/`/g, "'")}\``).join("\n");

  return [
    frontmatter(fm),
    "",
    `\`${example.id}\` · ${KIND_LABEL[example.artifact_kind]}${planned ? " · _planned_" : ""}`,
    "",
    example.demonstrates,
    "",
    ...(planned ? [PLANNED_ASIDE, ""] : []),
    buildsOnLine,
    "",
    "## The artifact",
    "",
    KIND_FRAMING[example.artifact_kind],
    "",
    fence(example.artifact, FENCE_LANG[example.artifact_kind]),
    "",
    "## What it exercises",
    "",
    surfaces,
    "",
    exampleFooter(category, example),
  ].join("\n");
}

function categoryIndexPage(category: CatalogCategory): string {
  const fm = {
    title: category.title,
    description: `The ${category.examples.length} worked examples of ${category.title}, in reading order.`,
    sidebar: { order: 0, label: "Overview" },
  };
  const rows = category.examples
    .map((e) => {
      const planned = isPlanned(e) ? " _(planned)_" : "";
      return `${e.rank}. [${e.name}](${examplePath(category.category, e.id)})${planned} — ${e.demonstrates}`;
    })
    .join("\n");
  return [
    frontmatter(fm),
    "",
    "Each example builds on the one before it — read the group in order, or jump to",
    "the one you need. Every shipped artifact is regression-checked against the real",
    "CLI and library output.",
    "",
    rows,
    "",
    `Or browse [all examples](/appendix/examples/), or open the [${REFERENCE_LINKS[category.category].label}](${REFERENCE_LINKS[category.category].href}) for the underlying spec.`,
    "",
  ].join("\n");
}

/**
 * The whole-catalog browse index at `/appendix/examples/` — every group and every
 * example on one page, in reading order. A stable landing for the sidebar's
 * "All examples" entry and the per-page footer links; sits at the examples root,
 * outside every `autogenerate` group, so it never disturbs the per-category sidebars.
 */
function allExamplesPage(catalog: CatalogCategory[]): string {
  const fm = {
    title: "All examples",
    description:
      "Every worked example at a glance — the whole markdown-contract catalog on one page.",
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
  };
  const total = catalog.reduce((n, c) => n + c.examples.length, 0);
  const sections = catalog
    .map((cat, i) => {
      const entries = cat.examples
        .map((e) => {
          const planned = isPlanned(e) ? " _(planned)_" : "";
          return `${e.rank}. [${e.name}](${examplePath(cat.category, e.id)})${planned} — ${e.demonstrates}`;
        })
        .join("\n");
      const ref = REFERENCE_LINKS[cat.category];
      return [
        `## ${i + 1}. [${cat.title}](${categoryPath(cat.category)})`,
        "",
        `${cat.examples.length} examples · reference: [${ref.label}](${ref.href})`,
        "",
        entries,
      ].join("\n");
    })
    .join("\n\n");
  return [
    frontmatter(fm),
    "",
    `**${catalog.length} groups**, **${total} examples** — each one small, self-contained, and`,
    "regression-checked against the real CLI and library, so what you read is what the",
    "tool actually does. Read a group in order, or jump straight to the one you need.",
    "",
    sections,
    "",
  ].join("\n");
}

function landingPage(catalog: CatalogCategory[]): string {
  const fm = {
    title: "markdown-contract",
    description:
      "Declare a contract per markdown document type and get two things from one parse: validation with source-pinned findings, and a typed data model you can read.",
  };

  const tour = catalog
    .map((cat, i) => {
      const first = cat.examples[0];
      if (first?.rank !== 1) {
        throw new Error(`${cat.category}: no rank-1 example for the appendix tour`);
      }
      return `${i + 1}. **[${cat.title}](${categoryPath(cat.category)})** — ${cat.examples.length} examples, starting with [${first.name}](${examplePath(cat.category, first.id)}).`;
    })
    .join("\n");

  return [
    frontmatter(fm),
    "",
    "Teams keep their durable knowledge in markdown — decision records, runbooks,",
    "planning docs, changelogs. It is the cheapest format people actually keep",
    "writing. But the moment you need to **rely** on those documents — trust their",
    "structure, or read them as data — markdown gives you nothing, and you end up",
    "with ad-hoc regex, a bespoke linter, or a heavyweight CMS.",
    "",
    "**markdown-contract** is the missing middle. You declare a **contract** per",
    "document type — frontmatter fields, section structure, table shapes, custom",
    "rules — and one parse gives you back both:",
    "",
    "- **Validation** — findings pinned to `path:line`, as human text, JSON, or",
    "  SARIF, with CI-ready exit codes.",
    "- **A typed model** — the contract that *checks* a document also *types* it:",
    "  `doc.frontmatter.status`, `doc.body.Summary.text()`, iterable typed table rows.",
    "",
    "```ts",
    'import { contract, sections, section } from "markdown-contract";',
    'import { z } from "zod";',
    "",
    "const decision = contract({",
    '  frontmatter: z.object({ status: z.enum(["proposed", "accepted"]) }),',
    '  body: sections({ allowUnknown: true }, [section("Summary"), section("Decision")]),',
    "});",
    "",
    'decision.validate(src, { path: "D-0001.md" }); // findings with path:line positions',
    'decision.read(src, { path: "D-0001.md" });     // typed Doc: frontmatter + body model',
    "```",
    "",
    "## The functionality, in layers",
    "",
    "Everything rides on one contract engine, and the surface stacks in layers —",
    "adopt the bottom one in minutes with zero code, and climb as your needs grow:",
    "",
    "1. **Declare and validate — no code.** Write a contract per document type in",
    "   [YAML](/reference/yaml/), map folders to contracts in one config file, and run",
    "   [`markdown-contract validate`](/reference/cli/): findings pinned to `path:line`,",
    "   JSON or SARIF output, CI-ready exit codes.",
    "2. **Author in TypeScript, inject custom rules.** The [code API](/reference/api/)",
    "   adds what data can't express: arbitrary Zod schemas, nested grammars, and named",
    "   rules (`rule`, `docRule`, `requires`/`forbids`) injected at runtime for",
    "   cross-cutting policy.",
    "3. **Read documents through the inferred typed model.** The contract *types* what",
    "   it checks: [`read()`](/reference/model/) returns a `Doc` whose frontmatter,",
    "   section prose, and table rows are ordinary typed reads — no re-parsing, no",
    "   second definition to drift.",
    "4. **Generate templates from contracts** *(in progress)*. A contract already",
    "   declares a document's full shape — frontmatter fields, section order, table",
    "   columns — so the same declaration can emit a valid, empty skeleton for new",
    "   documents: the authoring dual of validation.",
    "5. **Infer contracts from the docs you already have.**",
    "   [`markdown-contract init`](/reference/cli/) reads an existing folder and writes",
    "   the tightest config that accepts it; `--check` turns the same inference into a",
    "   CI drift guard.",
    "6. **Manage vaults from a UI.** A local dashboard — and a desktop app — watch your",
    "   folders and show live validation status over the same engine, for the people",
    "   who never open a terminal. See [Architecture](/architecture/).",
    "",
    "## Start here",
    "",
    "- [Why markdown-contract](/why/) — the problems it solves and what shaped it.",
    "- [How it works](/how-it-works/) — one parse, three cooperating planes, one",
    "  finding shape, and the typed model.",
    "- [Architecture](/architecture/) — the layers, the import direction, and how",
    "  the pieces of the workspace fit together.",
    "- [Getting started](/getting-started/) — validate a folder from the terminal,",
    "  then author a contract in YAML or TypeScript.",
    "",
    "## Reference",
    "",
    "When you want the spec rather than a walkthrough, the reference section",
    "documents every command, field, export, rule id, and dialect construct:",
    "[CLI](/reference/cli/), [Declarative YAML](/reference/yaml/),",
    "[Library API](/reference/api/), [typed model](/reference/model/),",
    "[findings & rule ids](/reference/findings/), [dialect](/reference/dialect/), and the",
    "[glossary](/reference/glossary/).",
    "",
    "## Appendix: worked examples",
    "",
    "Small, self-contained examples, each regression-checked against the real CLI",
    "and library. Browse the whole set on the [all examples](/appendix/examples/)",
    "page, or start with a group:",
    "",
    tour,
    "",
  ].join("\n");
}

function main(): void {
  const catalog = loadCatalog();
  const index = indexExamples(catalog);

  rmSync(APPENDIX_DIR, { recursive: true, force: true });
  mkdirSync(EXAMPLES_DIR, { recursive: true });

  let pages = 0;
  for (const cat of catalog) {
    const dir = resolve(EXAMPLES_DIR, cat.category);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "index.md"), categoryIndexPage(cat));
    pages += 1;
    for (const example of cat.examples) {
      writeFileSync(
        resolve(dir, `${example.id.toLowerCase()}.md`),
        examplePage(cat, example, (id) => index.get(id)),
      );
      pages += 1;
    }
  }

  writeFileSync(resolve(EXAMPLES_DIR, "index.md"), allExamplesPage(catalog));
  pages += 1;

  writeFileSync(resolve(DOCS_DIR, "index.md"), landingPage(catalog));
  pages += 1;

  console.log(
    `generate: ${pages} page(s) from ${catalog.length} categories / ${index.size} examples`,
  );
}

main();
