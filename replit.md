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

## Liquid — Design DNA

### Product feel
- Premium, calm, consumer-finance shell
- Light background, white cards, soft gray borders, subtle shadows
- Blue as primary action color; green for gains/success; amber/orange for urgency; red only for true risk
- Dense but readable: dashboard should feel information-rich without looking busy
- Preserve the polished “Redesign consumer interface…” look on the home dashboard

### Layout rules
- Keep the dashboard as the stable home shell
- Add new capabilities on dedicated route pages when possible (`/analysis`, `/rings`, `/alerts`)
- Prefer short, card-based sections over long scrolling monoliths
- Use three-column grids for quick command-center summaries when screen size allows
- Keep major actions visible near the top-right or as floating pills when urgency matters

### Visual language
- Rounded-2xl cards, thin borders, restrained gradients
- Large hero number with supporting micro-metrics below it
- Ticker strip / market tape at the top when useful
- Use icon + label summaries instead of heavy text blocks
- Keep typography bold for headings, medium for supporting labels, small caps for metadata
- Use motion sparingly: quick fades, lift-on-hover, soft spring modals

### Interaction rules
- Make sell/alert actions explicit and easy to find
- Show urgency states in badges and banners, not just color alone
- Maintain optimistic UI for selling and status changes
- Favor drawer/detail views for deep context instead of overloading the dashboard

### Reuse guidance for future AI
- Reuse `home.tsx` as the canonical dashboard shell
- Put new feature work on separate routes or isolated components
- Match existing spacing, radius, and button shapes before inventing new ones
- If adding charts, keep them compact and card-contained
- When in doubt, make it feel like a premium finance terminal, not a generic SaaS app

## Liquid — Future Plans

### Likely next additions
- Per-asset history and liquidation timeline
- Saved watchlists and custom alert rules
- Better market event forecasting and release-calendar views
- More explicit scenario planning: sell now vs hold vs partial exit
- Export/shareable reports for portfolio health and liquidation decisions
- A lightweight onboarding flow for new assets and condition grading

### UI expansion directions
- More route-based views instead of a single oversized dashboard
- Comparison pages for platforms, margins, and resale channels
- A dedicated alerts center with filtering and severity grouping
- A richer analytics page for risk, decay, and seasonality trends

### Guardrails
- Don’t flatten the UI into plain tables
- Don’t replace cards with generic admin panels
- Don’t move new experiments into the home dashboard unless they are core to the main experience
- Keep the existing premium look consistent across all additions

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
