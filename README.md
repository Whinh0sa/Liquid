# Liquid

Liquid is a consumer finance dashboard for physical asset resale. It helps you track depreciation cliffs, identify optimal sell windows, and act before value drops.

## Highlights

- Portfolio overview with net worth, risk, and health score
- Sell-window intelligence with urgency tiers
- Portfolio heatmap and opportunity radar
- What-if simulator for future sell dates
- Batch liquidation for urgent assets
- Upcoming release events feed
- Session performance stats and achievement wall

## Tech Stack

- React + Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- TanStack Query
- Express API
- OpenAPI-generated client hooks

## Getting Started

```bash
pnpm install
pnpm --filter @workspace/liquid run dev
```

## Scripts

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/liquid run dev
pnpm --filter @workspace/api-server run dev
```

## Project Structure

- `artifacts/liquid` — main web app
- `artifacts/api-server` — API server
- `lib` — shared libraries
- `scripts` — repo utilities

## License

MIT
