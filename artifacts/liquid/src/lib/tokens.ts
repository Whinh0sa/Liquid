// ─── Liquid Design System — Unified Design Tokens ─────────────────────────────
//
// Single source of truth for Liquid's high-craft fintech aesthetic.
// Eliminates raw hex strings across cards, drawers, layout, and modals.

export const BRAND = {
  primary: "#7C3AED",        // Electric Purple
  primaryHover: "#6D28D9",   // Deep Purple
  primaryLight: "#F5F3FF",   // Purple 50
  primaryBorder: "#DDD6FE",  // Purple 200
  primaryText: "#5B21B6",    // Purple 800
  primaryGlow: "rgba(124, 58, 237, 0.25)",
} as const;

export const CANVAS = {
  bg: "#F8F9FA",             // Alabaster Workspace
  surface: "#FFFFFF",        // Pure White Card
  subtle: "#F1F5F9",         // Slate 100
  border: "#E2E8F0",         // Slate 200
  borderSubtle: "rgba(226, 232, 240, 0.8)",
} as const;

export const SEMANTIC = {
  // Peak liquidation window (Emerald)
  window: {
    base: "#10B981",
    bg: "#ECFDF5",
    text: "#065F46",
    border: "#A7F3D0",
  },
  // Imminent cliff (Amber)
  urgent: {
    base: "#F59E0B",
    bg: "#FFFBEB",
    text: "#92400E",
    border: "#FDE68A",
  },
  // Cliff passed / high burn (Crimson)
  cliff: {
    base: "#EF4444",
    bg: "#FEF2F2",
    text: "#991B1B",
    border: "#FECACA",
  },
  // Normal planned hold (Slate)
  planned: {
    base: "#94A3B8",
    bg: "#F1F5F9",
    text: "#475569",
    border: "#E2E8F0",
  },
} as const;
