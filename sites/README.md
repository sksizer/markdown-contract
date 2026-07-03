# sites/

Websites live here — workspace members under the `sites/*` glob, resolved
through the root `bun.lock` like everything else.

| Site | Role |
|---|---|
| [`docs`](docs/) | Astro + Starlight documentation site (M-0006), published to Cloudflare Pages at <https://markdown-contract-docs.pages.dev/> via `wrangler pages deploy sites/docs/dist`. |

The split from `apps/`: **`apps/` holds runtime applications** (the
single-binary daemon prototype, the UI prototype); **`sites/` holds static
websites** built and deployed as sites, the documentation site included.
