// ─── Portfolio Metrics Service ────────────────────────────────────────────────
//
// Pure, deterministic business logic for calculating executive aggregates:
//   - Net Worth & Purchase Baseline
//   - Window Open Counts (actionable exit timing)
//   - Urgent Approaching Cliffs (<14 days)
//   - Capital At Risk & Amortized Daily Decay
//   - Batch Exit Candidates

import { computeSellWindow } from "@/lib/sellWindow";

export interface MetricAsset {
  id: string;
  category?: string;
  model?: string;
  currentValue: number;       // in cents
  purchasePrice: number;      // in cents
  depreciationCliff: {
    daysAway: number;
    projectedDrop: number;    // in cents
    reason?: string;
  };
  status: string;
}

export interface ComputedPortfolioMetrics<T extends MetricAsset = MetricAsset> {
  totalNetWorthDollars: number;
  totalPurchaseBasisDollars: number;
  totalSavedDollars: number;
  atRiskTotalDollars: number;
  dailyDecayRateDollars: number;
  windowOpenCount: number;
  urgentCount: number;
  cliffCount: number;
  actionableAssets: T[];
  batchSellTargets: T[];
}

/**
 * Computes portfolio metrics from asset list.
 */
export function computePortfolioMetrics<T extends MetricAsset = MetricAsset>(
  assets: T[],
  sellingIds: Set<string> = new Set(),
  soldRecords: Map<string, { saleValue: number; dropAvoided: number }> = new Map(),
): ComputedPortfolioMetrics<T> {
  let totalNetWorthCents = 0;
  let totalPurchaseBasisCents = 0;
  let atRiskTotalCents = 0;
  let dailyDecayCents = 0;
  let windowOpenCount = 0;
  let urgentCount = 0;
  let cliffCount = 0;

  const actionableAssets: T[] = [];
  const batchSellTargets: T[] = [];

  for (const asset of assets) {
    totalNetWorthCents += asset.currentValue;
    totalPurchaseBasisCents += asset.purchasePrice;
    atRiskTotalCents += asset.depreciationCliff.projectedDrop;

    const daysAway = asset.depreciationCliff.daysAway;
    const dropCents = asset.depreciationCliff.projectedDrop;
    const safeDays = Math.max(1, Math.abs(daysAway));

    // Amortized daily decay
    if (dropCents > 0) {
      dailyDecayCents += dropCents / safeDays;
    }

    const sw = computeSellWindow(daysAway, dropCents / 100);

    if (sw.urgency === "WINDOW") {
      windowOpenCount++;
    } else if (sw.urgency === "URGENT") {
      urgentCount++;
    } else if (sw.urgency === "CLIFF") {
      cliffCount++;
    }

    const isPendingOrSold =
      asset.status === "LIQUIDATE" ||
      asset.status === "IN_TRANSIT" ||
      sellingIds.has(asset.id) ||
      soldRecords.has(asset.id);

    if (!isPendingOrSold && (sw.urgency === "WINDOW" || sw.urgency === "URGENT")) {
      actionableAssets.push(asset);
      batchSellTargets.push(asset);
    }
  }

  const totalSavedDollars = Array.from(soldRecords.values()).reduce(
    (sum, r) => sum + r.dropAvoided,
    0,
  );

  return {
    totalNetWorthDollars: Math.round(totalNetWorthCents / 100),
    totalPurchaseBasisDollars: Math.round(totalPurchaseBasisCents / 100),
    totalSavedDollars,
    atRiskTotalDollars: Math.round(atRiskTotalCents / 100),
    dailyDecayRateDollars: Math.round((dailyDecayCents / 100) * 100) / 100,
    windowOpenCount,
    urgentCount,
    cliffCount,
    actionableAssets,
    batchSellTargets,
  };
}
