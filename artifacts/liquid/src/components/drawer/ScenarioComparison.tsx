import { Activity, Zap, SlidersHorizontal } from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";

// ── Sell Window Timeline Bar ──────────────────────────────────────────────────
export function SellWindowTimeline({
  sellWindow,
}: {
  sellWindow: ReturnType<typeof computeSellWindow>;
}) {
  const cliff = sellWindow.cliffDay;
  if (cliff <= 0) return null;

  const total = cliff + 3;
  const windowStartPct = (sellWindow.windowStartDay / total) * 100;
  const windowWidthPct = ((sellWindow.windowEndDay - sellWindow.windowStartDay) / total) * 100;
  const cliffPct = (cliff / total) * 100;
  const todayPct = 0;

  return (
    <div className="mt-3">
      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
        {/* Sell window zone — green */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${windowStartPct}%`,
            width: `${Math.max(windowWidthPct, 2)}%`,
            backgroundColor: "rgba(16,185,129,0.35)",
          }}
        />
        {/* Danger zone — red (cliff onwards) */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${cliffPct}%`,
            width: `${100 - cliffPct}%`,
            backgroundColor: "rgba(239,68,68,0.2)",
          }}
        />
        {/* Today marker */}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{ left: `${todayPct}%`, backgroundColor: "#F59E0B" }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 font-medium mt-1 px-0.5">
        <span style={{ color: "#F59E0B" }}>Today</span>
        {sellWindow.windowStartDay > 0 && (
          <span className="text-emerald-600">Window +{sellWindow.windowStartDay}d</span>
        )}
        <span className="text-red-400">Cliff +{cliff}d</span>
      </div>
    </div>
  );
}

