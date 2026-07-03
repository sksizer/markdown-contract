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
			// Sidebar information architecture: the M-0007 example-catalog category
			// slots. Each group mirrors one catalog category (label — key); the
			// groups are declared but hold no pages (items: []) at this bare-shell
			// stage. T-SITE / M-0007 drop the generated per-category pages into
			// these slots once the catalog data (docs/catalog/*.yaml) is finalized —
			// so those tasks add pages into a defined structure rather than editing
			// an empty config. The leading Overview group links the hand-authored
			// landing page (T-SHEL).
			sidebar: [
				{ label: 'Overview', items: [{ label: 'Introduction', link: '/' }] },
				// cli — CLI Quickstart: Validate from the Terminal
				{ label: 'CLI Quickstart', items: [] },
				// inference-init — Scaffold and Guard: init, Inference, and Drift Checks
				{ label: 'Scaffold & Guard', items: [] },
				// declarative-yaml — Declarative YAML: Contracts and Corpus Config, No Code
				{ label: 'Declarative YAML', items: [] },
				// validation-planes — Authoring Contracts in Code: Structure, Content, and Custom Rules
				{ label: 'Contracts in Code', items: [] },
				// consume-as-data — Consume as Typed Data: Reading the Document as a Model
				{ label: 'Consume as Data', items: [] },
				// dialect — Dialect: Anchors, Wikilinks, and Vault References
				{ label: 'Dialect', items: [] },
				// embed-and-ci — Embed and Automate: the Runner Library and CI Gates
				{ label: 'Embed & Automate', items: [] },
				// real-world-schemas — Real-World Schemas: Document Templates and Cross-Document Governance
				{ label: 'Real-World Schemas', items: [] },
			],
		}),
	],
});
