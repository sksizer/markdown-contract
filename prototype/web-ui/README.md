# web-ui prototype (`@markdown-contract/web-ui-prototype`)

A **standalone Nuxt 3 SPA + Storybook** prototype for the markdown-contract
**local vault dashboard** (the product concept from decision
[[D-0012-distribution-single-exec-and-web-ui]]): it tracks managed "vaults"
(markdown trees) and shows each one's validation status.

It exists to let us **hammer out the UI on mock data** — Storybook is the primary
prototyping harness; the Nuxt shell makes assembled screens viewable as a real
app too.

---

## Boundary — read this first

This package is **deliberately decoupled** from the engine and from the
distribution work. It is **not** production and **not** the binary:

- **Mock data only.** Every screen renders off `mocks/` fixtures. There is no
  network, no SSE, no daemon.
- **Imports nothing from `src/`.** It mirrors the engine's *output shape*
  (`Finding`, `RunStats`, the `runCorpus` return) as **local copies** in
  `mocks/types.ts`. There is no import edge to the engine; if the engine's public
  shape changes, those local types are updated by hand.
- **Not the single binary.** It is decoupled from
  [[M-0008-single-exec-distribution]] and [[T-SPAE-spa-embed-spike]]: no Nitro
  API routes, no `server/` dir, no single-exec embedding. (Nuxt uses Nitro
  *internally* only as its build packager; the app itself declares no server
  routes and depends on no daemon.)
- **Not wired into the workspace.** It has its own `package.json`, its own
  `node_modules`, and its own `tsconfig.json`. It is **not** a `moon` project and
  is **not** in the repo-root `npm` workspaces; the repo-root `npm run test` /
  `npm run typecheck` never see it.

The real engine wiring (routing the UI through `runCorpus` / a real backend) is
**deferred** behind the review gate [[T-UTKU-web-ui-prototype-review]]; only after
that gate does a real `apps/web` adopt these components.

---

## Run it

From `prototype/web-ui/`:

```bash
npm install            # isolated install (own node_modules)

npm run storybook      # Storybook harness  → http://localhost:6006
npm run dev            # Nuxt SPA app shell → http://localhost:3000

npm run build-storybook   # static Storybook build → storybook-static/
npm run generate          # static SPA build       → .output/public/  (ssr: false)
npm run typecheck         # nuxt prepare + vue-tsc --noEmit
```

> First `npm install` here uses `legacy-peer-deps` (see `.npmrc`) because the Nuxt
> and Storybook toolchains pull overlapping-but-not-identical `vite` peer ranges
> into one sandbox install. This is scoped to `prototype/web-ui/` only.

---

## Layout

```
prototype/web-ui/
  package.json          # private prototype package; dev + storybook scripts
  nuxt.config.ts        # ssr: false (SPA); no modules, no server/ dir
  tsconfig.json         # extends ./.nuxt/tsconfig.json only (no repo-root ref)
  app.vue               # SPA root (NuxtLayout > NuxtPage)
  layouts/default.vue   # app-shell header/footer
  pages/index.vue       # the dashboard screen, off useMockVaults()
  assets/css/main.css   # base + design tokens (components are otherwise scoped)
  components/
    FindingsList.vue        + FindingsList.stories.ts
    VaultStatusCard.vue     + VaultStatusCard.stories.ts
    RunSummary.vue          + RunSummary.stories.ts
    VaultDashboard.vue      + VaultDashboard.stories.ts   # the assembled screen
  mocks/                # the mock-data layer (the seam the real app swaps later)
    types.ts            #   local mirror of engine output shapes (NOT imported)
    builders.ts         #   fixture factories
    fixtures.ts         #   clean / warning / failing vaults
    composables.ts      #   useMockVaults() / useMockCorpus()
    index.ts            #   barrel
  .storybook/
    main.ts             # vue3-vite framework; stories glob; ~ / @ aliases
    preview.ts          # global CSS + mock-fixture provider decorator
  CONVENTIONS.md        # the variant convention (below, in full)
```

The components are **plain Vue 3 SFCs** that take all data via props and import
nothing from Nuxt or the engine — so they render identically in Storybook and in
the app shell, and can graft into a future `apps/web` largely unchanged.

---

## Storybook framework: `@storybook/vue3-vite` (not `@storybook-vue/nuxt`)

This prototype uses the **`@storybook/vue3-vite`** framework, the lighter, more
robust option the task explicitly sanctions as the fallback. The components are
plain Vue SFCs (props-only, no Nuxt auto-imports), so they render faithfully under
vue3-vite, and its static build (`build-storybook`) is far more reliable to run
non-interactively than the heavier `@storybook-vue/nuxt` integration (which boots
a full Nuxt/Nitro environment just to render leaf components).

If a real `apps/web` later needs Nuxt-specific features *inside* stories (auto
imports, `useFetch`, Nuxt plugins), switch the framework in `.storybook/main.ts`
to `@storybook-vue/nuxt` — the stories and components themselves don't change,
since they don't depend on Nuxt today.

---

## Variant convention

> **Every component and screen ships at least two named story variants.**

Storybook is the comparison surface, so a component earns its harness only by
showing its *meaningfully different states* side by side (empty vs. populated,
passing vs. failing). Variants are driven off the `mocks/` fixtures, never inline
literals. The full rule, naming pairs, and a per-component checklist live in
[`CONVENTIONS.md`](./CONVENTIONS.md). Examples shipped here:

| Component         | Variants                          |
| ----------------- | --------------------------------- |
| `FindingsList`    | `Empty` / `Populated` / `ErrorsOnly` |
| `VaultStatusCard` | `Passing` / `Warnings` / `Failing`   |
| `RunSummary`      | `Clean` / `Failing`                  |
| `VaultDashboard`  | `AllPassing` / `Mixed` / `Failing` / `Empty` |
