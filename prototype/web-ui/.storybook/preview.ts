import type { Preview } from "@storybook/vue3";

// Global tokens + base styles, so stories render with the same look as the app.
import "../assets/css/main.css";
// Make the mock fixtures available to any story/decorator that wants to `inject`
// them, demonstrating the "stories render off mock fixtures" provider convention.
// (Most stories pass fixtures explicitly as args — see *.stories.ts — which is the
//  primary, most readable form; this provider is the shared fallback seam.)
import { useMockVaults } from "../mocks";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/ },
    },
  },
  decorators: [
    // Provide the mock corpus to the whole render tree, then frame each story in a
    // light card so components are reviewed against the real app background.
    (story) => ({
      components: { story },
      setup() {
        return { vaults: useMockVaults() };
      },
      provide: {
        mockVaults: useMockVaults(),
      },
      template: `<div style="max-width: 960px; margin: 0 auto;"><story /></div>`,
    }),
  ],
};

export default preview;
