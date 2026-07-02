# @markdown-contract/web — the single binary (prototype)

The working prototype of **D-0012 §D3 "one binary, two faces"** (milestone
M-0008, reaching into M-0009's multi-vault surfaces): one bun-compiled
executable that is

- **the CLI** when run bare — argv is handed verbatim to `packages/core`'s
  exported `runCli`, so `validate` / `init` behave byte-identically to the npm
  bin (same formats, same exit codes); and
- **a localhost daemon** under `markdown-contract daemon` — a loopback-only
  `Bun.serve` hosting the vault dashboard (the Nuxt SPA, embedded into the
  executable) and the JSON API over the engine.

```
markdown-contract validate docs/ --format sarif     # CLI face
markdown-contract daemon --open                     # daemon face → http://127.0.0.1:4319
```

What the daemon does (all live, verified end-to-end):

- **multi-vault registry** — register/remove markdown trees + their
  `markdown-contract.yaml`; persisted as versioned JSON in the OS config dir
  (`~/Library/Application Support/markdown-contract/vaults.json` on macOS;
  override with `--registry <file>`). Durable intent only — the daemon reads
  vault docs, it **never edits them** (C-0010).
- **validation over the library** — `runCorpus` in-process (never shelling
  out), findings/stats in the pinned wire shapes.
- **contract scaffolding** — `POST /api/vaults/:id/init` runs the real `init`
  inference over a vault that has no config yet, then re-validates.
- **file watching** — a debounced recursive watch per vault (`.md`/`.yaml`
  changes; `.git`/`node_modules`/dot-trees ignored) re-validates on change;
  toggle per vault, or `--no-watch` globally.
- **live status over SSE** — `GET /api/events` pushes every state change;
  the dashboard folds events into the cards without a refresh.

## Layout

```
apps/web/
  types/api.ts        # THE wire contract — D-0012 §D3 shapes, adopted from
                      #   prototype/web-ui/types/api.ts (T-D7X1); daemon + UI both bind to it
  src/bin.ts          # combined entry, the `bun build --compile` target
  src/daemon/         # registry / status / runs / sse / watcher / static / api / daemon
                      #   (+ peer *.test.ts, `bun test src`)
  src/daemon/assets.gen.ts  # GENERATED embed manifest (committed as an empty stub)
  scripts/gen-assets.ts     # rewrites assets.gen.ts from ui/.output/public
  ui/                 # the Nuxt SPA (ssr:false) — components adopted from
                      #   prototype/web-ui, mock seams swapped for the live client:
                      #   composables/useApi.ts (mockApi → $fetch)
                      #   composables/useEventStream.ts (mock replayer → EventSource)
```

## Build & run

```bash
bun install                 # workspace root
cd packages/core && bun run build && cd ../..   # the daemon imports the built library

cd apps/web
bun run daemon              # daemon from source (serves ui/.output/public if built)
bun run cli -- --help       # CLI face from source

bun run ui:dev              # Nuxt dev server (set NUXT_PUBLIC_API_BASE=http://127.0.0.1:4319)
bun run ui:generate         # static SPA → ui/.output/public

bun run build:binary        # generate → embed manifest → bun build --compile
./dist/markdown-contract daemon --open
```

`daemon` flags: `--port <n>` (default 4319, always binds `127.0.0.1`), `--open`,
`--registry <file>`, `--no-watch`.

## Embedding (T-SPAE)

`scripts/gen-assets.ts` rewrites `src/daemon/assets.gen.ts` with one
`with { type: "file" }` import per built asset, so `bun build --compile` embeds
the whole SPA (26 assets, ~58 MB binary). Whole-directory embedding is avoided
per the known Bun gaps (oven-sh/bun#5445). Verified per T-SPAE AC-1: the binary
serves UI + API from an **empty directory** with no external files. Without a
UI build, the daemon still runs API-only and says so at `/`.

The committed `assets.gen.ts` is the empty stub (dev runs serve the SPA from
`ui/.output/public` on disk); `build:binary` regenerates it — don't commit the
regenerated form.

## Decisions honored / deliberately deferred

Honored from D-0012: bun over deno/node-SEA; library stays Node-canonical (the
daemon consumes `markdown-contract` package exports only — one additive change:
core now exports `./cli` for `runCli`, as D-0012 §D3 assumes); `Bun.serve` for
the prototype server (Nitro preset deferred to productionization); loopback
binds only; vault paths validated as untrusted input; registry versioned from
day one; three-layer state (durable registry / in-memory live status / history)
with the SQLite history layer deferred entirely.

Prototype shortcuts to revisit: the `daemon` verb name is still an open D-0012
question (`serve`/`ui`); drift entries are folded from error findings by rule-id
heuristic, not a true re-infer diff; vault removal doesn't push an SSE event
(other windows refresh on the next event or manually); no auth (single-user
localhost per scope); binary size untrimmed.
