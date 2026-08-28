export const formatCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
export const formatCurrencyNoDecimals = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const formatNumber = new Intl.NumberFormat("en-US");
export const formatMonthShort = new Intl.DateTimeFormat("en-US", { month: "short" });
