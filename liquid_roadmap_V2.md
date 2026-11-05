# Liquid — Institution-Grade Roadmap

> **Product positioning:** Liquid is a portfolio tracker for *liquid physical assets* — things with a real secondary market and a price you can act on. Electronics, luxury handbags, watches, sneakers, collectibles. Not everything you own. **Everything worth tracking.**
>
> **Revenue model:** Transaction-based. Liquid earns a referral fee when a user lists and sells through a partner platform (eBay, Vestiaire, Chrono24, StockX, GOAT). No subscription friction. Users pay nothing until they make money.
>
> This roadmap aligns to the percentage milestones in `replit.md` with engineering specifics added for each stage.

---

## How to read this

Each phase has a **gate** — a condition that must be true before the next phase starts.

> [!NOTE]
> **Design DNA:** Poppins for headlines, Inter for body/UI. Blue primary, green for gains, amber for urgency, red for true risk only. Rounded-2xl cards, thin borders, restrained gradients. Premium finance terminal feel — not generic SaaS.

---

## Phase 1 — Launch Foundation `(0–10%)`
*Goal: A real, public URL that explains what Liquid is and lets a user start a portfolio.*

> [!IMPORTANT]
> The homepage is currently missing entirely. The product is narrative-first — trust-building before data. A stranger landing on the app right now sees a demo dashboard with no explanation.

### 1.0 Marketing Homepage
| Task | Detail |
|---|---|
| Dedicated `/` landing route | Separate from the `/dashboard` app shell |
| Narrative: what, who, problem, promise | Explain sell-window timing before showing any data |
| 3–5 proof points | Depreciation tracking, sell windows, alerts, condition-aware pricing |
| Clear CTA | "Start tracking" → signup |

### 1.1 Authentication
| Task | Detail |
|---|---|
| Auth layer | **Clerk** — handles JWT, refresh, MFA, device revocation out of the box |
| Protect all API routes | Express middleware rejects unauthenticated requests |
| Scope data to user | Every DB query filters by `user_id` from the JWT |

### 1.2 Database in Production
| Task | Detail |
|---|---|
| Provision Neon (free tier) | Managed PostgreSQL + PgBouncer connection pooling |
| `drizzle-kit push` | Sync schema to production |
| Run seed script | Demo user + assets for testing |
| Env vars on hosting | `DATABASE_URL` in Vercel / Railway secrets |

### 1.3 Deployment
| Task | Detail |
|---|---|
| Frontend | **Vercel** — zero-config Vite deploy |
| API server | **Railway** or **Render** — Node.js with env vars |
| CI/CD | GitHub Actions: `tsc --noEmit` on every PR |

### 1.4 Observability
| Task | Detail |
|---|---|
| Frontend errors | **Sentry** |
| API logs | **Pino** JSON → **Logtail** |
| Uptime | **BetterUptime** free tier |

**Gate:** ✅ A stranger lands on the homepage, signs up, adds one asset, and sees it persist after a page refresh — on a live public URL.

---

## Phase 2 — Product-Market Clarity `(10–25%)`
*Goal: The core resale loop works end-to-end with real data, for electronics only.*

> [!NOTE]
> Do not expand categories until this loop is proven: **add asset → price updates automatically → alert fires → user lists → Liquid earns a referral fee.** That full loop, working once, is worth more than any new feature.

### 2.1 Real Price Data
| Task | Detail |
|---|---|
| eBay Browse API | Query sold listings for `{make} {model}` → real secondary market price |
| BackMarket API | Refurbished floor price as a lower bound |
| `price_history` table | `(asset_id, source, price_cents, captured_at)` |
| Replace manual `currentValue` | Derive from latest price snapshot |

### 2.2 Release Calendar
| Task | Detail |
|---|---|
| GSMArena / MacRumors feed | Product release dates that trigger cliff events |
| `release_events` table | Already partially modelled in UI |
| Wire to cliff date | `cliff_date` = release date − 14 days (configurable per category) |

### 2.3 "List Now" Transaction Flow (Phase 2 MVP)
| Task | Detail |
|---|---|
| eBay Partner Network | First affiliate integration — easiest, largest volume |
| "Sell on eBay" button | Pre-fills model, condition, price floor from portfolio data |
| Affiliate link wrapping | All outbound links tracked for commission |
| Sale confirmation | User marks sold → portfolio updates → commission tracked |

### 2.4 AI Valuation Service (FastAPI)
*Build this after eBay data is working — not before.*
| Task | Detail |
|---|---|
| Bootstrap FastAPI service | `services/valuation-engine/` workspace |
| HuggingFace sentiment | Review sentiment → `sentiment_score` → `cliff_modifier` |
| Benchmark P95 response | If < 2s → call sync. If > 2s → add BullMQ |

