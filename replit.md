# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Liquid — Feature Map

### Dashboard (`artifacts/liquid/src/pages/home.tsx`)
- Hero card: total portfolio value, health score (A/B/C/D), daily decay rate, at-risk $
- Alert banners: sell-window open / price floor triggered
- Command Center: Portfolio Heatmap · Opportunity Radar · Sell Timeline
- Smart Moves + Cost of Holding (2-col grid)
- **Portfolio Rings** — SVG concentric rings (Health Score, Capital Protected %, Sell Efficiency %)
- Release Cycle Events feed (severity-tiered product launches)
- Asset grid: urgency cards with inline sell actions
- Session Performance Card + Achievement Wall (6 trophies)
- Floating "Sell All Urgent" pill + Batch Liquidation Modal

### Asset Drawer (`artifacts/liquid/src/components/AssetDrawer.tsx`)
- Best Time to Sell: timeline bar + urgency badge
- Depreciation Warning + Price Trajectory (Recharts)
- Stats Grid (4 tiles: hold time, depreciation, loss, demand)
- Scenario Comparison (sell now vs wait)
- What-if Simulator (slider → simulated future value)
- **Condition Grader** — 4-tier (Mint/Good/Fair/Poor), live multiplier on all estimates
- Where to Sell: platform net-price table (condition-adjusted)
- Market Demand: demand score + trend
- Sell button (shows condition-adjusted price)

### API (`artifacts/api-server/src/routes/portfolio.ts`)
- GET /api/portfolio — Digital Twin portfolio (5 assets)
- PATCH /api/portfolio/:id — update asset status (HOLD/LIQUIDATE/IN_TRANSIT/SOLD)
