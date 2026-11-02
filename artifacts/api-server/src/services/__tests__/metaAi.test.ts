import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analyzePhysicalAssets, generateExitListing } from "../metaAi.js";

describe("metaAi mock fallback (no META_MODEL_API_KEY)", () => {
  const originalKey = process.env.META_MODEL_API_KEY;

  beforeEach(() => {
    delete process.env.META_MODEL_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.META_MODEL_API_KEY;
    else process.env.META_MODEL_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns the 4 DIR-002 mock assets with source mock", async () => {
    const { analysis, source } = await analyzePhysicalAssets("ZmFrZQ==", "image/jpeg");

    expect(source).toBe("mock");
    expect(analysis.detectedAssets).toHaveLength(4);
    expect(analysis.detectedAssets.map((a) => a.name)).toEqual([
      "MacBook Pro 14 M1 Pro",
      "Sony WH-1000XM4",
      "Keychron Q1 Pro",
      "LG 27UK850 4K Monitor",
    ]);
    expect(analysis.portfolioSummary.totalDetectedValue).toBe(1415);
    expect(analysis.portfolioSummary.immediateActionCount).toBe(2);
  });

  it("exposes integer cents alongside dollars", async () => {
    const { analysis } = await analyzePhysicalAssets("ZmFrZQ==");
    const macbook = analysis.detectedAssets[0];
    expect(macbook.estimatedValueDollars).toBe(920);
    expect(macbook.estimatedValueCents).toBe(92000);
    expect(macbook.estimatedValue).toBe(920);
    expect(macbook.depreciationCliffDays).toBe(21);
    expect(macbook.urgency).toBe("High");
  });

  it("generates a deterministic mock listing with platform payouts", async () => {
    const { listing, source } = await generateExitListing({
      name: "Apple MacBook Pro 14 M1 Pro",
      category: "TECH",
      condition: "Good",
      estimatedValueDollars: 920,
    });

    expect(source).toBe("mock");
    expect(listing.title).toContain("Apple MacBook Pro 14 M1 Pro");
    expect(listing.platformRecommendations.map((p) => p.platform)).toEqual([
      "eBay",
      "Swappa",
      "Marketplace",
    ]);
    expect(listing.platformRecommendations[0].suggestedPrice).toBe(920);
    expect(listing.platformRecommendations[0].netPayout).toBe(800.4);
    expect(listing.bulletPoints.length).toBeGreaterThan(0);
  });

  it("omits Swappa for non-TECH listings", async () => {
    const { listing } = await generateExitListing({
      name: "Designer Handbag",
      category: "FASHION",
      condition: "Like New",
      estimatedValueDollars: 450,
    });

    expect(listing.platformRecommendations.map((p) => p.platform)).toEqual([
      "eBay",
      "Marketplace",
    ]);
  });
});
