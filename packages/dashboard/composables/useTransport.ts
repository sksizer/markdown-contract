import type { Transport } from "../transport";

// The single seam between the shared dashboard and its host app. Each app ships
// a plugin that provides `$mcTransport` (see apps/*/…/plugins/mc-transport):
//   apps/web      → createHttpTransport()   apps/desktop → createIpcTransport()
// `useNuxtApp` is a Nuxt auto-import; no import needed.
export function useTransport(): Transport {
  const t = useNuxtApp().$mcTransport as Transport | undefined;
  if (!t) {
    throw new Error(
      "markdown-contract dashboard: no transport provided — the host app must register an mc-transport plugin",
    );
  }
  return t;
}
