# @markdown-contract/docs

Astro + [Starlight](https://starlight.astro.build) documentation site for
markdown-contract (M-0006). A workspace sibling of the published library
(`packages/core`) — `private: true`, never published to npm.

Builds as a moon project on the **bun** toolchain to static output:

```sh
moon run docs:build   # -> apps/docs/dist/ (static site, root index.html)
```

This is the **shell**: an empty-but-wired content collection
(`src/content.config.ts` uses Starlight's `docsLoader()` + `docsSchema()`) and a
declared-but-empty sidebar information architecture in `astro.config.mjs`. The
landing/overview page and final IA labels land in T-SHEL; the GitHub Pages deploy
in T-PAGE; the example catalog in M-0007 / T-SITE.
