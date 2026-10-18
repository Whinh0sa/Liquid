// ⚡ Bolt: Cache Intl.NumberFormat to avoid expensive repeated instantiations
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatCurrency(n: number) {
  return currencyFormatter.format(n);
}
