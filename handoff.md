# Handoff — `daemon` mode + a JSON API over the runner — the `apps/web` server face

_Task: `T-DAEM-daemon-and-json-api`. PR: <https://github.com/sksizer/markdown-contract/pull/173>._

## Summary

daemon mode + JSON API: apps/web/src/bin.ts dispatches 'daemon' to a loopback-only Bun.serve server (POST /api/validate over runCorpus with CLI parity, GET /api/health) and delegates every other argv to packages/core's runCli; added a ./cli subpath export to packages/core. One-way layering preserved.

## Files changed

| Path | Role |
|---|---|
| `apps/web/README.md` | M |
| `apps/web/moon.yml` | A |
| `apps/web/package.json` | M |
| `apps/web/src/bin.ts` | A |
| `apps/web/src/daemon/fixtures/vault/bad.md` | A |
| `apps/web/src/daemon/fixtures/vault/good.md` | A |
| `apps/web/src/daemon/fixtures/vault/markdown-contract.yaml` | A |
| `apps/web/src/daemon/fixtures/vault/note.contract.yaml` | A |
| `apps/web/src/daemon/routes.ts` | A |
| `apps/web/src/daemon/server.test.ts` | A |
| `apps/web/src/daemon/server.ts` | A |
| `apps/web/tsconfig.json` | A |
| `bun.lock` | M |
| `docs/planning/tasks/T-DAEM-daemon-and-json-api.md` | M |
| `packages/core/package.json` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/173

## Spawned follow-ups

- `gate-apps-web-typecheck-test`
- `gap-report-honors-kind-new`
- `task-work-step7-threads-baseline-dir`
- `gap-report-auto-applies-relocations`
