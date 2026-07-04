// Barrel for the daemon face — re-exports only, no logic (repo convention).
export { handleApi, handleHealth, handleValidate, type RouteContext } from "./routes";
export { DEFAULT_PORT, type ServeOptions, serve } from "./server";
export { hasUi, serveStatic } from "./static";
