import { describe, it, expect } from 'vitest';
import { buildExtendedChart } from './sellWindow';

describe('buildExtendedChart', () => {
  it('should return correct format and labels for a standard future window', () => {
    // 100000 cents = $1000, 20000 cents = $200, 30 days away
    // windowEnd = Math.max(0, 30 - 2 - 1) = 27
    // windowStart = Math.max(0, 27 - 5) = 22
    const result = buildExtendedChart(100000, 20000, 30);

    // Check labels
    expect(result.windowStartLabel).toBe('+22d');
    expect(result.windowEndLabel).toBe('+27d ★');
    expect(result.cliffLabel).toBe('+30d cliff');

    // Check basic data structure
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(4);

    // Check historical points
    const historicalPoints = result.data.filter(p => !p.projected);
    expect(historicalPoints.length).toBe(4);
    expect(historicalPoints[0].label).toBe('Last Month');
    expect(historicalPoints[1].label).toBe('2 Wks Ago');
    expect(historicalPoints[2].label).toBe('Last Week');
    expect(historicalPoints[3].label).toBe('Today');

    // Current price is $1000 (100000 / 100)
    expect(historicalPoints[3].price).toBe(1000);
  });

  it('should handle urgent/passed window case where daysAway is short', () => {
    // 50000 cents = $500, 10000 cents = $100, 2 days away
    // windowEnd = Math.max(0, 2 - 2 - 1) = 0
    // windowStart = Math.max(0, 0 - 5) = 0
    const result = buildExtendedChart(50000, 10000, 2);

    // Labels should be null or specific format if conditions are not met
    expect(result.windowStartLabel).toBeNull();
    expect(result.windowEndLabel).toBeNull(); // windowEnd is 0, so windowEndDay > 0 is false
    expect(result.cliffLabel).toBe('+2d cliff');

    // Data should still be populated
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(4);
  });

  it('should handle at-cliff case where daysAway is 0', () => {
    // 50000 cents = $500, 10000 cents = $100, 0 days away
    // windowEnd = Math.max(0, 0 - 2 - 1) = 0
    // windowStart = Math.max(0, 0 - 5) = 0
    const result = buildExtendedChart(50000, 10000, 0);

    expect(result.windowStartLabel).toBeNull();
    expect(result.windowEndLabel).toBeNull();
    expect(result.cliffLabel).toBe('+0d cliff');

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(4);
  });

  it('should map historical and projected points properly in the data array', () => {
    const result = buildExtendedChart(100000, 20000, 30);

    // Data array should combine historical and projected points
    const historical = result.data.filter(p => p.projected === false);
    const projected = result.data.filter(p => p.projected === true);

    expect(historical.length).toBe(4);
    expect(projected.length).toBeGreaterThan(0);
    expect(result.data.length).toBe(historical.length + projected.length);
  });
});
