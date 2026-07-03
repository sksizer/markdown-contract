/**
 * Page generator — renders the example use-case catalog (`docs/catalog/*.yaml`) into
 * Starlight pages under `src/content/docs/`. Run via `bun run generate` (the `dev` and
 * `build` scripts run it first), so the YAML stays the single source of truth and the
 * emitted files are build artifacts (gitignored, never hand-edited).
 *
 * Emits:
 *   - `src/content/docs/index.md` — the landing page: intro copy + a data-driven hero
 *     tour (the rank-1 example of each category), superseding the T-SHEL interim landing.
 *   - `src/content/docs/examples/<category>/index.md` — one overview page per category
 *     (the ladder: every example in rank order).
 *   - `src/content/docs/examples/<category>/<id>.md` — one page per example: what it
 *     demonstrates, the artifact verbatim in a fenced block, its `builds_on` prerequisite
 *     link, and the API surfaces it exercises. Planned examples carry a `Planned` badge
 *     and an aside; they are excluded from the artifact regression check.
 *
 * Sidebar ordering comes from per-page `sidebar.order` frontmatter (= the example's
 * rank; the category overview is 0), consumed by the `autogenerate` groups declared in
 * `astro.config.mjs`.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";

import {
	CATEGORY_ORDER,
	type CatalogCategory,
	type CatalogExample,
	type CategoryKey,
	indexExamples,
	isPlanned,
	loadCatalog,
} from "./catalog.js";

const DOCS_DIR = resolve(import.meta.dirname, "../src/content/docs");
const EXAMPLES_DIR = resolve(DOCS_DIR, "examples");

/** Markdown fence language per artifact kind. */
const FENCE_LANG: Record<CatalogExample["artifact_kind"], string> = {
	cli: "sh",
	code: "ts",
	yaml: "yaml",
	mixed: "text",
};

/** Site path of an example page. */
const examplePath = (category: CategoryKey, id: string): string =>
	`/examples/${category}/${id.toLowerCase()}/`;

/** Fence an artifact verbatim, using a fence longer than any backtick run inside it. */
function fence(body: string, lang: string): string {
	const longestRun = Math.max(2, ...[...body.matchAll(/`+/g)].map((m) => m[0].length));
	const marker = "`".repeat(Math.max(3, longestRun + 1));
	const content = body.endsWith("\n") ? body : `${body}\n`;
	return `${marker}${lang}\n${content}${marker}`;
}

/** Serialize page frontmatter through the YAML emitter (never hand-escaped). */
const frontmatter = (data: Record<string, unknown>): string =>
	`---\n${stringifyYaml(data)}---`;

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
		title: `${example.id}: ${example.name}`,
		description: example.demonstrates,
		sidebar: {
			order: example.rank,
			label: `${example.id.replace(/^.*-(\d+)$/, "$1")}. ${example.name}`,
			...(planned ? { badge: { text: "Planned", variant: "caution" } } : {}),
		},
	};

	const buildsOn = example.builds_on ? resolveId(example.builds_on) : undefined;
	if (example.builds_on && !buildsOn) {
		throw new Error(`${example.id}: builds_on ${example.builds_on} does not exist`);
	}
	const buildsOnLine = buildsOn
		? `**Builds on:** [${buildsOn.example.id}: ${buildsOn.example.name}](${examplePath(
				buildsOn.category,
				buildsOn.example.id,
			)})`
		: `**Builds on:** nothing — this is the first rung of [${category.title}](/examples/${category.category}/).`;

	const surfaces = example.surfaces.map((s) => `- \`${s.replace(/`/g, "'")}\``).join("\n");

	return [
		frontmatter(fm),
		"",
		example.demonstrates,
		"",
		...(planned ? [PLANNED_ASIDE, ""] : []),
		buildsOnLine,
		"",
		fence(example.artifact, FENCE_LANG[example.artifact_kind]),
		"",
		"### Surfaces exercised",
		"",
		surfaces,
		"",
	].join("\n");
}

