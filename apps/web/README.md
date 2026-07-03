# @markdown-contract/web

Workspace member for the **markdown-contract web UI** (the Nuxt SPA + daemon of
`D-0012-distribution-single-exec-and-web-ui` / milestone M-0009).

Today this carries the **daemon prototype** (`T-DAEM`): a combined-binary entry
(`src/bin.ts`) that dispatches `daemon` → a loopback-only `Bun.serve` HTTP server
(`src/daemon/`) exposing a thin JSON API over `packages/core`'s `runCorpus`, and
delegates every other argv to `packages/core`'s `runCli`. Run it with
`bun src/bin.ts daemon --port 4319`. All Bun-only/server code lives here;
`packages/core` imports nothing from `apps/web` (one-way layering).

Still to come: the Nuxt SPA itself ([[T-WEBU-nuxt-spa-ui]]), embedding it into the
binary ([[T-SPAE-spa-embed]]), and the `bun build --compile` matrix
([[T-BMTX-bun-compile-matrix]]).

The existing exploratory prototype lives at the repo root under
`prototype/web-ui/` and is deliberately **not** moved here.
