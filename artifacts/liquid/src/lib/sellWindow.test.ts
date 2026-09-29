import { describe, it, expect } from "vitest";
import { computeSellWindow } from "./sellWindow";

describe("computeSellWindow", () => {
  it("returns PLANNED urgency when window opens in the future", () => {
    // daysAway = 15
    // LEAD_TIME = 2, IDEAL_BUFFER = 1, WINDOW_DURATION = 5
    // windowEnd = Math.max(0, 15 - 3) = 12
    // windowStart = Math.max(0, 12 - 5) = 7
    const result = computeSellWindow(15, 100);

    expect(result.urgency).toBe("PLANNED");
    expect(result.windowStartDay).toBe(7);
    expect(result.windowEndDay).toBe(12);
    expect(result.cliffDay).toBe(15);
    expect(result.isWindowOpen).toBe(false);
    expect(result.projectedLoss).toBe(100);
  });

  it("returns WINDOW urgency when we are inside the ideal listing window", () => {
    // daysAway = 5
    // windowEnd = Math.max(0, 5 - 3) = 2
    // windowStart = Math.max(0, 2 - 5) = 0
    const result = computeSellWindow(5, 100);

    expect(result.urgency).toBe("WINDOW");
    expect(result.windowStartDay).toBe(0);
    expect(result.windowEndDay).toBe(2);
    expect(result.cliffDay).toBe(5);
    expect(result.isWindowOpen).toBe(true);
  });

  it("returns WINDOW urgency when window is partially closed (Math.max prevents negative)", () => {
    // daysAway = 2
    // windowEnd = Math.max(0, 2 - 3) = 0
    // windowStart = Math.max(0, 0 - 5) = 0
    // isWindowOpen = 0 >= 0 && 0 <= 0 -> true
    const result = computeSellWindow(2, 100);

    expect(result.urgency).toBe("WINDOW");
    expect(result.windowStartDay).toBe(0);
    expect(result.windowEndDay).toBe(0);
    expect(result.cliffDay).toBe(2);
    expect(result.isWindowOpen).toBe(true);
  });

  it("returns CLIFF urgency when cliff day is today", () => {
    // daysAway = 0
    const result = computeSellWindow(0, 100);

    expect(result.urgency).toBe("CLIFF");
    expect(result.windowStartDay).toBe(0);
    expect(result.windowEndDay).toBe(0);
    expect(result.cliffDay).toBe(0);
    expect(result.isWindowOpen).toBe(true);
  });

  it("returns CLIFF urgency when cliff day has passed", () => {
    // daysAway = -5
    const result = computeSellWindow(-5, 100);

    expect(result.urgency).toBe("CLIFF");
    expect(result.windowStartDay).toBe(0);
    expect(result.windowEndDay).toBe(0);
    expect(result.cliffDay).toBe(-5);
    expect(result.isWindowOpen).toBe(true);
  });
});
