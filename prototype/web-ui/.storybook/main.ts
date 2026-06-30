import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import type { StorybookConfig } from "@storybook/vue3-vite";

// biome-ignore lint/suspicious/noExplicitAny: vite plugin objects are loosely typed across major versions
type AnyPlugin = any;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Storybook for the prototype.
 *
 * Framework: `@storybook/vue3-vite` (NOT `@storybook-vue/nuxt`). The components
 * are plain Vue 3 SFCs that take all data via props and import nothing from Nuxt,
 * so the lighter vue3-vite framework renders them faithfully and builds far more
 * reliably non-interactively than the heavier Nuxt-Storybook integration. See the
 * README "Storybook framework" note for the rationale and how to migrate to
 * `@storybook-vue/nuxt` if a real apps/web later needs Nuxt auto-imports in stories.
 */
const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|js)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },
  viteFinal(viteConfig) {
    // Mirror Nuxt's `~` / `@` aliases so a story that references them resolves the
    // same way the app shell does. Array-safe: Vite may model `resolve.alias` as
    // either an object or an array of { find, replacement } entries.
    viteConfig.resolve ??= {};
    const alias = viteConfig.resolve.alias;
    if (Array.isArray(alias)) {
      viteConfig.resolve.alias = [
        ...alias,
        { find: "~", replacement: root },
        { find: "@", replacement: root },
      ];
    } else {
      viteConfig.resolve.alias = { ...alias, "~": root, "@": root };
    }

    // Ensure `.vue` SFCs are compiled. Under Vite 7, this Storybook framework
    // version does not always inject `@vitejs/plugin-vue` itself, which leaves
    // raw `<script setup>` reaching Rollup ("Expression expected"). Add the Vue
    // plugin ourselves, guarded so we never register it twice.
    const plugins: AnyPlugin[] = (viteConfig.plugins ?? []) as AnyPlugin[];
    const hasVue = plugins
      .flat(Number.POSITIVE_INFINITY)
      .some((p: AnyPlugin) => p && p.name === "vite:vue");
    if (!hasVue) {
      viteConfig.plugins = [...plugins, vue()];
    }
    return viteConfig;
  },
};

export default config;
