# examples/single-binary — one binary, two faces

The **canonical example** of [[D-0012-distribution-single-exec-and-web-ui]] §D3 and the
deliverable of [[M-0008-single-exec-distribution]]: one Bun-compiled executable that is

- **the CLI** when run bare — argv is handed verbatim to `packages/core`'s exported
  `runCli`, so `validate` / `init` behave byte-identically to the npm bin (same
  formats, same exit codes); and
- **a localhost daemon** under `markdown-contract daemon` — a loopback-only
  `Bun.serve` hosting a minimal embedded web UI (one page: point at a markdown
  tree, validate, see findings) and the two-route JSON API over the engine.

This package is deliberately **minimal and stable**: it exists so the architecture
below stays legible, and so the remaining M-0008 tasks
([[T-BMTX-bun-compile-matrix]], [[T-DEMO-end-to-end-feasibility-demo]],
[[T-RELS-release-channels]]) target a fixed artifact instead of a moving product
app. Extracted from `apps/web` by [[T-UDPO-extract-single-binary-example]].

---

## Boundary — read this first

This example is **not the product app**. Everything beyond the minimal two-faces
slice is deliberately absent:

- **No multi-vault registry.** One stateless `POST /api/validate`; nothing is
  persisted anywhere.
- **No SSE / live status.** Request → response, that's all.
- **No file watching.** Validation runs when you ask, never on change.
- **No contract editor,** no extra pages, no drift view.

