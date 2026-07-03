// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// Published via Cloudflare Pages (direct upload of dist/), which serves at the
// domain root — so no `base` path. Update `site` if the Pages project name or a
// custom domain changes. (GitHub Pages was the original target — T-PAGE — but the
// repo is private, so Pages can't be enabled.)
export default defineConfig({
	site: 'https://markdown-contract-docs.pages.dev',
	integrations: [
		starlight({
			title: 'markdown-contract',
			// Sidebar information architecture (T-SITE): one top-level "Examples"
			// group holding the eight M-0007 catalog categories as sub-groups, in
			// curriculum-spine order (rung 1 → 8). Each sub-group autogenerates from
			// the pages `scripts/generate.ts` renders out of docs/catalog/*.yaml
			// into src/content/docs/examples/<category>/ (ordered by per-page
			// `sidebar.order` = the example's rank; the category overview is 0).
			// The leading Overview group links the generated landing page.
			sidebar: [
				{ label: 'Overview', items: [{ label: 'Introduction', link: '/' }] },
				{
					label: 'Examples',
					items: [
						// cli — CLI Quickstart: Validate from the Terminal
						{ label: 'CLI Quickstart', items: [{ autogenerate: { directory: 'examples/cli' } }] },
						// inference-init — Scaffold and Guard: init, Inference, and Drift Checks
						{ label: 'Scaffold & Guard', items: [{ autogenerate: { directory: 'examples/inference-init' } }] },
						// declarative-yaml — Declarative YAML: Contracts and Corpus Config, No Code
						{ label: 'Declarative YAML', items: [{ autogenerate: { directory: 'examples/declarative-yaml' } }] },
						// validation-planes — Authoring Contracts in Code: Structure, Content, and Custom Rules
						{ label: 'Contracts in Code', items: [{ autogenerate: { directory: 'examples/validation-planes' } }] },
						// consume-as-data — Consume as Typed Data: Reading the Document as a Model
						{ label: 'Consume as Data', items: [{ autogenerate: { directory: 'examples/consume-as-data' } }] },
						// dialect — Dialect: Anchors, Wikilinks, and Vault References
						{ label: 'Dialect', items: [{ autogenerate: { directory: 'examples/dialect' } }] },
						// embed-and-ci — Embed and Automate: the Runner Library and CI Gates
						{ label: 'Embed & Automate', items: [{ autogenerate: { directory: 'examples/embed-and-ci' } }] },
						// real-world-schemas — Real-World Schemas: Document Templates and Cross-Document Governance
						{ label: 'Real-World Schemas', items: [{ autogenerate: { directory: 'examples/real-world-schemas' } }] },
					],
				},
			],
		}),
	],
});