function categoryIndexPage(category: CatalogCategory): string {
	const fm = {
		title: category.title,
		description: `The ${category.examples.length} examples of the ${category.title} ladder, in rank order.`,
		sidebar: { order: 0, label: "Overview" },
	};
	const rows = category.examples
		.map((e) => {
			const planned = isPlanned(e) ? " _(planned)_" : "";
			return `${e.rank}. [${e.id}: ${e.name}](${examplePath(category.category, e.id)})${planned} — ${e.demonstrates}`;
		})
		.join("\n");
	return [
		frontmatter(fm),
		"",
		"Each example builds on the one before it — read the ladder in order, or jump",
		"to the rung you need.",
		"",
		rows,
		"",
	].join("\n");
}

function landingPage(catalog: CatalogCategory[]): string {
	const fm = {
		title: "markdown-contract",
		description:
			"Validate and consume markdown-as-data — declare a per-type contract and get both validation findings and a typed model from a single parse.",
	};

	const tour = catalog
		.map((cat) => {
			const first = cat.examples[0];
			if (!first || first.rank !== 1) {
				throw new Error(`${cat.category}: no rank-1 example for the hero tour`);
			}
			return [
				`### [${cat.title}](/examples/${cat.category}/)`,
				"",
				first.demonstrates,
				"",
				`Start at [${first.id}: ${first.name}](${examplePath(cat.category, first.id)}), then climb the ${cat.examples.length}-rung ladder.`,
			].join("\n");
		})
		.join("\n\n");

	return [
		frontmatter(fm),
		"",
		"Markdown is the cheapest durable format a team will actually keep writing. The",
		"moment you also want to *trust* its structure or *read it as data*, you reach for",
		"ad-hoc regex, a bespoke linter, or a heavyweight CMS. **markdown-contract** is the",
		"missing middle: declare a per-type **contract** and get back both **validation**",
		"(structural and content findings with source positions) and a **typed model** you",
		"can read — from one parse.",
		"",
		"## Learn it by example",
		"",
		`The [example catalog](/examples/${catalog[0]?.category}/) is a curriculum: eight ladders, each a sequence of small,`,
		"runnable examples where every rung builds on the one before it. Start anywhere:",
		"",
		tour,
		"",
		"## Markdown as data",
		"",
		"Validation and consumption are the same contract. The contract that *checks* a",
		"document also *types* it: `validate()` returns findings, `read()` returns a typed",
		"model. The engine is generic and reusable — not welded to any one corpus. A",
		"declarative `dir → contract` config validates an arbitrary tree, and the engine",
		"carries no repo knowledge.",
		"",
		"## Three cooperating planes",
		"",
		"markdown-contract does its work through three mechanisms over one parse:",
		"",
		"- **Structure** — a regular tree grammar over sections *and* block kinds.",
		"- **Content** — Zod over each block's data.",
		"- **Rules** — a named-rule registry for cross-node / cross-file constraints.",
		"",
		"Schema languages and tree grammars are formally incomparable (Murata), so we never",
		"force one to do the other's job.",
		"",
		"## Getting started",
		"",
		"The publishable library and CLI live in `packages/core`. From a checkout of the",
		"[source repository](https://github.com/sksizer/markdown-contract):",
		"",
		"```sh",
		"bun install                                  # resolve the workspace",
		"bunx moon run core:build                     # tsc → packages/core/dist",
		"bunx moon run core:test                      # vitest under Node",
		"bunx moon run :build :typecheck :coverage    # what CI runs",
		"```",
		"",
		"For package layout, packaging, and the full toolchain, see the",
		"[`packages/core` README](https://github.com/sksizer/markdown-contract/blob/main/packages/core/README.md).",
		"",
	].join("\n");
}

function main(): void {
	const catalog = loadCatalog();
	const index = indexExamples(catalog);

	rmSync(EXAMPLES_DIR, { recursive: true, force: true });

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

	writeFileSync(resolve(DOCS_DIR, "index.md"), landingPage(catalog));
	pages += 1;

	console.log(
		`generate: ${pages} page(s) from ${catalog.length} categories / ${index.size} examples (${CATEGORY_ORDER.join(" → ")})`,
	);
}

main();
