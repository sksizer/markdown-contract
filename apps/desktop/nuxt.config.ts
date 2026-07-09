// The desktop frontend (D-0018 §D1) — a Nuxt 4 SPA rendered inside the Tauri v2
// webview. `ssr: false` + `nuxt generate` emit a static client bundle that
// src-tauri/tauri.conf.json embeds via `frontendDist: "../.output/public"`.
//
// Dev port: Tauri's `devUrl` pins http://localhost:1420, so the Nuxt dev server
// must sit on the same port. TAURI_DEV_PORT overrides both sides together (set
// it for `bun run tauri dev` and it flows into the `beforeDevCommand` env); the
// template's cksum-derived port-block machinery is deliberately dropped.
export default defineNuxtConfig({
  telemetry: false,

  compatibilityDate: "2024-11-01",

  ssr: false,

  devtools: { enabled: false },

  // @nuxt/ui v4 brings Tailwind v4 in through its own Vite integration; the CSS
  // entry imports both. The template's @nuxt/eslint (repo lints with biome),
  // @nuxt/scripts, @nuxt/test-utils, @nuxt/icon, and @nuxt/fonts modules are
  // dropped — the last two so `nuxt generate` stays network-free.
  modules: ["@nuxt/ui"],

  css: [
    // The shared kit's `--mc-*` design-token layer (light + dark), loaded first
    // so the app's own layers can consume the variables (D-0018 §D6).
    "@markdown-contract/ui/theme.css",
    // Kills the rubber-band overscroll bounce so the webview feels like an app.
    "~/assets/css/no-bounce.css",
    "~/assets/css/main.css",
  ],

  devServer: {
    port: Number(process.env.TAURI_DEV_PORT ?? 1420),
    host: "localhost",
  },
});
