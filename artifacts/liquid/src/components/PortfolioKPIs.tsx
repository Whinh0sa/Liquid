// ─── PortfolioKPIs — Executive Command Strip ──────────────────────────────────
//
// Displays the top executive portfolio metrics in a high-density, professional strip:
//   • Total Tracked Valuation
//   • Capital at Immediate Risk (cliff drops)
//   • Holding Cost (Daily Depreciation Burn)
//   • Liquidity Health Grade & Score
//
// High-craft, streamlined styling aligned with Liquid Design System.

import { ArrowUpRight, TrendingDown, Clock, ShieldCheck, Zap, Activity } from "lucide-react";
import { formatCurrency as fmt } from "@/lib/currency";

export interface PortfolioKPIsProps {
  isLoading: boolean;
  displayedNetWorth: number;
  itemCount: number;
  windowOpenCount: number;
  urgentCount: number;
  atRiskTotal?: number;
  dailyDecay?: number;
  healthScore?: { score: number; grade: string; label: string; color: string };
  onScanClick?: () => void;
  onBatchSellClick?: () => void;
  batchSellCount?: number;
  hasMetrics?: boolean;
}

export default function PortfolioKPIs({
  isLoading,
  displayedNetWorth,
  itemCount,
  windowOpenCount,
  urgentCount,
  atRiskTotal = 0,
  dailyDecay = 0,
  healthScore = { score: 85, grade: "A", label: "Optimal", color: "#10B981" },
  onScanClick,
  onBatchSellClick,
  batchSellCount = 0,
}: PortfolioKPIsProps) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6 transition-all">
      {/* ── Top Header Row ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Asset Portfolio Valuation
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Live Resale Index
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            {isLoading ? (
              <div className="h-10 w-48 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <h1 className="font-poppins font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {fmt(displayedNetWorth)}
              </h1>
            )}

            {!isLoading && itemCount > 0 && (
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                across {itemCount} tracked physical {itemCount === 1 ? "asset" : "assets"}
              </span>
            )}
          </div>
        </div>

        {/* ── Action Buttons ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {batchSellCount > 0 && onBatchSellClick && (
            <button
              type="button"
              onClick={onBatchSellClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Batch Exit ({batchSellCount})
            </button>
          )}

          {onScanClick && (
            <button
              type="button"
              onClick={onScanClick}
              data-testid="btn-spatial-scan"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-95 hover:-translate-y-0.5 flex items-center gap-1.5"
              style={{ backgroundColor: "#7C3AED", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}
            >
              <Zap className="w-3.5 h-3.5" />
              Spatial Scan
            </button>
          )}
        </div>
      </div>

      {/* ── 4-Metric High-Density Command Grid ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        {/* Metric 1: Tracked Items & Windows */}
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Inventory
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-slate-900 font-poppins">{itemCount}</span>
            <span className="text-xs text-slate-500 font-medium">assets</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {windowOpenCount} in peak sell window
          </span>
        </div>

        {/* Metric 2: Capital at Risk */}
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Capital At Risk
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-slate-900 font-poppins">
              {isLoading ? "..." : fmt(atRiskTotal)}
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
            {urgentCount > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {urgentCount} approaching cliff &lt;14d
              </>
            ) : (
              <span className="text-slate-500">No imminent cliffs</span>
            )}
          </span>
        </div>

        {/* Metric 3: Cost of Holding */}
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Holding Decay Rate
            </span>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-rose-600 font-poppins">
              {isLoading ? "..." : `-${fmt(dailyDecay)}`}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ day</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
            ~{fmt(dailyDecay * 30)}/mo portfolio decay
          </span>
        </div>

        {/* Metric 4: Liquidity Health Index */}
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Liquidity Health
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-slate-900 font-poppins">
              Grade {healthScore.grade}
            </span>
            <span className="text-xs text-slate-500 font-medium">({healthScore.score}/100)</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${healthScore.score}%`,
                backgroundColor: healthScore.score >= 80 ? "#10B981" : healthScore.score >= 60 ? "#F59E0B" : "#EF4444",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
