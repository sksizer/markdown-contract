// The REAL vault-dashboard SPA (D-0012 §D3) — still `ssr: false`: `nuxt generate`
// emits a static client bundle the daemon serves (dev: from ui/.output/public on
// disk; compiled binary: embedded via scripts/gen-assets.ts → src/daemon/assets.gen.ts).
//
// The daemon is the only backend. The editor's `useApi` now speaks the ontogen
// `Transport`, whose HTTP client is same-origin `/api/*` — served directly by
// the daemon in the compiled binary. Under `nuxt dev` the SPA is a separate
// origin, so `nitro.devProxy` (below) forwards `/api` → the daemon. The bespoke
// (non-transport) calls still honor `runtimeConfig.public.apiBase`, so setting
// NUXT_PUBLIC_API_BASE=http://127.0.0.1:4319 keeps them working too (the daemon
// also reflects localhost origins for CORS).
export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: "2025-01-01",

  // Dev only: the generated Transport is same-origin `/api`, but `nuxt dev`
  // serves the SPA on its own port — proxy `/api` to the daemon so the transport
  // reaches it. Target follows NUXT_PUBLIC_API_BASE (default the daemon's 4319).
  $development: {
    nitro: {
      devProxy: {
        "/api": {
          target: `${process.env.NUXT_PUBLIC_API_BASE || "http://127.0.0.1:4319"}/api`,
          changeOrigin: true,
        },
      },
    },
  },

  // SPIKE: consume the shared dashboard as a packaged Nuxt LAYER. Its pages,
  // composables, and plugins merge into this app; we supply the transport via
  // plugins/mc-transport.client.ts (here: a mock; real: createHttpTransport()).
  extends: ["@markdown-contract/dashboard"],

  modules: [],

  devtools: { enabled: false },

  // Token layer first (the shared kit's `--mc-*` custom properties), then the
  // app's base + controls layers that consume them.
  css: ["@markdown-contract/ui/theme.css", "~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },

  app: {
    head: {
      title: "markdown-contract — vault dashboard",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
