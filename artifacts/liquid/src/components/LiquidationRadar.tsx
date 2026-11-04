// ─── LiquidationRadar — Intelligence & Arbitrage Queue ─────────────────────────
//
// 3-Column Intelligence Panel:
//   1. Liquidation Heatmap: Urgency countdown & burn bar per asset
//   2. Opportunity Radar: Actionable assets in prime exit windows
//   3. Holding Cost & Exit Strategy: Real-time amortized daily decay breakdown
//
// Colors strictly follow the 3-tier semantic system.

import { BarChart2, Zap, Clock, TrendingDown, ArrowRight } from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";
import { formatCurrency as fmt } from "@/lib/currency";
import { URGENCY_PILL, URGENCY_HEAT } from "@/lib/urgency";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RadarAsset {
  id: string;
  model: string;
  currentValue: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason?: string };
}

interface LiquidationRadarProps {
  isLoading: boolean;
  portfolio: RadarAsset[];
  windowOpenCount: number;
  onOpenAsset: (asset: RadarAsset) => void;
  dailyDecay?: number;
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-[#1A1F2E] animate-pulse" />
      ))}
    </>
  );
}

function HeatmapPanel({
  isLoading,
  portfolio,
  onOpenAsset,
}: {
  isLoading: boolean;
  portfolio: RadarAsset[];
  onOpenAsset: (a: RadarAsset) => void;
}) {
  return (
    <div className="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            Liquidation Heatmap
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-400">
            By Proximity
          </span>
        </div>

        <div className="space-y-2.5">
          {isLoading ? (
            <Skeleton />
          ) : portfolio.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No assets currently tracked</p>
          ) : (
            portfolio.slice(0, 4).map((a) => {
              const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
              const pct = Math.max(8, Math.min(100, (1 - a.depreciationCliff.daysAway / 180) * 100));
              const heatColor = URGENCY_HEAT[sw.urgency];

              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1A1F2E] transition-colors"
                  onClick={() => onOpenAsset(a)}
                >
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-28 truncate shrink-0 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {a.model}
                  </span>
                  <div className="flex-1 h-3.5 bg-slate-100 dark:bg-[#0B0D13] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: heatColor }}
                    />
                  </div>
                  <span className="text-xs font-bold shrink-0 font-poppins" style={{ color: heatColor }}>
                    {a.depreciationCliff.daysAway}d
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function OpportunityRadarPanel({
  isLoading,
  portfolio,
  windowOpenCount,
  onOpenAsset,
}: {
  isLoading: boolean;
  portfolio: RadarAsset[];
  windowOpenCount: number;
  onOpenAsset: (a: RadarAsset) => void;
}) {
  const actionable = portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return sw.urgency === "WINDOW" || sw.urgency === "URGENT";
  });

  return (
    <div className="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            Opportunity Radar
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {windowOpenCount} Open
          </span>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <Skeleton />
          ) : actionable.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs">No urgent sell windows open today</p>
              <p className="text-[11px] mt-1 text-slate-400">All tracked items are currently within safe hold bands.</p>
            </div>
          ) : (
            actionable.slice(0, 3).map((a) => {
              const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
              const pill = URGENCY_PILL[sw.urgency];

              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1A1F2E]/60 hover:bg-slate-50 dark:hover:bg-[#1A1F2E] cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  onClick={() => onOpenAsset(a)}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {a.model}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {fmt(a.currentValue / 100)} · saves −{fmt(a.depreciationCliff.projectedDrop / 100)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border"
                    style={{ backgroundColor: pill.bg, color: pill.text, borderColor: pill.border }}
                  >
                    {pill.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
        Exiting within the optimal window locks in top secondary market pricing.
      </p>
    </div>
  );
}

function HoldingCostPanel({
  portfolio,
  dailyDecay,
}: {
  portfolio: RadarAsset[];
  dailyDecay?: number;
}) {
  const calculatedDecay =
    dailyDecay !== undefined
      ? dailyDecay
      : portfolio.reduce((sum, a) => {
          const days = a.depreciationCliff.daysAway;
          const drop = a.depreciationCliff.projectedDrop / 100;
          return days > 0 ? sum + drop / days : sum;
        }, 0);

  const atRisk = portfolio.reduce((sum, a) => sum + a.depreciationCliff.projectedDrop / 100, 0);

  return (
    <div className="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            Cost of Holding
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Daily Burn
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A1F2E] border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Daily amortized decay</span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-poppins">
              -{fmt(calculatedDecay)}/day
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A1F2E] border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">30-day projected loss</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-poppins">
              -{fmt(calculatedDecay * 30)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A1F2E] border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cliff downside at risk</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-poppins">
              {fmt(atRisk)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 leading-relaxed">
        Calculates secondary depreciation momentum across active inventory.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiquidationRadar({
  isLoading,
  portfolio,
  windowOpenCount,
  onOpenAsset,
  dailyDecay,
}: LiquidationRadarProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <HeatmapPanel
        isLoading={isLoading}
        portfolio={portfolio}
        onOpenAsset={onOpenAsset}
      />
      <OpportunityRadarPanel
        isLoading={isLoading}
        portfolio={portfolio}
        windowOpenCount={windowOpenCount}
        onOpenAsset={onOpenAsset}
      />
      <HoldingCostPanel
        portfolio={portfolio}
        dailyDecay={dailyDecay}
      />
    </section>
  );
}
