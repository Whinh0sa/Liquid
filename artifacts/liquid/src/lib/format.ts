const currencyFormatter2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const currencyFormatter0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const defaultFormatter = new Intl.NumberFormat("en-US");

export function formatCurrency(n: number, fractionDigits: 0 | 2 = 2): string {
  if (fractionDigits === 0) {
    return currencyFormatter0.format(n);
  }
  return currencyFormatter2.format(n);
}

export function formatNumber(n: number): string {
  return defaultFormatter.format(n);
}
