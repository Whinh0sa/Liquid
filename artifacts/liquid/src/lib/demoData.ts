/**
 * demoData.ts
 * Pre-seeded portfolio assets shown when the backend API is unreachable or on demo mode.
 * Persists user additions / status changes to localStorage so demo mode is fully interactive!
 */

import type { PortfolioResponse, Asset, AssetStatus } from "@workspace/api-client-react";

const NOW = Date.now();
const daysFromNow = (d: number) => new Date(NOW + d * 86_400_000).toISOString();

const INITIAL_DEMO_PORTFOLIO: Asset[] = [
  {
    id: "demo-1",
    category: "TECH",
    model: "MacBook Pro 14 M1 Pro",
    purchasePrice: 199900,
    currentValue: 92000,
    depreciationCliff: { daysAway: 21, projectedDrop: 14720, reason: "M4 MacBook Pro Release Cycle" },
    status: "ACTION_REQUIRED" as AssetStatus,
  },
  {
    id: "demo-2",
    category: "AUDIO",
    model: "Sony WH-1000XM4",
    purchasePrice: 34900,
    currentValue: 16500,
    depreciationCliff: { daysAway: 45, projectedDrop: 1980, reason: "XM5 Successor Price Compression" },
    status: "HOLD" as AssetStatus,
  },
  {
    id: "demo-3",
    category: "TECH",
    model: "Keychron Q1 Pro",
    purchasePrice: 19900,
    currentValue: 12000,
    depreciationCliff: { daysAway: 110, projectedDrop: 1440, reason: "Annual Keyboard Season Inflow" },
    status: "HOLD" as AssetStatus,
  },
  {
    id: "demo-4",
    category: "TECH",
    model: "LG 27UK850 4K Monitor",
    purchasePrice: 44900,
    currentValue: 21000,
    depreciationCliff: { daysAway: 18, projectedDrop: 3360, reason: "OLED Monitor Market Flood" },
    status: "ACTION_REQUIRED" as AssetStatus,
  },
  {
    id: "demo-5",
    category: "TECH",
    model: "iPhone 14 Pro",
    purchasePrice: 109900,
    currentValue: 54000,
    depreciationCliff: { daysAway: 12, projectedDrop: 8640, reason: "iPhone 16 Launch — Secondary Market Flood" },
    status: "ACTION_REQUIRED" as AssetStatus,
  },
  {
    id: "demo-6",
    category: "GAMING",
    model: "GeForce RTX 4080 Super",
    purchasePrice: 99900,
    currentValue: 72000,
    depreciationCliff: { daysAway: 55, projectedDrop: 12960, reason: "RTX 5000 Series Announcement" },
    status: "HOLD" as AssetStatus,
  },
];

const STORAGE_KEY = "liquid_portfolio_assets_v2";

export function getStoredAssets(): Asset[] {
  if (typeof window === "undefined") return INITIAL_DEMO_PORTFOLIO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_PORTFOLIO));
      return INITIAL_DEMO_PORTFOLIO;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_DEMO_PORTFOLIO;
  } catch {
    return INITIAL_DEMO_PORTFOLIO;
  }
}

export function saveStoredAssets(assets: Asset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (e) {
    console.error("Failed to save assets to localStorage", e);
  }
}

export function computePortfolioMetrics(portfolio: Asset[]) {
  const totalNetWorth = portfolio.reduce((s, a) => s + (a.status !== "LIQUIDATE" ? a.currentValue : 0), 0) / 100;
  const capitalAtRisk =
    portfolio
      .filter((a) => a.status !== "LIQUIDATE" && a.depreciationCliff.daysAway <= 15)
      .reduce((s, a) => s + a.currentValue, 0) / 100;

  return { totalNetWorth, capitalAtRisk };
}

export function getDemoPortfolioResponse(): PortfolioResponse {
  const portfolio = getStoredAssets();
  const metrics = computePortfolioMetrics(portfolio);
  return {
    portfolio,
    metrics,
  };
}

export function addDemoAsset(item: {
  category: string;
  make: string;
  model: string;
  storageCapacity?: string;
  purchasePrice: number; // in cents
  currentEstimatedValue: number; // in cents
  projectedDrop: number; // in cents
  cliffDate: string;
  cliffReason: string;
  status: string;
}): Asset {
  const currentAssets = getStoredAssets();
  const cliffMs = new Date(item.cliffDate).getTime();
  const nowMs = Date.now();
  const daysAway = Math.max(1, Math.round((cliffMs - nowMs) / (1000 * 60 * 60 * 24)));

  const newAsset: Asset = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: item.category,
    model: item.storageCapacity ? `${item.model} (${item.storageCapacity})` : item.model,
    purchasePrice: item.purchasePrice,
    currentValue: item.currentEstimatedValue,
    depreciationCliff: {
      daysAway,
      projectedDrop: item.projectedDrop,
      reason: item.cliffReason,
    },
    status: (item.status as AssetStatus) || ("HOLD" as AssetStatus),
  };

  const updated = [newAsset, ...currentAssets];
  saveStoredAssets(updated);
  return newAsset;
}

export function updateDemoAssetStatus(id: string, status: AssetStatus): void {
  const currentAssets = getStoredAssets();
  const updated = currentAssets.map((a) => (a.id === id ? { ...a, status } : a));
  saveStoredAssets(updated);
}

export function resetDemoPortfolio(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_PORTFOLIO));
}

/** Returns true when the app should run in demo/offline mode */
export function isDemoMode(): boolean {
  if (typeof window !== "undefined") {
    if (localStorage.getItem("liquid_demo_force") === "true") return true;
    const isProd = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    // On production domains without an explicit remote API backend configured
    if (isProd && (!apiBase || apiBase.includes("localhost"))) return true;
  }
  if (import.meta.env.VITE_DEMO_MODE === "true") return true;
  if (!import.meta.env.VITE_API_BASE_URL) return true;
  return false;
}

export const DEMO_PORTFOLIO_RESPONSE: PortfolioResponse = getDemoPortfolioResponse();