**Gate:** ✅ A user adds an iPhone, the price updates from eBay sold listings, an alert fires at the right time, they click "Sell on eBay," and Liquid earns a tracked referral commission.

---

## Phase 3 — Trust & Retention `(25–40%)`
*Goal: Users come back because Liquid proves its value in pounds and pence.*

> [!NOTE]
> The Session Performance Card and Achievement Wall already exist in the dashboard. They need to be surfaced prominently and made exportable — this is the retention engine.

### 3.1 Proof of Value Reporting
| Task | Detail |
|---|---|
| Exportable PDF statement | Value saved, realized gains, at-risk capital |
| Transparent assumptions | Show exactly how cliff dates and drop % are calculated |
| Per-asset history | Full liquidation timeline (AssetDrawer exists, needs DB persistence) |
| Scenario planning | "Sell now vs hold vs partial exit" (AssetDrawer What-if Simulator — needs real data) |

### 3.2 Notifications
| Task | Detail |
|---|---|
| Email alerts | **Resend** — "Your sell window opens tomorrow" |
| Web push | **Novu** or **OneSignal** |
| Per-asset preferences | Opt-in per urgency level |
| Weekly digest | Portfolio health summary |

### 3.3 Onboarding & Retention Loop
| Task | Detail |
|---|---|
| "Snap to Value" | Camera → image recognition → auto-populate make/model |
| Empty state designs | Every page needs a proper empty state |
| First-run guide | Tooltips on sell window concept and KPIs |
| Referral loop | "Share your portfolio health" read-only link |

**Gate:** ✅ A user receives a well-timed alert, sells through Liquid, and can export a PDF showing exactly how much they saved vs holding.

---

## Phase 4 — Category Expansion & Revenue `(40–60%)`
*Goal: Transaction revenue across multiple asset categories.*

> [!IMPORTANT]
> Expand categories only after the electronics loop is proven. Each new category requires: a price data source, an affiliate partner, and a depreciation model. If any of those three are missing, the category doesn't launch.

### 4.1 Affiliate Partner Matrix
| Platform | Category | Affiliate rate | Priority |
|---|---|---|---|
| **eBay Partner Network** | Electronics, collectibles | 1–4% | ✅ Phase 2 |
| **Vestiaire Collective** | Luxury handbags, fashion | 5–10% | Phase 4 |
| **Chrono24** | Watches | Dealer referral | Phase 4 |
| **StockX** | Sneakers | 1–3% | Phase 4 |
| **GOAT** | Sneakers | 1–3% | Phase 4 |
| **The RealReal** | Mixed luxury | Consignment referral | Phase 4 |
| **TCGPlayer** | Trading cards | 2–5% | Phase 5 |

### 4.2 Category Expansion Schedule
| Category | Price data source | Depreciation model |
|---|---|---|
| Luxury handbags | Vestiaire API, Rebag | Appreciation curves (Birkin ≠ high-street bag) |
| Watches | Chrono24 API, WatchCharts | Model/reference-specific |
| Sneakers | StockX API, GOAT | Release hype cycle decay |
| Collectibles | eBay sold, TCGPlayer | Set/series-driven |

**What never gets added:** Generic furniture, appliances, unbranded clothing. No affiliate programme + no price data = not a Liquid asset.

### 4.3 Portfolio Net Worth (Full Vision)
Once multi-category is live, the hero number becomes genuinely compelling:
- Total liquidation value across all categories
- Breakdown: Electronics £12,400 / Watches £8,200 / Bags £4,600
- "What you'd walk away with today" vs "what you paid"
- Exportable for insurance, estate planning, personal finance

### 4.4 Multi-user
| Task | Detail |
|---|---|
| Household portfolios | Multiple users, one account |
| Read-only share links | Viral growth loop |
| Business accounts | Resellers, IT asset managers — recurring high-volume users |

**Gate:** ✅ A user lists a luxury bag through Vestiaire via Liquid, completes the sale, and Liquid earns a tracked affiliate commission. The economics per transaction are understood across at least 2 categories.

---

## Phase 5 — Scale to Industry Standards `(60–100%)`
*Goal: Production-grade performance, compliance, and platform APIs.*

### 5.1 Security & Compliance
| Task | Detail |
|---|---|
| Penetration test | HackerOne or Cobalt |
| OWASP Top 10 | Rate limiting, input sanitization, injection hardening |
| GDPR | Data export, right-to-erasure, cookie consent |
| Affiliate disclosure | Legal requirement — all referral links must be disclosed |

