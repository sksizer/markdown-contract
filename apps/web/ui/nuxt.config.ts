// The REAL vault-dashboard SPA (D-0012 §D3) — still `ssr: false`: `nuxt generate`
// emits a static client bundle the daemon serves (dev: from ui/.output/public on
// disk; compiled binary: embedded via scripts/gen-assets.ts → src/daemon/assets.gen.ts).
//
// The daemon is the only backend. `runtimeConfig.public.apiBase` is "" (same
// origin) in the served/embedded case; under `nuxt dev` set
// NUXT_PUBLIC_API_BASE=http://127.0.0.1:4319 to reach a daemon on its own port
// (the daemon reflects localhost origins for CORS).
export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: "2025-01-01",

  modules: [],

  devtools: { enabled: false },

  css: ["~/assets/css/main.css"],

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