All of that is `apps/web` — the [[M-0009-local-web-ui-vault-dashboard]] vault
dashboard, which grew from this same skeleton (PR #183) and keeps evolving.
When you want product behavior, change `apps/web`; when you want to understand
(or demonstrate) the distribution architecture, change **nothing** and read on.

Two more boundary rules, enforced by review:

- The example consumes the library **only through published `markdown-contract`
  package exports** (`markdown-contract`, `markdown-contract/declarative`,
  `markdown-contract/cli/run`) — never a relative reach into `packages/core/src`,
  never an import from `apps/web` (code was copied here, not imported, so the two
  can diverge without coupling).
- `Bun.serve` / `Bun.file` live only here (and in `apps/web`); nothing Bun-only
  ever enters `packages/core`, which stays the runtime-neutral npm artifact.

---

## The architecture: one binary, two faces

```text
        ┌──────────── examples/single-binary (this package) ────────────┐
        │  src/bin.ts — the `bun build --compile` target                │
        │      │                                                        │
        │      ├─ argv[0] == "daemon" ──▶ src/daemon/server.ts          │
        │      │                          Bun.serve on 127.0.0.1:4320   │
        │      │                            ├─ /api/health              │
        │      │                            ├─ POST /api/validate ──▶ runCorpus
        │      │                            └─ everything else ──▶ embedded SPA
        │      │                               (src/daemon/static.ts ← assets.gen.ts)
        │      │                                                        │
        │      └─ anything else ──▶ runCli (markdown-contract/cli/run)  │
        │                           byte-identical to the npm bin       │
        └────────────────────────────────────────────────────────────────┘
                                 ▲ imports published exports only
                     packages/core — the canonical npm library + CLI
```

One dispatch decision, made once, in `src/bin.ts`: `daemon` boots the server
(foreground, Ctrl-C to stop); every other argv goes to the library's `runCli`.
Both faces share one engine — the daemon calls `runCorpus` **in-process** (never
shelling out), and replicates the CLI's config discovery, so the JSON the API
returns is the same data the CLI face prints.

## The build pipeline: generate → embed → compile

```text
bun run ui:generate   nuxt generate ui   → ui/.output/public   (static SPA, ssr: false)
bun run gen:assets    scripts/gen-assets.ts rewrites src/daemon/assets.gen.ts:
                      one `with { type: "file" }` import per built asset
bun run compile       bun build --compile src/bin.ts → dist/markdown-contract
```

`bun run build:binary` runs all three. The embed technique (from
[[T-SPAE-spa-embed]]): the generated `assets.gen.ts` imports every SPA file
explicitly with `with { type: "file" }`, so `bun build --compile` copies each one
into the executable and the import resolves at runtime to an embedded path that
`Bun.file` can serve. Whole-directory embedding is deliberately avoided — it has
known Bun gaps (oven-sh/bun#5445). The **committed** `assets.gen.ts` is an empty
stub: dev runs serve the SPA from `ui/.output/public` on disk, and the build
pipeline regenerates the manifest (never commit the regenerated form).

The result is verified by running the binary from an **empty directory**: the
SPA and API both serve with no external files anywhere.

## The loopback trust model

The daemon binds `127.0.0.1`, hard-coded — a non-loopback bind is not an option,
by design ([[D-0012-distribution-single-exec-and-web-ui]] §D1). That bind is the
entire security boundary: there is no auth, and `POST /api/validate` accepts any
path the daemon's OS user can read (absolute, or relative to the daemon's working
directory), exactly like the CLI face does. The requester on a loopback socket
*is* the local user, so the API grants nothing the terminal didn't already grant.
Invert any piece of this (bind a LAN address, add multi-user) and the no-auth,
no-jail posture stops being sound — that productionization belongs to M-0009,
not here.

Daemon surface, in full: `markdown-contract daemon [--port <n>] [--open]` —
default port **4320** (`apps/web`'s daemon uses 4319, so both run side by side),
foreground-only.

## Why `Bun.serve`, not Nitro

The SPA is Nuxt, and Nuxt ships Nitro — so why is the server five dozen lines
over `Bun.serve`? Because the prototype's riskiest unknown was the **client
embed**, not the server framework ([[M-0008-single-exec-distribution]]).
`Bun.serve` has the fewest moving parts that can prove the loop: static file
serving off the embedded manifest, two JSON routes, zero build integration.
Nitro's `bun` preset remains the recorded productionization path for the real
app ([[D-0012-distribution-single-exec-and-web-ui]] §D3) — here, Nuxt is used
strictly as a static-site generator (`ssr: false`, `nuxt generate`), and the
Nitro server it could emit is never built.

## The `cli/run` entry-guard gotcha

`src/bin.ts` imports **`markdown-contract/cli/run`** (the side-effect-free
module exporting `runCli`) and must never import **`markdown-contract/cli`**
(the npm bin wrapper). The wrapper guards its self-execution with the
Node-standard check:

```ts
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

Under `bun build --compile`, **every bundled module's `import.meta.url` is the
executable's path** — so the wrapper's "am I the entry?" guard false-positives
inside the compiled binary, runs core's `main()` with our argv, and
`process.exit()`s the daemon out from under us. This landed as a real bug in the
PR #183 prototype work; importing the pure `cli/run` module is the fix, and the
reason core exports it separately.

## Layout

```
examples/single-binary/
  types/api.ts        # the wire contract — the validate/health SUBSET of the
                      #   D-0012 §D3 seam (adopted from apps/web/types/api.ts)
  src/bin.ts          # combined entry, the `bun build --compile` target
  src/daemon/         # server (Bun.serve, loopback-only) / routes (health +
                      #   validate) / static (embedded-manifest resolution)
                      #   + peer *.test.ts (`bun test src`) + fixtures/
  src/daemon/assets.gen.ts  # GENERATED embed manifest (committed as an empty stub)
  scripts/gen-assets.ts     # rewrites assets.gen.ts from ui/.output/public
  ui/                 # the one-page Nuxt SPA (ssr: false): pages/index.vue +
                      #   components/kit/ + design/tokens.ts (adopted from apps/web)
```

## Build & run

```bash
bun install                                      # workspace root
cd packages/core && bun run build && cd ../..    # the example imports the built library

cd examples/single-binary
bun run cli -- --help        # CLI face from source
bun run daemon               # daemon from source (serves ui/.output/public if built)

bun run ui:dev               # Nuxt dev server (set NUXT_PUBLIC_API_BASE=http://127.0.0.1:4320)
bun run ui:generate          # static SPA → ui/.output/public

bun run build:binary         # generate → embed manifest → bun build --compile
./dist/markdown-contract validate <tree>         # face 1
./dist/markdown-contract daemon --open           # face 2 → http://127.0.0.1:4320
```

`bun run test` (peer tests, Bun-only) and `bun run typecheck` also run as the CI-gated
moon tasks `example-single-binary:test` / `example-single-binary:typecheck`;
`moon run example-single-binary:build` runs the full binary pipeline locally.

## Planning docs

- [[D-0012-distribution-single-exec-and-web-ui]] — the governing decision (single
  executable, one binary / two faces, loopback trust, distribution channels).
- [[M-0008-single-exec-distribution]] — the milestone this example is the deliverable
  of; [[T-BMTX-bun-compile-matrix]], [[T-DEMO-end-to-end-feasibility-demo]], and
  [[T-RELS-release-channels]] build on this package.
- [[M-0009-local-web-ui-vault-dashboard]] — the product milestone; its app is
  `apps/web`, seeded by the prototype this example was extracted from.
- [[T-DAEM-daemon-and-json-api]] / [[T-SPAE-spa-embed]] / [[T-WEBU-nuxt-spa-ui]] —
  the original M-0008 tasks whose landed slices this example carries.
- [[T-UDPO-extract-single-binary-example]] — the extraction itself.
