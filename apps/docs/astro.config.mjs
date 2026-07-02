// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// GitHub Pages project URL (repo: sksizer/markdown-contract). The live publish is
// wired by T-PAGE; `site` + `base` are set now so links resolve under the project
// path from the first build. See docs/planning/tasks/T-7UTE-astro-docs-site.md.
export default defineConfig({
	site: 'https://sksizer.github.io',
	base: '/markdown-contract/',
	integrations: [
		starlight({
			title: 'markdown-contract',
			// Sidebar information architecture. Declared here as the IA slots the
			// content tasks fill: T-SHEL seeds the landing/overview page and the
			// final labels; M-0007 / T-SITE fill the example catalog. Groups are
			// declared but empty at this shell stage.
			sidebar: [
				{ label: 'Overview', items: [] },
				{ label: 'Guides', items: [] },
				{ label: 'Examples', items: [] },
				{ label: 'Reference', items: [] },
			],
		}),
	],
});
