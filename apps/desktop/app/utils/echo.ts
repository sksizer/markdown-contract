// Browser-side fallback for the `echo` IPC smoke test: used when the SPA runs
// outside the Tauri shell (plain `nuxt dev` in a browser tab), where
// `invoke("echo", …)` has no backend to reach. Mirrors the shape of the Rust
// command in src-tauri/src/api/v1/echo.rs minus the "from Rust" marker, so the
// UI makes it obvious which side answered.
export function echoFallback(message: string): Promise<string> {
  return Promise.resolve(`Echo: ${message}`);
}
