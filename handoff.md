# Handoff — Generate & publish the example catalog pages into the docs site

_Task: `T-SITE-bootstrap-docs-website`. PR: <https://github.com/sksizer/markdown-contract/pull/196>._

## Summary

Rendered the example catalog (8 categories / 108 examples) into sites/docs as generated Starlight pages under a single top-level Examples sidebar group, with a data-driven landing hero tour and a moon-wired artifact regression check (docs:check-artifacts) against the real CLI/library.

## Files changed

| Path | Role |
|---|---|
| `.gitignore` | M |
| `bun.lock` | M |
| `docs/planning/tasks/T-E698-export-extractvaultrefs-from-package-root.md` | M |
| `docs/planning/tasks/T-SITE-bootstrap-docs-website.md` | M |
| `sites/docs/astro.config.mjs` | M |
| `sites/docs/moon.yml` | M |
| `sites/docs/package.json` | M |
| `sites/docs/scripts/catalog.ts` | A |
| `sites/docs/scripts/check-artifacts.ts` | A |
| `sites/docs/scripts/checks/cli.ts` | A |
| `sites/docs/scripts/checks/code.ts` | A |
| `sites/docs/scripts/checks/known-failures.ts` | A |
| `sites/docs/scripts/checks/yaml.ts` | A |
| `sites/docs/scripts/generate.ts` | A |
| `sites/docs/src/content/docs/index.md` | D |

## Quality checks

OK 5/5 (baseline-gated against a83541b)

## PR

https://github.com/sksizer/markdown-contract/pull/196

## Spawned follow-ups

- `T-0O6S-widen-quantifier-resolver-ac-window`
- `T-ADNR-quality-runner-maxbuffer-stream-output`
- `T-E698-export-extractvaultrefs-from-package-root`
