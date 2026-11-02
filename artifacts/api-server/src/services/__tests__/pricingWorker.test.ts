import { describe, it, expect } from "vitest";
import {
  fetchMarketSoldComps,
  calculateFairMarketValue,
  checkPriceAlertTriggers,
} from "../pricingWorker.js";

describe("Pricing Worker Service", () => {
  it("fetches category-appropriate secondary comps", () => {
    const watchComps = fetchMarketSoldComps("Submariner Date", "WATCH", 1000000);
    expect(watchComps.some((c) => c.source === "Chrono24")).toBe(true);

    const sneakerComps = fetchMarketSoldComps("Air Jordan 1", "SNEAKER", 25000);
    expect(sneakerComps.some((c) => c.source === "StockX")).toBe(true);

    const techComps = fetchMarketSoldComps("iPhone 15 Pro", "TECH", 85000);
    expect(techComps.some((c) => c.source === "Swappa")).toBe(true);
  });

  it("calculates fair market value bounded within guardrails", () => {
    const baseline = 100000; // $1,000.00
    const comps = [
      { source: "eBay" as const, soldPriceCents: 98000, condition: "Good", soldAt: new Date().toISOString() },
      { source: "Swappa" as const, soldPriceCents: 96000, condition: "Good", soldAt: new Date().toISOString() },
    ];

    const fmv = calculateFairMarketValue(baseline, comps);
    expect(fmv).toBe(97000); // Average of 98k and 96k
  });

  it("clamps extreme outliers to 15% maximum drift per cycle", () => {
    const baseline = 100000;
    const extremeComps = [
      { source: "eBay" as const, soldPriceCents: 50000, condition: "Parts", soldAt: new Date().toISOString() },
    ];

    const fmv = calculateFairMarketValue(baseline, extremeComps);
    expect(fmv).toBe(85000); // 85% clamp floor
  });

  it("correctly identifies fired price alert thresholds", () => {
    const targets = [90000, 80000, 70000]; // alerts set at $900, $800, $700
    const newPrice = 75000; // price dropped to $750

    const fired = checkPriceAlertTriggers(targets, newPrice);
    expect(fired).toBe(2); // $900 and $800 are <= current price
  });
});
