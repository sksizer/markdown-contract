// The example's minimal SPA + Nitro daemon (D-0012 §D3) — unlike the peer
// example (`nuxt generate`, static output, hand-rolled server), `nuxt build`
// here emits a REAL Nitro server (ui/.output/server/index.mjs) that serves
// both the SPA and the /api routes under ui/server/api/.
//
// The two nitro options are the whole trick:
//  - preset "bun": the built entry boots `Bun.serve` as an import side effect,
//    reading NITRO_PORT / NITRO_HOST from env (src/bin.ts sets both before
//    importing it) — which is what lets `bun build --compile` embed the server.
//  - serveStatic "inline": every public asset is base64-inlined into the
//    server bundle and decoded from memory, so the compiled binary serves the
//    SPA from an empty directory with NO filesystem reads and NO embed
//    manifest script (the peer's gen-assets.ts has no counterpart here).
//
// `runtimeConfig.public.apiBase` stays "" (same origin) — and in THIS variant
// `nuxt dev` serves UI + API together, so dev needs no separate daemon and no
// NUXT_PUBLIC_API_BASE.
export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: "2025-01-01",

  modules: [],

  devtools: { enabled: false },

  css: ["~/assets/css/main.css"],

  nitro: {
    preset: "bun",
    serveStatic: "inline",
  },

  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },

  app: {
    head: {
      title: "markdown-contract — single-binary-nitro example",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