// ── Scenario Comparison ───────────────────────────────────────────────────────
export function ScenarioComparison({
  currentValue,
  dropDollars,
  daysAway,
  sellWindow,
}: {
  currentValue: number;
  dropDollars: number;
  daysAway: number;
  sellWindow: ReturnType<typeof computeSellWindow> | null;
}) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const urgency = sellWindow?.urgency ?? "PLANNED";
  const postCliff = Math.max(0, currentValue - dropDollars);
  const lossPct = currentValue > 0 ? (dropDollars / currentValue) * 100 : 0;
  const safeDays = Math.max(1, Math.abs(daysAway));
  const dailyCost = dropDollars / safeDays;

  type Col = {
    title: string;
    sub: string;
    value: number;
    color: string;
    highlight: boolean;
    dimmed: boolean;
    badge: { text: string; bg: string; color: string } | null;
    pct: number | null;
  };

  const cols: Col[] = [
    {
      title: "Sell Today",
      sub:
        urgency === "WINDOW"
          ? "Window open ✓"
          : urgency === "URGENT"
            ? "Act fast"
            : urgency === "CLIFF"
              ? "Post-cliff"
              : "Pre-window",
      value: currentValue,
      color: urgency === "WINDOW" ? "#059669" : urgency === "URGENT" ? "#EA580C" : "#1F2937",
      highlight: urgency === "WINDOW" || urgency === "URGENT",
      dimmed: false,
      pct: null,
      badge:
        urgency === "WINDOW"
          ? { text: "Best time ✓", bg: "#D1FAE5", color: "#065F46" }
          : urgency === "URGENT"
            ? { text: "Act now", bg: "#FFEDD5", color: "#9A3412" }
            : null,
    },
    {
      title: urgency === "PLANNED" ? `+${sellWindow?.daysUntilWindow ?? "?"}d Window` : "Optimal window",
      sub:
        urgency === "PLANNED"
          ? "Ideal listing zone"
          : urgency === "WINDOW"
            ? "You're here now"
            : "Window closed",
      value: currentValue,
      color: urgency === "PLANNED" ? "#9126EF" : urgency === "WINDOW" ? "#059669" : "#9CA3AF",
      highlight: urgency === "PLANNED",
      dimmed: urgency === "URGENT" || urgency === "CLIFF",
      pct: 0,
      badge:
        urgency === "PLANNED"
          ? { text: "Recommended", bg: "rgba(145,38,239,0.1)", color: "#9126EF" }
          : null,
    },
    {
      title: "After cliff",
      sub: `~${daysAway}d from now`,
      value: postCliff,
      color: "#DC2626",
      highlight: false,
      dimmed: false,
      pct: -lossPct,
      badge: { text: `−${f(dropDollars)}`, bg: "#FEE2E2", color: "#991B1B" },
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-amber-500" />
        Sell Scenario Comparison
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div
            key={col.title}
            className={`rounded-xl p-3 border flex flex-col gap-1 ${
              col.highlight
                ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                : "bg-slate-50 dark:bg-[#1A1F2E] border-slate-200 dark:border-slate-800"
            }`}
            style={{
              opacity: col.dimmed ? 0.5 : 1,
            }}
          >
            <p className="text-[9px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide leading-tight">
              {col.title}
            </p>
            <p className="font-poppins font-bold text-sm leading-tight" style={{ color: col.color }}>
              {f(col.value)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">{col.sub}</p>
            {col.pct !== null && col.pct !== 0 && (
              <p className="text-[10px] font-semibold text-red-500">{col.pct.toFixed(1)}%</p>
            )}
            {col.badge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start mt-0.5"
                style={{ backgroundColor: col.badge.bg, color: col.badge.color }}
              >
                {col.badge.text}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
        Missing the cliff costs approx.{" "}
        <strong className="text-gray-600 dark:text-slate-200 font-semibold">{f(dailyCost)}/day</strong> amortised over the window.
      </p>
    </div>
  );
}

// ── What If Simulator ────────────────────────────────────────────────────────
export function WhatIfSimulator({
  currentValue,
  purchaseValue,
  baseDrop,
  daysAway,
  sellOffsetDays,
  setSellOffsetDays,
  simulatedDaysAway,
  simulatedValue,
  simulatedLoss,
  simulatedWindow,
}: {
  currentValue: number;
  purchaseValue: number;
  baseDrop: number;
  daysAway: number;
  sellOffsetDays: number;
  setSellOffsetDays: (n: number) => void;
  simulatedDaysAway: number;
  simulatedValue: number;
  simulatedLoss: number;
  simulatedWindow: ReturnType<typeof computeSellWindow> | null;
}) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pctFromPurchase =
    purchaseValue > 0 ? ((simulatedValue - purchaseValue) / purchaseValue) * 100 : 0;

  return (
    <div className="bg-white dark:bg-[#131722] rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-500" />
          What-if Simulator
        </h3>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
          Drag to explore
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3 bg-gray-50 dark:bg-[#1A1F2E] border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Sell in</p>
          <p className="text-2xl font-poppins font-bold text-gray-900 dark:text-slate-100">{sellOffsetDays}d</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{simulatedDaysAway}d until cliff</p>
        </div>
        <div className="rounded-xl p-3 bg-gray-50 dark:bg-[#1A1F2E] border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Projected value</p>
          <p className="text-2xl font-poppins font-bold text-emerald-600 dark:text-emerald-400">{f(simulatedValue)}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">vs. now {f(currentValue)}</p>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, Math.min(daysAway, 21))}
        value={sellOffsetDays}
        onChange={(e) => setSellOffsetDays(parseInt(e.target.value, 10))}
        className="w-full accent-amber-500"
      />
      <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
        <span>Sell now</span>
        <span>+{Math.max(0, Math.min(daysAway, 21))}d</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl p-3 bg-red-50 border border-red-100">
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">Value lost</p>
          <p className="text-sm font-bold text-red-500">{f(simulatedLoss)}</p>
        </div>
        <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
          <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1">PnL</p>
          <p className="text-sm font-bold text-purple-600">
            {pctFromPurchase >= 0 ? "+" : ""}
            {pctFromPurchase.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1">Sell state</p>
          <p className="text-sm font-bold text-emerald-600">
            {simulatedWindow?.urgency === "WINDOW"
              ? "Ideal"
              : simulatedWindow?.urgency === "URGENT"
                ? "Urgent"
                : "Later"}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        This simulates waiting from today to a future sell date and estimates the remaining resale value.
      </p>
    </div>
  );
}
