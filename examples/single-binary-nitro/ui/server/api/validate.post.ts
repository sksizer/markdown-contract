/**
 * `POST /api/validate` `{ path, config? }` → `{ findings, stats, exitCode }` —
 * the same wire contract as the peer example's hand-rolled route. This handler
 * is a thin h3 adapter: parse the body, hand it to the plain
 * {@link validateVault} module (where the logic — and its peer test — lives),
 * emit whatever status + JSON it decided.
 *
 * `process.cwd()` is the base relative vault paths resolve against, matching
 * the peer daemon's `root` (the directory the daemon was started from).
 */
import { defineEventHandler, readBody, setResponseStatus } from "h3";

import { validateVault } from "../utils/validate-vault";

export default defineEventHandler(async (event) => {
  // h3's readBody never throws on malformed JSON — it hands the raw string
  // through — so validateVault owns the "request body must be JSON" 400.
  const body: unknown = await readBody(event).catch(() => undefined);
  const outcome = await validateVault(body, process.cwd());
  setResponseStatus(event, outcome.status);
  return outcome.body;
});
