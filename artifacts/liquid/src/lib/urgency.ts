import type { UrgencyLevel } from "./sellWindow";

export const URGENCY_PILL: Record<UrgencyLevel, { label: string; bg: string; text: string; border: string }> = {
  PLANNED: { label: "Plan ahead", bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  WINDOW: { label: "⚡ Sell now", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  URGENT: { label: "Last chance", bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  CLIFF: { label: "Window closed", bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

export const URGENCY_HEAT: Record<UrgencyLevel, string> = {
  CLIFF: "#EF4444",
  URGENT: "#F97316",
  WINDOW: "#10B981",
  PLANNED: "#9126EF",
};
