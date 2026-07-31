/**
 * ⚡ Bolt Performance Optimization:
 * Caching Intl.NumberFormat instances instead of calling .toLocaleString() or
 * creating new formatters on every render. This prevents significant performance
 * bottlenecks in data-heavy React loops and interactive components.
 */
export const currencyFormatterNoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCurrencyNoDecimals = (n: number) => currencyFormatterNoDecimals.format(n);
