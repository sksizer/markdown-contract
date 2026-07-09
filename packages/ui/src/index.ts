/**
 * Barrel only (CONVENTIONS.md § Modules & barrels): re-exports the kit —
 * components, the design-token tables + pure helpers, and the view-model types.
 * The theme's CSS custom properties ship separately as
 * `@markdown-contract/ui/theme.css` (add it to the consuming app's CSS).
 */
export { default as ContractGroup } from "./components/ContractGroup.vue";
export { default as EmptyState } from "./components/EmptyState.vue";
export { default as ErrorState } from "./components/ErrorState.vue";
export { default as FindingRow } from "./components/FindingRow.vue";
export { default as LoadingState } from "./components/LoadingState.vue";
export { default as SeverityBadge } from "./components/SeverityBadge.vue";
export { default as StatusBadge } from "./components/StatusBadge.vue";
export { default as Toolbar } from "./components/Toolbar.vue";
export * from "./findings";
export * from "./tokens";
export type * from "./types";
