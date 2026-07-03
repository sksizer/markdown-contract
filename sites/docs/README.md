# @markdown-contract/docs

Astro + [Starlight](https://starlight.astro.build) documentation site for
markdown-contract (M-0006), live at <https://markdown-contract-docs.pages.dev/>.
A workspace sibling of the published library (`packages/core`) — `private: true`,
never published to npm.

Builds as a moon project on the **bun** toolchain to static output:

```sh
moon run docs:build   # -> sites/docs/dist/ (static site, root index.html)
```

The landing page and the per-example pages are **generated, not hand-authored**
(T-SITE): the `build`/`dev` scripts first run `bun scripts/generate.ts`, which
renders the example catalog (`docs/catalog/*.yaml`) into pages under
`src/content/docs/` (gitignored build artifacts; the YAML is the source of
truth). The build also needs a **built `packages/core`** — the moon `docs:build`
task declares `deps: [core:build]` — because `scripts/check-artifacts.ts`
regression-checks every example artifact against the real library. The site is
therefore *not* buildable from `sites/docs/` in isolation: it needs the whole
workspace installed and the library built.

## Publishing (Cloudflare Pages)

Published as the Cloudflare Pages project **`markdown-contract-docs`** via git
integration: a push to `main` touching a build watch path triggers a build and
deploy. (GitHub Pages was the original plan — T-PAGE — but the repo is private,
so GitHub Pages can't be enabled.)

Project build settings:

| Setting | Value |
|---|---|
| Root directory | `/` (repo root — the build needs the whole workspace) |
| Build command | `bun install && bunx moon run docs:build` |
| Build output | `sites/docs/dist` |
| Build watch paths | `sites/docs/*`, `docs/catalog/*`, `packages/core/*` |

**Required environment variables** (set for Production *and* Preview):

| Variable | Value | Why |
|---|---|---|
| `SKIP_DEPENDENCY_INSTALL` | `1` | Cloudflare's pre-build auto-install cannot detect Bun from the text `bun.lock` (it only recognizes the legacy binary `bun.lockb`), so it falls back to `npm install`, which fails on the `workspace:*` dependency protocol with `EUNSUPPORTEDPROTOCOL` — before the build command ever runs. Skipping the auto-install makes the build command's own `bun install` the only install step. |
| `BUN_VERSION` | `1.2.21` | Pins a Bun ≥ 1.2 that can read the text `bun.lock`. Keep in step with the local toolchain. |

Manual fallback (direct upload, no git integration involved):

```sh
bunx moon run docs:build
bunx wrangler pages deploy sites/docs/dist --project-name markdown-contract-docs
```
