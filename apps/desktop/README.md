# markdown-contract-desktop

The desktop app (D-0018 §D1): a Tauri v2 shell around a Nuxt 4 SPA, instantiated
from [template-tauri-nuxt](https://github.com/sksizer/template-tauri-nuxt) and
adapted to this workspace's Bun + moon conventions (pnpm/make/just/mise and the
template's release tooling are dropped).

## Layout

- **Project root** — the Nuxt 4 app (bun workspace member): `nuxt.config.ts`,
  `app/` (SPA, `ssr: false`), `public/`. `nuxt generate` emits `.output/public`.
- **`src-tauri/`** — the Rust shell crate `markdown-contract-desktop` (a member
  of the root `/Cargo.toml` workspace). `tauri.conf.json` embeds the SPA via
  `frontendDist: "../.output/public"`; the tauri CLI runs its
  `beforeDevCommand`/`beforeBuildCommand` (`bun run dev` / `bun run generate`)
  from this directory's parent — i.e. this package root, where those scripts live.

The current surface is the vault-dashboard shell (D-0018 §D6) rendered from the
shared kit (`@markdown-contract/ui`): Toolbar + the "no vaults tracked yet"
empty state + the status language. The template's IPC smoke test — the `echo`
Tauri command (`src-tauri/src/lib.rs`) round-tripped from `app/app.vue` — stays
reachable in the landing page's dev section.

## Dev workflow

```sh
bunx moon run desktop:dev      # tauri dev: Nuxt on :1420 + native window
```

Needs a **desktop session** (a display) plus the Tauri Linux system deps
(webkit2gtk-4.1 / gtk3). Override the dev port with `TAURI_DEV_PORT` (it moves
the Nuxt dev server; adjust `devUrl` in `tauri.conf.json` to match).

In a **headless container** the window can't open — the useful subset is:

```sh
bunx moon run desktop:generate    # static SPA → .output/public
bunx moon run desktop:typecheck   # nuxt typecheck (vue-tsc)
bunx moon run desktop:test        # bun test app (frontend unit peers)
bunx moon run desktop:check-rust  # cargo check -p markdown-contract-desktop
bunx moon run desktop:test-rust   # cargo test  -p markdown-contract-desktop
```

`tauri build` (bundling installers) is intentionally not modeled as a moon task
yet; run `bun run tauri build` manually when needed.
