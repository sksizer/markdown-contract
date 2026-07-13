// The transport CONTRACT the shared dashboard codes against — the ontogen
// `Transport`, vendored under ./bindings. Re-exported here as the stable public
// path `@markdown-contract/dashboard/transport` so pages/plugins depend on this,
// not on the vendored file layout.

export type { Transport } from "./bindings/transport";
export { createHttpTransport } from "./bindings/transport";
export type { FindingRecord, ScanRun, Vault } from "./bindings/types";
