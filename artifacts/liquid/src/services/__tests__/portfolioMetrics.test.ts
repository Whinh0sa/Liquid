import { describe, it, expect } from "vitest";
import { computePortfolioMetrics, type MetricAsset } from "../portfolioMetrics";

describe("portfolioMetrics service", () => {
  it("computes accurate aggregates for an empty portfolio", () => {
    const result = computePortfolioMetrics([]);
    expect(result.totalNetWorthDollars).toBe(0);
    expect(result.windowOpenCount).toBe(0);
    expect(result.urgentCount).toBe(0);
    expect(result.cliffCount).toBe(0);
    expect(result.atRiskTotalDollars).toBe(0);
    expect(result.dailyDecayRateDollars).toBe(0);
    expect(result.batchSellTargets.length).toBe(0);
  });

  it("calculates net worth and categorizes urgency tiers correctly", () => {
    const mockAssets: MetricAsset[] = [
      {
        id: "1",
        currentValue: 100000, // $1000
        purchasePrice: 120000,
        depreciationCliff: { daysAway: 10, projectedDrop: 20000, reason: "Keynote" }, // WINDOW
        status: "HOLD",
      },
      {
        id: "2",
        currentValue: 50000, // $500
        purchasePrice: 60000,
        depreciationCliff: { daysAway: 2, projectedDrop: 10000, reason: "Imminent Refresh" }, // URGENT
        status: "HOLD",
      },
      {
        id: "3",
        currentValue: 30000, // $300
        purchasePrice: 40000,
        depreciationCliff: { daysAway: 45, projectedDrop: 5000, reason: "Next Year" }, // PLANNED
        status: "HOLD",
      },
    ];

    const result = computePortfolioMetrics(mockAssets);

    expect(result.totalNetWorthDollars).toBe(1800); // 1000 + 500 + 300
    expect(result.atRiskTotalDollars).toBe(350); // 200 + 100 + 50
    expect(result.windowOpenCount).toBe(1);
    expect(result.urgentCount).toBe(1);
    expect(result.batchSellTargets.length).toBe(2); // items 1 and 2
  });

  it("excludes already liquidated or in-transit items from batch sell targets", () => {
    const mockAssets: MetricAsset[] = [
      {
        id: "1",
        currentValue: 100000,
        purchasePrice: 120000,
        depreciationCliff: { daysAway: 10, projectedDrop: 20000 },
        status: "LIQUIDATE",
      },
      {
        id: "2",
        currentValue: 50000,
        purchasePrice: 60000,
        depreciationCliff: { daysAway: 2, projectedDrop: 10000 },
        status: "HOLD",
      },
    ];

    const result = computePortfolioMetrics(mockAssets);
    expect(result.batchSellTargets.length).toBe(1);
    expect(result.batchSellTargets[0].id).toBe("2");
  });
});
