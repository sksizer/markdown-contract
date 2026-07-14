/**
 * Openers — the ontogen "open this path in a local app" surface
 * (`listOpeners` / `openPath` / `previewOpen`). This is a DESKTOP capability
 * (apps/desktop resolves it through Tauri): the loopback web daemon does not
 * launch host applications, so it exposes an empty opener list and refuses the
 * launch/preview calls with a clear "desktop-only" error.
 *
 * The dashboard's read path (vault list, scan) never touches these; they exist
 * so the shared transport's full contract has a defined web answer instead of a
 * 404.
 */
import type { OpenerInfo, OpenPreview } from "../../types/ontogen";

/** A capability the web daemon does not offer (opening paths in a host app) — maps to HTTP 501. */
export class OpenerUnsupportedError extends Error {}

/** The web daemon publishes no local openers. */
export function listOpeners(): OpenerInfo[] {
  return [];
}

/** Refused on the web daemon — launching a host application is desktop-only. */
export function openPath(_path: string, _appId: string): never {
  throw new OpenerUnsupportedError("opening a path in a local app is a desktop-only feature");
}

/** Refused on the web daemon — resolving a host-app launch command is desktop-only. */
export function previewOpen(_path: string, _appId: string): OpenPreview {
  throw new OpenerUnsupportedError("previewing a local-app launch is a desktop-only feature");
}
