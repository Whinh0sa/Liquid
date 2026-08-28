import { formatCurrency } from "../lib/format";
// ─── LiquidationRadar ─────────────────────────────────────────────────────────
//
// The 3-column intelligence grid:
//   • Heatmap (urgency bar chart per asset)
//   • Opportunity Radar (actionable sell-window assets)
//   • Sell Timeline (4-step guide)

import { BarChart2, Zap, Clock } from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";
import type { UrgencyLevel } from "@/lib/sellWindow";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RadarAsset {
  id: string;
  model: string;
  currentValue: number;
  depreciationCliff: { daysAway: number; projectedDrop: number };
}

interface LiquidationRadarProps {
  isLoading: boolean;
  portfolio: RadarAsset[];
  windowOpenCount: number;
  onOpenAsset: (asset: RadarAsset) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HEAT: Record<UrgencyLevel, string> = {
  CLIFF:   "#EF4444",
  URGENT:  "#F97316",
  WINDOW:  "#10B981",
  PLANNED: "#9126EF",
};

const URGENCY_PILL: Record<UrgencyLevel, { label: string; bg: string; text: string; border: string }> = {
  PLANNED: { label: "Plan ahead",     bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  WINDOW:  { label: "⚡ Sell now",    bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  URGENT:  { label: "Last chance",    bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  CLIFF:   { label: "Window closed",  bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

const TIMELINE_STEPS = [
  { title: "Sell now",          description: "Move the most urgent assets first." },
  { title: "Prep alerts",       description: "Set floors and queue the next exits." },
  { title: "Catch the window",  description: "Capture the best remaining prices." },
  { title: "Exit cleanly",      description: "Liquidate leftovers before the cliff." },
];

function fmt(n: number) {
  return formatCurrency.format(n);
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" />
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
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-500" />
          Heatmap
        </h3>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500">
          By urgency
        </span>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <Skeleton />
        ) : (
          portfolio.slice(0, 4).map((a) => {
            const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
            const pct = Math.max(8, Math.min(100, (1 - a.depreciationCliff.daysAway / 180) * 100));
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => onOpenAsset(a)}
              >
                <span className="text-[10px] text-gray-500 w-20 truncate shrink-0 group-hover:text-amber-500 transition-colors">
                  {a.model.split(" ").slice(0, 2).join(" ")}
                </span>
                <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: HEAT[sw.urgency], opacity: 0.85 }}
                  />
                </div>
                <span className="text-[10px] font-bold shrink-0" style={{ color: HEAT[sw.urgency] }}>
                  {a.depreciationCliff.daysAway}d
                </span>
              </div>
            );
          })
        )}
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
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Opportunity Radar
        </h3>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
          {windowOpenCount} open
        </span>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            {actionable.slice(0, 3).map((a) => {
              const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
              const pill = URGENCY_PILL[sw.urgency];
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2 rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
                  onClick={() => onOpenAsset(a)}
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                      {a.model}
                    </p>
                    <p className="text-[10px] text-gray-400">{fmt(a.currentValue / 100)}</p>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: pill.bg, color: pill.text, border: `1px solid ${pill.border}` }}
                  >
                    {pill.label}
                  </span>
                </div>
              );
            })}
            {windowOpenCount === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No urgent windows right now</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SellTimelinePanel() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Sell Timeline
        </h3>
      </div>
      <ol className="space-y-3">
        {TIMELINE_STEPS.map((step, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: "#9126EF" }}>
                {i + 1}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 mt-1" />
              )}
            </div>
            <div className="pb-3">
              <p className="text-xs font-semibold text-gray-900">{step.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiquidationRadar({
  isLoading,
  portfolio,
  windowOpenCount,
  onOpenAsset,
}: LiquidationRadarProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
      <SellTimelinePanel />
    </section>
  );
}
