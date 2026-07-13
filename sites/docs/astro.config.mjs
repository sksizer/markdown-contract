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
			// The leading Overview group links the generated landing page plus the
			// hand-authored guide pages (committed, not generated).
			sidebar: [
				{
					label: 'Overview',
					items: [
						{ label: 'Introduction', link: '/' },
						{ label: 'Why markdown-contract', link: '/why/' },
						{ label: 'How it works', link: '/how-it-works/' },
						{ label: 'Getting started', link: '/getting-started/' },
					],
				},
				{
					// Recipes (committed, hand-authored under src/content/docs/recipes/):
					// scenario-first, end-to-end solutions that link down into the mechanism
					// Examples and up into the Reference. The scenario front door, so it sits
					// between Overview and the by-mechanism Examples ladders. Clustered by the
					// job, mirroring docs/example-recipes.md (the build checklist).
					label: 'Recipes',
					items: [
						{ label: 'Overview', link: '/recipes/' },
						{
							label: 'Guard folders in CI',
							items: [
								{ label: 'Guard a folder in CI', link: '/recipes/guard-a-folder-in-ci/' },
								{ label: 'Infer a contract with init', link: '/recipes/infer-a-contract-with-init/' },
								{ label: 'Several doc types in one repo', link: '/recipes/multiple-doc-types/' },
								{ label: 'Strict published, lenient drafts', link: '/recipes/strict-published-lenient-drafts/' },
								{ label: 'Check only changed files', link: '/recipes/check-only-changed-files/' },
								{ label: 'Warnings as PR annotations', link: '/recipes/warnings-as-pr-annotations/' },
								{ label: 'Pre-commit hook', link: '/recipes/pre-commit-hook/' },
								{ label: 'Catch drift with init --check', link: '/recipes/catch-drift-with-init-check/' },
							],
						},
						{
							label: 'Site content',
							items: [
								{ label: 'Astro content collections', link: '/recipes/astro-content-collections/' },
								{ label: 'Require code + checklist', link: '/recipes/require-code-and-checklist/' },
								{ label: 'Typed table columns', link: '/recipes/typed-table-columns/' },
								{ label: 'Summary length + anchor', link: '/recipes/summary-length-and-anchor/' },
								{ label: 'Require / forbid phrases', link: '/recipes/require-or-forbid-phrases/' },
							],
						},
						{
							label: 'Team templates',
							items: [
								{ label: 'Enforce the ADR template', link: '/recipes/enforce-adr-template/' },
								{ label: 'Runbook: owner + rollback', link: '/recipes/runbook-owner-and-rollback/' },
								{ label: 'Postmortem: timeline + actions', link: '/recipes/postmortem-timeline-and-actions/' },
								{ label: 'Decision must cite an alternative', link: '/recipes/decision-must-cite-alternative/' },
							],
						},
						{
							label: 'Obsidian vaults',
							items: [
								{ label: 'Require a ^summary anchor', link: '/recipes/require-a-summary-anchor/' },
							],
						},
						{
							label: 'Typed data',
							items: [
								{ label: 'Build an index from docs', link: '/recipes/build-an-index-from-frontmatter/' },
								{ label: 'Assemble release notes', link: '/recipes/assemble-release-notes/' },
								{ label: 'Prompt cards for agents', link: '/recipes/prompt-cards-for-agents/' },
							],
						},
						{
							label: 'Embed in your tooling',
							items: [
								{ label: 'Validate in your own build', link: '/recipes/validate-in-your-own-build/' },
								{ label: 'Findings → editor diagnostics', link: '/recipes/findings-to-editor-diagnostics/' },
								{ label: 'Baseline + diff findings', link: '/recipes/baseline-and-diff-findings/' },
							],
						},
						{
							label: 'Governance',
							items: [
								{ label: 'Enforce owner tree-wide', link: '/recipes/enforce-owner-across-tree/' },
								{ label: 'Cross-document references', link: '/recipes/cross-document-references/' },
							],
						},
					],
				},
				{
					label: 'Examples',
					items: [
						// Whole-catalog browse index (generated at examples/index.md by scripts/generate.ts).
						{ label: 'All examples', link: '/examples/' },
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
				{
					// Reference (committed, hand-authored pages under src/content/docs/reference/).
					// Listed explicitly in reading order rather than autogenerated, so the group
					// order is stable and independent of per-page frontmatter.
					label: 'Reference',
					items: [
						{ label: 'CLI', link: '/reference/cli/' },
						{ label: 'Declarative YAML', link: '/reference/yaml/' },
						{ label: 'Library API', link: '/reference/api/' },
						{ label: 'Typed model', link: '/reference/model/' },
						{ label: 'Findings & rule IDs', link: '/reference/findings/' },
						{ label: 'Dialect', link: '/reference/dialect/' },
						{ label: 'Glossary', link: '/reference/glossary/' },
					],
				},
			],
		}),
	],
});
