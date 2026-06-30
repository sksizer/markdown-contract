import type { Meta, StoryObj } from "@storybook/vue3";

import { countByLevel, failingVault } from "../../mocks";
import { SEVERITY_ORDER } from "../../design/tokens";
import SeverityBadge from "./SeverityBadge.vue";

/**
 * SeverityBadge names one finding severity. Each level gets a named variant, plus
 * a `Scale` that shows all three with real per-level counts from a fixture.
 */
const meta: Meta<typeof SeverityBadge> = {
  title: "Kit/SeverityBadge",
  component: SeverityBadge,
};
export default meta;

type Story = StoryObj<typeof SeverityBadge>;

/** Highest severity — CI-blocking. */
export const Error: Story = {
  args: { level: "error" },
};

/** Mid severity — passes CI but worth review. */
export const Warn: Story = {
  args: { level: "warn" },
};

/** Lowest severity — informational. */
export const Report: Story = {
  args: { level: "report" },
};

/** All three levels with real counts from the failing fixture. */
export const Scale: Story = {
  render: () => ({
    components: { SeverityBadge },
    setup() {
      const counts = countByLevel(failingVault.result.findings);
      return { order: SEVERITY_ORDER, counts };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <SeverityBadge
          v-for="level in order"
          :key="level"
          :level="level"
          :count="counts[level]"
        />
      </div>
    `,
  }),
};
