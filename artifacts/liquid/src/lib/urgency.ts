import type { UrgencyLevel } from "./sellWindow";

/**
 * Canonical 4-Tier Semantic Urgency System
 * Conforms to WCAG 4.5:1 contrast and eliminates visual clutter.
 *
 * - WINDOW: Emerald (#059669 / #ECFDF5) — Peak Liquidity / Optimal Window Open
 * - URGENT: Amber (#D97706 / #FFFBEB)   — Imminent Cliff (<14 days)
 * - CLIFF:  Crimson (#DC2626 / #FEF2F2) — Cliff passed / Holding Burn Active
 * - PLANNED: Slate (#475569 / #F1F5F9)  — Normal depreciation / Safe holding
 */
export const URGENCY_PILL: Record<UrgencyLevel, { label: string; bg: string; text: string; border: string }> = {
  WINDOW:  { label: "⚡ Sell Now",    bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  URGENT:  { label: "Urgent Cliff",  bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  CLIFF:   { label: "Window Closed", bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  PLANNED: { label: "Planned Hold",  bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
};

export const URGENCY_HEAT: Record<UrgencyLevel, string> = {
  WINDOW:  "#10B981", // Emerald
  URGENT:  "#F59E0B", // Amber
  CLIFF:   "#EF4444", // Crimson
  PLANNED: "#94A3B8", // Slate
};
