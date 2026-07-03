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
 *   - `src/content/docs/examples/<category>/<id>.md` — one page per example, structured
 *     as: what it demonstrates (+ its `builds_on` prerequisite link), how it's done (a
 *     kind-aware framing line and the artifact verbatim in a fenced block), and the API
 *     surfaces it exercises. Planned examples carry a `Planned` badge and an aside; they
 *     are excluded from the artifact regression check.
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

/** Per-kind framing: how the artifact is implemented and where its result shows. */
const KIND_FRAMING: Record<CatalogExample["artifact_kind"], string> = {
	cli: "A terminal session: the command as you'd run it, followed by the output it prints; trailing comments note the exit status.",
	code: "A TypeScript program against the library API; inline comments show the resulting values and behavior.",
	yaml: "The declarative YAML artifact, verbatim — no code required.",
	mixed: "Commands, code, and output together; comments mark which is which.",
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
		"## What it demonstrates",
		"",
		example.demonstrates,
		"",
		...(planned ? [PLANNED_ASIDE, ""] : []),
		buildsOnLine,
		"",
		"## How it's done",
		"",
		KIND_FRAMING[example.artifact_kind],
		"",
		fence(example.artifact, FENCE_LANG[example.artifact_kind]),
		"",
		"## Surfaces exercised",
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
		"to the rung you need. Every shipped artifact is regression-checked against the",
		"real CLI and library output.",
		"",
		rows,
		"",
	].join("\n");
}

function landingPage(catalog: CatalogCategory[]): string {
	const fm = {
		title: "markdown-contract",
		description:
			"Validate markdown against per-type contracts and read it back as typed data — findings with source positions and a typed model, from one parse.",
	};

	const tour = catalog
		.map((cat, i) => {
			const first = cat.examples[0];
			if (first?.rank !== 1) {
				throw new Error(`${cat.category}: no rank-1 example for the hero tour`);
			}
			return `${i + 1}. **[${cat.title}](/examples/${cat.category}/)** — ${cat.examples.length} rungs, starting with [${first.id}: ${first.name}](${examplePath(cat.category, first.id)}).`;
		})
		.join("\n");

	return [
		frontmatter(fm),
		"",
		"Teams keep decision records, runbooks, and planning docs in markdown — but",
		"nothing guarantees those documents keep the shape your team and tooling rely on.",
		"**markdown-contract** lets you declare a **contract** per document type",
		"(frontmatter fields, section structure, table shapes, custom rules) and gives",
		"you back two things from one parse:",
		"",
		"- **Validation** — findings with `path:line` positions, as human text, JSON, or",
		"  SARIF, with CI-ready exit codes.",
		"- **A typed model** — the contract that *checks* a document also *types* it:",
		"  `doc.frontmatter.status`, `doc.body.summary.text()`, iterable typed table rows.",
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
		"Contracts can also be pure YAML — no code at all — and a declarative config maps",
		"directories and globs to contracts, so validating a whole docs tree is",
		"configuration. See [Getting started](/getting-started/).",
		"",
		"## Start here",
		"",
		"- [Why markdown-contract](/why/) — the gap it fills and the design drivers.",
		"- [How it works](/how-it-works/) — one parse, three validation planes, one",
		"  finding shape, and the typed model.",
		"- [Getting started](/getting-started/) — validate a folder from the terminal,",
		"  then author a contract in YAML or TypeScript.",
		"",
		"## Learn it by example",
		"",
		"The example catalog is a curriculum: eight short ladders of small, runnable",
		"examples, each rung building on the one before it. Every shipped artifact is",
		"regression-checked against the real CLI and library, so what you read is what",
		"the tool actually does.",
		"",
		tour,
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
