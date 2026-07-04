/**
 * `GET /api/health` → `{ ok: true, version }` — liveness + identity, the same
 * envelope as the peer example. Nitro's file-based routing (`api/health.get.ts`)
 * replaces the peer's hand-rolled path/method dispatch: the filename IS the
 * route and the method, so a wrong method never reaches this handler.
 */
import { defineEventHandler } from "h3";
import { VERSION } from "markdown-contract";

import type { HealthResponse } from "../../../types/api";

export default defineEventHandler((): HealthResponse => ({ ok: true, version: VERSION }));