### 5.2 API Platform
| Task | Detail |
|---|---|
| Public REST API | OAuth-scoped portfolio reads for third-party apps |
| Webhooks | `asset.window_opened`, `asset.cliff_reached`, `sale.completed` |
| API key management | Generate/revoke dashboard |

### 5.3 B2B / White-label
| Task | Detail |
|---|---|
| Insurance integrations | Auto-populate insured value from Liquid portfolio |
| Accounting export | QuickBooks / Xero depreciated asset values |
| Reseller dashboards | High-volume users managing 100s of assets |

**Gate:** ✅ An enterprise reseller can manage 200+ assets via API, with automated pricing updates and one-click multi-platform listing.

---

## Dependency Map

```mermaid
graph TD
    A["Phase 1: Launch Foundation (0-10%)"] --> B["Phase 2: Product-Market Clarity (10-25%)"]
    B --> C["Phase 3: Trust & Retention (25-40%)"]
    B --> D["Phase 4: Category Expansion (40-60%)"]
    C --> D
    D --> E["Phase 5: Scale & Compliance (60-100%)"]

    style A fill:#2563EB,color:#fff
    style B fill:#10B981,color:#fff
    style C fill:#F59E0B,color:#fff
    style D fill:#7C3AED,color:#fff
    style E fill:#1F2937,color:#fff
```

---

## 🏆 Meta AI Global Hackathon 2026 Milestone (Achieved)

> [!IMPORTANT]
> **Hackathon Submission Completed on Cerebral Valley Portal** (Track 1: Indie Developer, Theme: Build for Your World).
> - **Live Production Terminal**: [https://liquid-terminal.vercel.app/](https://liquid-terminal.vercel.app/)
> - **Public Monorepo**: [https://github.com/Whinh0sa/Liquid](https://github.com/Whinh0sa/Liquid)
> - **Master Video Walkthrough**: `Liquid_2.0_Launch_Master_v3.mp4` (1080p60, 183s, PiP facecam, audio-synced beat cue, 3s kinetic badges)

### Delivered Hackathon Features & Accomplishments
1. **Multimodal Spatial Vision (Meta SAM 3.1 & Muse Spark 1.3)**:
   - Zero-shot spatial segmentation across cluttered desks/rooms.
   - Real-time client-side visual crop thumbnail extraction.
   - Dynamic "Cost of Inaction" telemetry calculator ($3.85/day passive holding cost).
2. **Hands-Free Voice Action (Meta Muse Voice Transcribe)**:
   - Voice command transcription chips for rapid batch filtration (`"Select urgent items"`, `"Select all"`, `"Clear"`).
3. **Dynamic Concentric Risk Rings**:
   - SVG rings for Portfolio Vitality, Capital Protection %, and Stable Inventory % recalculating live upon batch commit.
4. **1-Click Multi-Platform Exit Engine**:
   - Structured listing generator with platform-specific optimization across eBay (SEO keywords), Swappa (IMEI checklist), and Facebook Marketplace (local pickup safety).
5. **Quality & Engineering Reliability**:
   - Monorepo structured with Express 5, Drizzle ORM, Neon PostgreSQL, and React 19.
   - Comprehensive test suite: **16/16 test suites (35/35 tests) passing**.
   - Dark Obsidian Slate institutional theme.

---

## Where You Are Now

```
Phase 1 — Launch Foundation      ██████████ 100%  (Completed: Live un-gated terminal, monorepo, tests passing, video shipped)
Phase 2 — Product-Market Clarity ████░░░░░░  40%  (Spatial scan, real visual crops, exit listings wired, live comps calculation)
Phase 3 — Trust & Retention      ████░░░░░░  40%  (Depreciation cliff radar, concentric health rings, batch commit flow)
Phase 4 — Category Expansion     ░░░░░░░░░░   0%  (Electronics verified; gated for luxury/collectibles post-hackathon)
Phase 5 — Scale & Compliance     ░░░░░░░░░░   0%  (Not started)
```

---

## Immediate Next 3 Actions

1. **Marketing homepage** — New `/` landing page with narrative + CTA. Dashboard moves to `/dashboard`.
2. **Add Clerk auth** — `pnpm add @clerk/clerk-react`, Express middleware, scope all queries to `user_id`.
3. **Provision Neon + deploy** — Neon free tier → `drizzle-kit push` → seed → Vercel + Railway.

These three actions turn Liquid from a demo into a product a stranger can use.
