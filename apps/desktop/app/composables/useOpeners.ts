// "Open in …" over the generated bindings (D-0018 §D5): the detected-app list
// (already preference-merged by the backend), launch, and launch preview.
// The detected list is cached per webview — installed apps don't change
// mid-session, and every menu shares it.
import type { Transport } from "../bindings/transport";
import { createIpcTransport } from "../bindings/transport";
import type { OpenerInfo, OpenPreview } from "../bindings/types";

let transport: Transport | undefined;

function ipc(): Transport {
  transport ??= createIpcTransport();
  return transport;
}

let openersCache: Promise<OpenerInfo[]> | undefined;

/** Opener operations over the generated service surface. */
export function useOpeners() {
  return {
    /** Detected installed apps, preference-merged; cached per webview. */
    list: (): Promise<OpenerInfo[]> => {
      openersCache ??= ipc()
        .listOpeners()
        .catch((e) => {
          openersCache = undefined; // don't cache a failure
          throw e;
        });
      return openersCache;
    },
    /** Launch `path` with the app `appId` (Obsidian-URI aware backend). */
    open: (path: string, appId: string): Promise<null> => ipc().openPath(path, appId),
    /** What `open` would launch, without launching it. */
    preview: (path: string, appId: string): Promise<OpenPreview> => ipc().previewOpen(path, appId),
  };
}
