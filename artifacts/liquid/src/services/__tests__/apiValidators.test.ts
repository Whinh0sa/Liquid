import { describe, it, expect, vi } from "vitest";
import { validatePortfolioResponse } from "../apiValidators";

describe("apiValidators", () => {
  it("validates a compliant portfolio response", () => {
    const validData = {
      portfolio: [
        {
          id: "asset-1",
          category: "TECH",
          model: "MacBook Pro",
          purchasePrice: 200000,
          currentValue: 180000,
          depreciationCliff: {
            daysAway: 30,
            projectedDrop: 30000,
            reason: "M4 Announcement",
          },
          status: "HOLD" as const,
        },
      ],
      metrics: {
        totalNetWorth: 1800,
        capitalAtRisk: 0,
      },
    };

    const validated = validatePortfolioResponse<typeof validData>(validData);
    expect(validated.portfolio.length).toBe(1);
    expect(validated.portfolio[0].model).toBe("MacBook Pro");
  });

  it("warns and falls back gracefully on schema discrepancy without crashing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidData = {
      portfolio: "not-an-array",
    };

    const result = validatePortfolioResponse(invalidData);
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe(invalidData);
    warnSpy.mockRestore();
  });
});
