/**
 * ⚡ Bolt Performance Optimization:
 * Caching Intl.NumberFormat instances instead of calling .toLocaleString() or
 * creating new formatters on every render. This prevents significant performance
 * bottlenecks in data-heavy React loops and interactive components.
 */
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const currencyFormatterNoDecimals = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const currencyFormatterTwoDecimals = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (n: number) => currencyFormatter.format(n);
export const formatCurrencyNoDecimals = (n: number) =>
  currencyFormatterNoDecimals.format(n);
export const formatCurrencyTwoDecimals = (n: number) =>
  currencyFormatterTwoDecimals.format(n);
