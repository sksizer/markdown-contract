# Handoff — Prototype: standalone web-UI app + Storybook harness on mock data

_Task: `T-ZLND-web-ui-prototype-app`. PR: <https://github.com/sksizer/markdown-contract/pull/105>._

## Summary

Stood up prototype/web-ui/: standalone Nuxt 3 SPA (ssr:false) + Vue 3 with Storybook harness on mock data; 4 prop-driven components, 11 multi-variant stories off mock fixtures, thin app shell, README + CONVENTIONS. Decoupled from src/ engine and the single binary; root npm test (566) + typecheck stay green.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-ZLND-web-ui-prototype-app.md` | M |
| `prototype/web-ui/.gitignore` | A |
| `prototype/web-ui/.npmrc` | A |
| `prototype/web-ui/.storybook/main.ts` | A |
| `prototype/web-ui/.storybook/preview.ts` | A |
| `prototype/web-ui/CONVENTIONS.md` | A |
| `prototype/web-ui/README.md` | A |
| `prototype/web-ui/app.vue` | A |
| `prototype/web-ui/assets/css/main.css` | A |
| `prototype/web-ui/components/FindingsList.stories.ts` | A |
| `prototype/web-ui/components/FindingsList.vue` | A |
| `prototype/web-ui/components/RunSummary.stories.ts` | A |
| `prototype/web-ui/components/RunSummary.vue` | A |
| `prototype/web-ui/components/VaultDashboard.stories.ts` | A |
| `prototype/web-ui/components/VaultDashboard.vue` | A |
| `prototype/web-ui/components/VaultStatusCard.stories.ts` | A |
| `prototype/web-ui/components/VaultStatusCard.vue` | A |
| `prototype/web-ui/layouts/default.vue` | A |
| `prototype/web-ui/mocks/builders.ts` | A |
| `prototype/web-ui/mocks/composables.ts` | A |
| `prototype/web-ui/mocks/fixtures.ts` | A |
| `prototype/web-ui/mocks/index.ts` | A |
| `prototype/web-ui/mocks/types.ts` | A |
| `prototype/web-ui/nuxt.config.ts` | A |
| `prototype/web-ui/package-lock.json` | A |
| `prototype/web-ui/package.json` | A |
| `prototype/web-ui/pages/index.vue` | A |
| `prototype/web-ui/tsconfig.json` | A |

## Quality checks

OK 2/2 (baseline-gated; no new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/105

## Spawned follow-ups

- `T-HZYM-web-ui-scaffold-storybook-toolchain`
- `T-OLKM-commit-on-main-advances-local-main`
