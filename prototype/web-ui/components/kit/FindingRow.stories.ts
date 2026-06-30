import type { Meta, StoryObj } from "@storybook/vue3";

import { failingVault } from "../../mocks";
import FindingRow from "./FindingRow.vue";

/**
 * FindingRow renders one finding. Variants are sliced from the failing fixture so
 * each severity, the with-fix shape, and the whole-document (no position) shape
 * are all visible for side-by-side review.
 */
const meta: Meta<typeof FindingRow> = {
  title: "Kit/FindingRow",
  component: FindingRow,
};
export default meta;

type Story = StoryObj<typeof FindingRow>;

const findings = failingVault.result.findings;
const byLevel = (level: string) => findings.find((f) => f.level === level) ?? findings[0];

/** An error-level finding (CI-blocking) with a source position. */
export const Error: Story = {
  args: { finding: findings.find((f) => f.level === "error" && f.pos != null) ?? findings[0] },
};

/** A warn-level finding. */
export const Warn: Story = {
  args: { finding: byLevel("warn") },
};

/** A report-level (informational) finding. */
export const Report: Story = {
  args: { finding: byLevel("report") },
};

/** A finding that carries a fix description. */
export const WithFix: Story = {
  args: { finding: findings.find((f) => f.fix != null) ?? findings[0] },
};

/** A whole-document finding — no `pos`, so only the path shows. */
export const WholeDocument: Story = {
  args: { finding: findings.find((f) => f.pos == null) ?? findings[0] },
};
