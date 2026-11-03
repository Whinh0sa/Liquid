// ─── Liquid Design System — Unified Design Tokens ─────────────────────────────
//
// Single source of truth for Liquid's high-craft fintech aesthetic.
// Eliminates raw hex strings across cards, drawers, layout, and modals.
// Includes full support for Light mode and Dark Obsidian Slate mode (#0B0D13).

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
  textPrimary: "#0F172A",    // Slate 900
  textSecondary: "#475569",  // Slate 600
  textMuted: "#94A3B8",      // Slate 400
} as const;

export const DARK_CANVAS = {
  bg: "#0B0D13",             // Dark Obsidian Slate
  surface: "#131722",        // Obsidian Card Surface
  surfaceElevated: "#1A1F2E",// Elevated Surface (inputs, sub-panels)
  subtle: "#181C2A",         // Subtle Dark Container
  border: "#23283A",         // Dark Slate Divider
  borderSubtle: "rgba(35, 40, 58, 0.8)",
  textPrimary: "#F8FAFC",    // Crisp White/Silver Text
  textSecondary: "#94A3B8",  // Slate 400 Text
  textMuted: "#64748B",      // Slate 500 Text
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

export const DARK_SEMANTIC = {
  window: {
    base: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
    text: "#34D399",
    border: "rgba(16, 185, 129, 0.3)",
  },
  urgent: {
    base: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.15)",
    text: "#FBBF24",
    border: "rgba(245, 158, 11, 0.3)",
  },
  cliff: {
    base: "#EF4444",
    bg: "rgba(239, 68, 68, 0.15)",
    text: "#F87171",
    border: "rgba(239, 68, 68, 0.3)",
  },
  planned: {
    base: "#64748B",
    bg: "rgba(100, 116, 139, 0.15)",
    text: "#94A3B8",
    border: "rgba(100, 116, 139, 0.3)",
  },
} as const;
