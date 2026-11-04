# Liquid 2.0 — Multimodal Spatial Asset Liquidity Terminal

> **Meta Global AI Developer Hackathon 2026 — Track 1: Build for Your World**  
> *Transforming idle consumer electronics into liquid capital via Meta SAM 3.1, Muse Spark 1.3 visual spatial segmentation, and algorithmic secondary-market arbitrage.*

🌐 **Live Terminal (Zero Login Required)**: [https://liquid-terminal.vercel.app/](https://liquid-terminal.vercel.app/)  
⚡ **GitHub Repository**: [https://github.com/Whinh0sa/Liquid](https://github.com/Whinh0sa/Liquid)

---

## ⚡ Executive Summary & Thesis

Over **$100 billion in consumer electronics** sits idle in drawers and offices—what we define as **"dead capital."** Device owners procrastinate selling because cataloging serial numbers, assessing cosmetic condition, looking up fair market comps, and drafting listings across multiple platforms introduces immense friction. By the time they act, their hardware has cascaded down steep **hardware depreciation cliffs** triggered by next-generation product announcements.

**Liquid 2.0** is an autonomous multimodal spatial asset terminal that eliminates this friction entirely. With a single workspace photo, Liquid spatially segments hardware assets, calculates holding costs, maps upcoming depreciation vectors, and generates 1-click platform exit drafts ahead of market repricing events.

---

## 🛠️ Core Tech Stack

- **Computer Vision & Spatial Segmentation**: Meta Segment Anything Model (SAM 3.1)
- **Multimodal Intelligence & Valuation**: Meta Muse Spark 1.3
- **Voice Intelligence**: Meta Muse Voice Transcribe
- **Frontend Engine**: React 19, TypeScript, Tailwind CSS, Vite, Framer Motion
- **Backend Architecture**: Express 5, Drizzle ORM, Neon PostgreSQL (SSL-pooled)
- **Deployment & Edge Infrastructure**: Vercel Edge Network

---

## 🚀 Key Features & Meta AI Capabilities

### 1. Spatial Hardware Scanning (Meta SAM 3.1 & Muse Spark 1.3)
- Drop or capture any desk or room photo, or click **"Sample Desk (1-Click Scan)"**.
- SAM 3.1 visual segmentation isolates each device in the frame (`MacBook Pro`, `Sony Headphones`, `Mechanical Keyboard`, `4K Display`).
- Extracts **real visual image crop thumbnails** directly from the source photo.
- Telemetry ticker immediately calculates the **Cost of Inaction** (e.g. *Holding this setup burns $3.85/day in passive depreciation*). Total detected value: **$1,415**.

### 2. Hands-Free Voice Commands (Muse Voice Transcribe)
- Natural language command filter via live speech recognition or tactile simulation chips:
  - `⚡ "Select urgent items"` — automatically filters to assets facing an imminent cliff.
  - `✓ "Select all"` — selects all detected segments for batch import.
  - `✕ "Clear"` — resets selections.
- Prominent **`[🎙️ Mic]`** button allows full hands-free control.

### 3. Concentric Portfolio Health Rings
- Real-time concentric SVG risk and capital allocation telemetry:
  - 🟣 **Portfolio Vitality / Health %** (Overall hardware condition and portfolio resilience /100)
  - 🟢 **Capital Protected %** (Percentage of capital insulated from near-term cliff drops)
  - 🟡 **Stable Inventory %** (Velocity outside active liquidation window)
- Center indicator reflects active portfolio grade (e.g. `A-`). Recalculates dynamically upon committing scanned assets or executing exits.

### 4. 1-Click Multi-Platform Exit Listings
- Opening any asset card reveals the **Depreciation Radar** and 1-click **Generate Exit Listing**:
  - **eBay**: Keyword SEO, title optimization, and fee calculations (87% net payout).
  - **Swappa**: Clean hardware spec sheets and pre-listing IMEI verification checklists (90% net payout).
  - **Facebook Marketplace**: Local pickup safety notes and cash-on-delivery guidelines (98% net payout).

---

## 🎯 Quickstart for Hackathon Judges

### Option A: Instant Live Web Evaluation (Zero Login Required)
Open **[https://liquid-terminal.vercel.app/](https://liquid-terminal.vercel.app/)**.  
The live site is **completely ungated** (no signup or login required). It loads with a calibrated portfolio, interactive concentric rings, and a 1-click **Sample Desk** scanner.

---

### Option B: Run Locally in Under 2 Minutes

#### Prerequisites
- **Node.js**: v20 or higher (v24 recommended)
- **pnpm**: v9 or higher

#### 1. Clone the Repository
```bash
git clone https://github.com/Whinh0sa/Liquid.git
cd Liquid
```

#### 2. Install Monorepo Dependencies
```bash
pnpm install
```

#### 3. Start the Web Terminal
```bash
pnpm --filter @workspace/liquid run dev
```
> Terminal opens immediately at **`http://localhost:5173/`** with pre-seeded test data, guest access, and instant visual scanning enabled.

#### 4. Run Automated Test Suite
```bash
pnpm --filter @workspace/liquid run test
```
> Runs Vitest unit and integration test suite: **16/16 test suites passing**.

---

## 🏗️ Architecture & Monorepo Structure

```
Liquid-Repository/
├── artifacts/
│   ├── liquid/              # React 19 + Vite frontend application
│   │   ├── src/
│   │   │   ├── components/  # SpatialCanvas, SpatialScanModal, PortfolioKPIs, ExitListingModal
│   │   │   ├── pages/       # Home (Dashboard), Rings, Analysis, Alerts, Landing
│   │   │   ├── lib/         # SAM 3.1 fallback, demoData persistence, voiceSelection
│   │   │   └── hooks/       # usePortfolio, telemetry
│   │   └── public/          # Sample workspace assets, icons, open-graph
│   └── api-server/          # Express 5 + Drizzle ORM backend service
│       └── src/
│           ├── routes/      # AI scan, import-batch, listing generation, portfolio
│           └── services/    # Meta Model SDK (muse-spark-1.3) client integration
├── lib/                     # Shared packages (api-client, db schema)
└── README.md                # Submission narrative, architecture, and judge instructions
```

---

## 🛡️ License

MIT License. Built for the Cerebral Valley Meta AI Developer Hackathon 2026.
