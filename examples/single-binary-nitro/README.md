# examples/single-binary-nitro — the same two faces, served by Nitro

A peer of [[examples/single-binary]] demonstrating the SAME architecture —
one Bun-compiled executable, CLI when run bare, loopback daemon under
`markdown-contract daemon` (D-0012 §D3) — with **one** substitution: the daemon
face is a real **Nitro server** (the `nuxt build` output, Nuxt server routes)
instead of the peer's hand-rolled `Bun.serve` + manual asset embed. The UI page,
the wire contract (`types/api.ts`), and the CLI face are the peer's, unchanged.

This package exists to de-risk the productionization path recorded in
[[D-0012-distribution-single-exec-and-web-ui]] §D3: the real app's daemon
(`apps/web`, [[M-0009-local-web-ui-vault-dashboard]]) is slated to ride Nitro's
`bun` preset, and this example proves that path compiles, embeds, and binds
loopback-only end to end. Read the peer's README first — its Boundary,
trust-model, and entry-guard sections all apply verbatim here.

## What changed vs the peer

| | [[examples/single-binary]] | this package |
|---|---|---|
| server | `src/daemon/` — `server.ts` + `routes.ts` + `static.ts` (hand-rolled `Bun.serve`) | none — the `nuxt build` output IS the server |
| API routes | one `handleApi` router, path/method dispatch by hand | `ui/server/api/health.get.ts`, `ui/server/api/validate.post.ts` (file-based routing) |
| SPA embed | `scripts/gen-assets.ts` codegen → `assets.gen.ts` manifest of `with { type: "file" }` imports | `serveStatic: "inline"` — nitro base64-inlines every asset into the server bundle |
| UI build | `nuxt generate` (static, server discarded) | `nuxt build` (client + Nitro server) |
| `bin.ts` daemon path | calls `serve()` | sets `NITRO_PORT`/`NITRO_HOST`, then `await import("../ui/.output/server/index.mjs")` |
| default port | 4320 | **4321** (all three daemons run side by side) |

Five custom server modules and a codegen script collapse into two thin route
handlers plus one plain logic module (`ui/server/utils/validate-vault.ts`, the
ported validate flow — same config resolution as the CLI, same peer-tested
contract).

**What Nitro buys:** file-based API routing; native asset inlining with
etag/cache-control handled for you; and `nuxt dev` serving **both faces at
once** — `bun run ui:dev` gives UI + live API with no separate daemon and no
`NUXT_PUBLIC_API_BASE`, a real DX improvement over the peer.

**What it costs / changes:**

- **Server boot is an import side effect.** The built entry runs `Bun.serve`
  at module top level; port and host are only controllable via `NITRO_PORT` /
  `NITRO_HOST` env, so `bin.ts` sets them **before** the dynamic import — host
  hard-coded to `127.0.0.1`, not overridable (the loopback trust model,
  D-0012 §D1). The import sits strictly behind the `daemon` argv check, so the
  CLI face never boots a server.
- **`NODE_ENV=production` at compile.** Nitro's traced externals
  (`.output/server/node_modules`) carry only production-condition export
  targets; without it, `bun build --compile` selects the `development` exports
  condition and 18 modules fail to resolve. The `compile` script pins it.
- **A bigger binary.** 63,844,704 bytes vs the peer's 61,054,176 (same
  machine, bun 1.2.21): **+2.8 MB, ≈ +4.6%** — the Nitro runtime plus the h3
  stack, bundled as 785 modules against the peer's 415. Build time is a
  non-issue: `build:binary` measured ≈ 10 s cold / ≈ 5 s warm here vs ≈ 4 s
  warm for the peer, with the compile step itself under 200 ms in both.

Verified the same way as the peer: the compiled binary, copied to an **empty
directory**, serves the SPA, the hashed `/_nuxt/*` assets, and both API routes
with no external files anywhere, and its CLI face output is byte-identical to
the peer binary and the npm bin.

## Boundary

Same rules as the peer, unchanged: no multi-vault registry, no SSE, no file
watching, no contract editor — the product app is `apps/web` (M-0009). The
example consumes the library only through published `markdown-contract`
exports (`markdown-contract`, `/declarative`, `/cli/run` — never `/cli`; the
entry-guard gotcha in the peer's README applies here identically).

## Layout

```
examples/single-binary-nitro/
  types/api.ts        # the wire contract, verbatim from the peer
  src/bin.ts          # combined entry, the `bun build --compile` target:
                      #   `daemon` → env + import ui/.output/server/index.mjs
                      #   anything else → runCli (markdown-contract/cli/run)
  ui/                 # the same one-page Nuxt SPA (ssr: false), plus:
    nuxt.config.ts    #   nitro: { preset: "bun", serveStatic: "inline" }
    server/api/       #   health.get.ts, validate.post.ts (thin h3 adapters)
    server/utils/     #   validate-vault.ts + peer test + fixtures/ —
                      #   the validate logic, testable without a Nuxt build
```

## Build & run

```bash
bun install                                      # workspace root
cd packages/core && bun run build && cd ../..    # the example imports the built library

cd examples/single-binary-nitro
bun run cli -- --help        # CLI face from source
bun run ui:dev               # DEV: UI + API together on one port — no daemon needed
bun run build:ui             # nuxt build ui → ui/.output (server + inlined SPA)
bun run daemon               # daemon face from source (needs build:ui first)

bun run build:binary         # nuxt build → NODE_ENV=production bun build --compile
./dist/markdown-contract validate <tree>         # face 1
./dist/markdown-contract daemon --open           # face 2 → http://127.0.0.1:4321
```

`bun run test` (the peer test of `validate-vault.ts`, Bun-only) and
`bun run typecheck` run as the CI-gated moon tasks
`example-single-binary-nitro:test` / `example-single-binary-nitro:typecheck`;
`moon run example-single-binary-nitro:build` runs the full binary pipeline locally.

## Planning docs

- [[D-0012-distribution-single-exec-and-web-ui]] — the governing decision; §D3
  records Nitro's `bun` preset as the productionization path this example validates.
- [[M-0008-single-exec-distribution]] — the milestone the peer example is the
  deliverable of; this variant extends its evidence to the Nitro server.
- [[M-0009-local-web-ui-vault-dashboard]] — the product milestone that would
  adopt this architecture in `apps/web`.
- [[T-UDPO-extract-single-binary-example]] — the extraction that produced the peer.
