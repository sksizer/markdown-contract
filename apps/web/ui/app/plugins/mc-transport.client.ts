// The host app's ONE responsibility under the shared-dashboard layer: provide
// the transport the layer's pages/composables consume as `$mcTransport`.
//
// apps/web is the HTTP face, so it provides the ontogen `createHttpTransport()`
// (same-origin `/api/*`, served by the daemon). apps/desktop's equivalent plugin
// provides `createIpcTransport()`. Same layer, same Transport contract, one line
// different per app.
//
// NOTE (spike): the daemon must serve the ontogen `/api/*` CRUD shape for live
// data — see the PR description's "backend convergence" gap. The wiring, types,
// and bundle are proven here; aligning the daemon endpoints is the next step.
import type { Transport } from "@markdown-contract/dashboard/transport";
import { createHttpTransport } from "@markdown-contract/dashboard/transport";

export default defineNuxtPlugin(() => {
  const transport: Transport = createHttpTransport();
  return { provide: { mcTransport: transport } };
});
