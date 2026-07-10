## 2024-07-05 - Intl.DateTimeFormat caching optimization
**Learning:** `toLocaleDateString` and initializing `Intl.DateTimeFormat` are slow and expensive operations. In data-heavy React apps (like mapping over a portfolio list), calling these in render loops or nested functions like `computeSellWindow` can cause measurable performance bottlenecks.
**Action:** When a date formatting function is used inside a loop or frequently called utility function, instantiate `Intl.DateTimeFormat` once outside the function scope and reuse its `.format()` method. This yielded a 38x performance improvement (628ms to 16ms for 4000 calls).

## 2025-02-12 - Recharts Performance Bottleneck
**Learning:** We discovered that rendering charts with `recharts` inside a component updating often due to slider movements (e.g. `sellOffsetDays`) causes massive jank and re-rendering lag. The data prop passed to the chart (`chartData`) was being rebuilt dynamically on every single render. Since Recharts uses `isEqual` or referential equality on data, creating a new array on every slider change triggers expensive re-rendering within Recharts internals.
**Action:** When working with Recharts in interactive components (like slider controls where state changes frequently), always memoize the data passed to the chart using `useMemo` with minimal dependencies (only the data that actually dictates chart shapes). E.g. wrap `buildExtendedChart` with `useMemo`. This stops chart jitter and massive lag during slider dragging.


## 2025-02-12 - Intl.NumberFormat caching optimization
**Learning:** We discovered that calling `Number.prototype.toLocaleString` with formatting options (like `{ style: "currency", currency: "USD" }`) is extremely slow and expensive in render loops. A benchmark showed that creating a new `Intl.NumberFormat` internally on each call takes ~800ms for 10000 calls, whereas caching `Intl.NumberFormat` and calling `.format()` takes less than 10ms (an 80x performance improvement).
**Action:** Always instantiate `Intl.NumberFormat` once outside of function scopes or render loops and reuse its `.format()` method, instead of using `toLocaleString` inline for repeated formatting.
