## 2024-07-05 - Intl.DateTimeFormat caching optimization
**Learning:** `toLocaleDateString` and initializing `Intl.DateTimeFormat` are slow and expensive operations. In data-heavy React apps (like mapping over a portfolio list), calling these in render loops or nested functions like `computeSellWindow` can cause measurable performance bottlenecks.
**Action:** When a date formatting function is used inside a loop or frequently called utility function, instantiate `Intl.DateTimeFormat` once outside the function scope and reuse its `.format()` method. This yielded a 38x performance improvement (628ms to 16ms for 4000 calls).

## 2025-02-12 - Recharts Performance Bottleneck
**Learning:** We discovered that rendering charts with `recharts` inside a component updating often due to slider movements (e.g. `sellOffsetDays`) causes massive jank and re-rendering lag. The data prop passed to the chart (`chartData`) was being rebuilt dynamically on every single render. Since Recharts uses `isEqual` or referential equality on data, creating a new array on every slider change triggers expensive re-rendering within Recharts internals.
**Action:** When working with Recharts in interactive components (like slider controls where state changes frequently), always memoize the data passed to the chart using `useMemo` with minimal dependencies (only the data that actually dictates chart shapes). E.g. wrap `buildExtendedChart` with `useMemo`. This stops chart jitter and massive lag during slider dragging.

- Use an allowlist when caching values from user inputs (like headers) to avoid unbounded memory cache growth (memory leak DoS vulnerabilities).
- Replaced synchronous `fs.readFileSync` and `fs.existsSync` inside an active Express/Node HTTP handler with `fs.readFile` and an in-memory `Map` cache. This reduced latency by ~45% and improved throughput from ~13k to ~23k req/sec on the target endpoint.
- For serving static assets in Node.js, replace `fs.readFileSync` with `fs.stat` (to check size/existence asynchronously) followed by piping `fs.createReadStream` to the response. This avoids loading the entire file into memory simultaneously.
