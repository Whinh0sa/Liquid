import { describe, it, expect } from "vitest";
import { computePortfolioHealth } from "./portfolioHealth";

describe("portfolioHealth", () => {
  it("returns grade A (score 100) for empty portfolio", () => {
    const health = computePortfolioHealth([]);
    expect(health.grade).toBe("A");
    expect(health.score).toBe(100);
    expect(health.label).toBe("Excellent");
  });

  it("penalizes CLIFF and URGENT items heavily", () => {
    const atRiskPortfolio = [
      { depreciationCliff: { daysAway: 0, projectedDrop: 20000 } }, // CLIFF (-28)
      { depreciationCliff: { daysAway: 1, projectedDrop: 15000 } }, // URGENT (-18)
    ];

    const health = computePortfolioHealth(atRiskPortfolio);
    // 100 - 28 - 18 = 54 -> Grade D
    expect(health.score).toBe(54);
    expect(health.grade).toBe("D");
    expect(health.label).toBe("At risk");
  });

  it("rewards safe PLANNED holding items", () => {
    const safePortfolio = [
      { depreciationCliff: { daysAway: 120, projectedDrop: 5000 } }, // PLANNED (+3)
      { depreciationCliff: { daysAway: 90, projectedDrop: 4000 } },  // PLANNED (+3)
    ];

    const health = computePortfolioHealth(safePortfolio);
    expect(health.score).toBe(100); // clamped at 100
    expect(health.grade).toBe("A");
  });
});
