import { formatCurrencyTwoDecimals } from "../lib/format";
// ─── PortfolioKPIs ────────────────────────────────────────────────────────────
//
// Displays the top "Total Portfolio Value" hero section and the three
// summary stat tiles beneath it (items tracked, sell windows open, urgent alerts).
//
// All data is passed in as props — this component is purely presentational.

import { Link } from "wouter";
import { Activity, Clock, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortfolioKPIsProps {
  isLoading: boolean;
  displayedNetWorth: number;
  itemCount: number;
  windowOpenCount: number;
  urgentCount: number;
  /** Show sub-text "N items tracked · M sell windows open" */
  hasMetrics: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return formatCurrencyTwoDecimals(n);
}

// ─── Sub-component ────────────────────────────────────────────────────────────
function SummaryTile({
  label,
  value,
  icon,
  valueColor = "#1F2937",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400">{icon}</div>
      <span className="text-lg font-bold" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PortfolioKPIs({
  isLoading,
  displayedNetWorth,
  itemCount,
  windowOpenCount,
  urgentCount,
  hasMetrics,
}: PortfolioKPIsProps) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
      {/* ── Hero value ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">
            Total Portfolio Value
          </p>
          {isLoading ? (
            <div className="h-10 w-52 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-gray-900 tracking-tight">
              {fmt(displayedNetWorth)}
            </h2>
          )}
          {hasMetrics && (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {itemCount} items tracked · {windowOpenCount} sell windows open
            </p>
          )}
        </div>

        {/* ── CTAs ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/analysis"
            className="px-4 py-2.5 rounded-2xl font-bold text-white shadow-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{
              backgroundColor: "#9126EF",
              boxShadow: "0 4px 14px rgba(145,38,239,0.2)",
            }}
          >
            Rebalance
          </Link>
          <Link
            href="/alerts"
            className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200"
          >
            Full Report
          </Link>
        </div>
      </div>

      {/* ── Three stat tiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 pt-6 border-t border-gray-100">
        <SummaryTile
          label="Items Tracked"
          value={`${itemCount}`}
          icon={<Activity className="w-3.5 h-3.5" />}
          valueColor="#9126EF"
        />
        <SummaryTile
          label="Sell Windows Open"
          value={`${windowOpenCount}`}
          icon={<Clock className="w-3.5 h-3.5" />}
          valueColor="#10B981"
        />
        <SummaryTile
          label="Urgent Alerts"
          value={`${urgentCount}`}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          valueColor="#EF4444"
        />
      </div>
    </section>
  );
}
