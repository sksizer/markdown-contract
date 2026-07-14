// The shared vault-dashboard, packaged as a Nuxt LAYER (D-0012/D-0018 spike).
//
// A Nuxt layer is just a directory with its own `nuxt.config.ts`. When a host
// app lists it in `extends`, Nuxt MERGES the layer's `pages/`, `components/`,
// `composables/`, `plugins/`, and even `server/` routes into the host — so the
// dashboard is authored ONCE here and each app only supplies its transport.
//
//   apps/web       → extends this layer + provides createHttpTransport()  (daemon)
//   apps/desktop   → extends this layer + provides createIpcTransport()   (Tauri)
//
// The layer itself is transport-agnostic: every screen/composable talks to the
// host-provided `$mcTransport` (see composables/useTransport.ts), so the same
// pages run over HTTP, Tauri IPC, or a mock.
export default defineNuxtConfig({});
