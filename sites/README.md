# sites/

Websites live here — workspace members under the `sites/*` glob, resolved
through the root `bun.lock` like everything else.

| Site | Role |
|---|---|
| [`docs`](docs/) | Astro + Starlight documentation site (M-0006), deployed to GitHub Pages by `.github/workflows/deploy-docs.yml`. |

The split from `apps/`: **`apps/` holds runtime applications** (the
single-binary daemon prototype, the UI prototype); **`sites/` holds static
websites** built and deployed as sites, the documentation site included.
