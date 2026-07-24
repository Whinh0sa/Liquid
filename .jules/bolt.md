## 2024-07-05 - Intl.DateTimeFormat caching optimization
**Learning:** `toLocaleDateString` and initializing `Intl.DateTimeFormat` are slow and expensive operations. In data-heavy React apps (like mapping over a portfolio list), calling these in render loops or nested functions like `computeSellWindow` can cause measurable performance bottlenecks.
**Action:** When a date formatting function is used inside a loop or frequently called utility function, instantiate `Intl.DateTimeFormat` once outside the function scope and reuse its `.format()` method. This yielded a 38x performance improvement (628ms to 16ms for 4000 calls).

## 2025-02-12 - Recharts Performance Bottleneck
**Learning:** We discovered that rendering charts with `recharts` inside a component updating often due to slider movements (e.g. `sellOffsetDays`) causes massive jank and re-rendering lag. The data prop passed to the chart (`chartData`) was being rebuilt dynamically on every single render. Since Recharts uses `isEqual` or referential equality on data, creating a new array on every slider change triggers expensive re-rendering within Recharts internals.
**Action:** When working with Recharts in interactive components (like slider controls where state changes frequently), always memoize the data passed to the chart using `useMemo` with minimal dependencies (only the data that actually dictates chart shapes). E.g. wrap `buildExtendedChart` with `useMemo`. This stops chart jitter and massive lag during slider dragging.


## 2024-07-06 - Intl.NumberFormat and Intl.DateTimeFormat caching optimization
**Learning:** Initializing `Intl.NumberFormat` and `Intl.DateTimeFormat` within render loops creates significant performance overhead, especially in grids or charts with hundreds of formatted data points. Furthermore, using `"default"` as the locale in `Intl.DateTimeFormat` (like `new Intl.DateTimeFormat("default", ...)`) is an invalid BCP-47 tag and will crash Safari immediately on load.
**Action:** Always cache these formatters globally or at the module level. Use `undefined` instead of `"default"` to safely fallback to the system locale across all browsers. When replacing string conversions in untyped components (like Recharts tooltips), guard the `Number()` conversion to avoid rendering `"NaN"`.
