// ⚡ Bolt: Cache Intl.NumberFormat to avoid expensive repeated instantiations
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatCurrency(n: number) {
  return currencyFormatter.format(n);
}

// ⚡ Bolt: Cache Intl.NumberFormat to avoid expensive repeated instantiations
const currencyWholeFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyWhole(n: number) {
  return currencyWholeFormatter.format(n);
}
