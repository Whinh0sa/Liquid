1. **Goal:** Refactor the long `AssetDrawer` function in `artifacts/liquid/src/components/AssetDrawer.tsx` to improve readability and maintainability.
2. **Current state:** `AssetDrawer` spans from line 77 to 522 (445 lines). It inline-renders several complex sections like the `BestTimeToSell`, `DepreciationWarning`, `PriceTrajectoryChart`, and `StatsGrid`.
3. **Approach:**
    - Extract `BestTimeToSell` to its own component `BestTimeToSellRecommendation`.
    - Extract `DepreciationWarning` to its own component `DepreciationWarningBanner`.
    - Extract `PriceTrajectoryChart` to its own component `PriceTrajectoryChart`.
    - Extract `StatsGrid` to its own component `StatsGrid`.
    - Extract the formatter `fmt` outside the render loop using `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` to fix a performance bottleneck mentioned in memory.
4. **Pre-commit step:** Run `pre_commit_instructions` and follow its instructions to ensure proper testing, verification, review, and reflection are done before submitting.
