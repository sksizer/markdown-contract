// Prototype Nuxt config — SPA only, deliberately minimal.
//
// Boundary (see README): this app imports NOTHING from the engine (`packages/core`),
// defines NO server/ dir and NO Nitro API routes, and is NOT the single binary
// (M-0008-single-exec-distribution / T-SPAE-spa-embed). It runs on mock data only.
export default defineNuxtConfig({
  // SPA: render entirely on the client, no SSR. `nuxt generate` therefore emits a
  // static client bundle the prototype shell can be served from.
  ssr: false,

  // Pin the Nitro/Nuxt feature baseline so `build`/`generate` are reproducible.
  // (Nuxt uses Nitro internally only as its build packager here — the app itself
  //  declares no server routes and depends on no daemon.)
  compatibilityDate: "2025-01-01",

  // Keep the module surface empty — no engine wiring, no data modules.
  modules: [],

  devtools: { enabled: false },

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "markdown-contract — vault dashboard (prototype)",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
