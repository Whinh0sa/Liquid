import { formatCurrencyTwoDecimals } from "../lib/format";
// ─── AssetCard ────────────────────────────────────────────────────────────────
//
// Renders a single portfolio asset in either "tiles" or "list" view.
// When an asset is sold/selling it renders <RecoveryCard> instead.

import { useState } from "react";
import {
  Bell,
  BellRing,
  Clock,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";
import type { UrgencyLevel } from "@/lib/sellWindow";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AssetCardAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: {
    daysAway: number;
    projectedDrop: number;
    reason: string;
  };
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return formatCurrencyTwoDecimals(n);
}

const URGENCY_PILL: Record<
  UrgencyLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  PLANNED: {
    label: "Plan ahead",
    bg: "#DBEAFE",
    text: "#1D4ED8",
    border: "#BFDBFE",
  },
  WINDOW: {
    label: "⚡ Sell now",
    bg: "#D1FAE5",
    text: "#065F46",
    border: "#6EE7B7",
  },
  URGENT: {
    label: "Last chance",
    bg: "#FFEDD5",
    text: "#9A3412",
    border: "#FED7AA",
  },
  CLIFF: {
    label: "Window closed",
    bg: "#FEE2E2",
    text: "#991B1B",
    border: "#FECACA",
  },
};

// ─── RecoveryCard (shown post-sell) ──────────────────────────────────────────
function RecoveryCard({
  asset,
  soldRecord,
}: {
  asset: AssetCardAsset;
  soldRecord?: { saleValue: number; dropAvoided: number; soldAt: number };
}) {
  const saleValue = soldRecord?.saleValue ?? asset.currentValue / 100;
  const dropAvoided =
    soldRecord?.dropAvoided ?? asset.depreciationCliff.projectedDrop / 100;
  const wouldBeWorth = Math.max(saleValue - dropAvoided, 0);
  const barPct =
    saleValue > 0 ? Math.round((wouldBeWorth / saleValue) * 100) : 0;
  return (
    <div
      className="rounded-3xl border border-emerald-100 p-5 flex flex-col gap-4"
      style={{
        background: "linear-gradient(145deg, #f0fdf4 0%, #ffffff 55%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {asset.category}
          </p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {asset.model}
          </h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
          <CheckCircle className="w-3 h-3" />
          PROTECTED
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Locked in
          </p>
          <span className="font-poppins font-bold text-2xl text-emerald-600">
            {fmt(saleValue)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Market now
          </p>
          <span className="font-poppins font-bold text-lg text-red-400 line-through decoration-red-300">
            {fmt(wouldBeWorth)}
          </span>
        </div>
      </div>
      <div>
        <div className="relative h-2.5 bg-red-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-emerald-400"
            style={{
              width: `${Math.max(barPct, 4)}%`,
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1 font-medium">
          <span className="text-emerald-600">You: {fmt(saleValue)}</span>
          <span className="text-red-400">Market: {fmt(wouldBeWorth)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">
            +{fmt(dropAvoided)} saved
          </span>
        </div>
        {soldRecord && (
          <span className="text-[11px] text-gray-400 font-medium">
            just now
          </span>
        )}
      </div>
    </div>
  );
}

// ─── AssetCard ────────────────────────────────────────────────────────────────
export default function AssetCard({
  asset,
  isSelling,
  soldRecord,
  alertPrice,
  onSell,
  onOpen,
  onSetAlert,
  viewType = "tiles",
}: {
  asset: AssetCardAsset;
  isSelling: boolean;
  soldRecord?: { saleValue: number; dropAvoided: number; soldAt: number };
  alertPrice?: number;
  onSell: (id: string) => void;
  onOpen: (asset: AssetCardAsset) => void;
  onSetAlert: (id: string, price: number | null) => void;
  viewType?: "tiles" | "list";
}) {
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertInput, setAlertInput] = useState("");

  const current = asset.currentValue / 100;
  const purchase = asset.purchasePrice / 100;
  const pnl = ((current - purchase) / purchase) * 100;
  const cliff = asset.depreciationCliff;
  const isSold = asset.status === "LIQUIDATE" || asset.status === "IN_TRANSIT";

  if (isSelling || isSold)
    return <RecoveryCard asset={asset} soldRecord={soldRecord} />;

  const sellWindow = computeSellWindow(
    cliff.daysAway,
    cliff.projectedDrop / 100,
  );
  const urgencyPill = URGENCY_PILL[sellWindow.urgency];
  const isAlertFired = alertPrice !== undefined && current <= alertPrice;

  const confirmAlert = () => {
    const v = parseFloat(alertInput);
    if (!isNaN(v) && v > 0) {
      onSetAlert(asset.id, v);
      setShowAlertInput(false);
      setAlertInput("");
    }
  };

  const borderStyle = isAlertFired
    ? {
        border: "1.5px solid #F59E0B",
        boxShadow: "0 0 0 3px rgba(245,158,11,0.12)",
      }
    : alertPrice !== undefined
      ? { border: "1.5px solid #FCD34D" }
      : { border: "1px solid #E5E7EB" };

  // ── Alert input row ────────────────────────────────────────────────────────
  const alertRow = !alertPrice ? (
    showAlertInput ? (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 shrink-0">Floor $</span>
        <input
          type="number"
          value={alertInput}
          onChange={(e) => setAlertInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmAlert();
            if (e.key === "Escape") {
              setShowAlertInput(false);
              setAlertInput("");
            }
          }}
          placeholder={current.toFixed(0)}
          autoFocus
          className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400 min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            confirmAlert();
          }}
          className="h-7 px-2.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 shrink-0"
        >
          Set
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAlertInput(false);
            setAlertInput("");
          }}
          className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-lg shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowAlertInput(true);
          setAlertInput(current.toFixed(0));
        }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-500 transition-colors"
      >
        <Bell className="w-3 h-3" />
        Set price floor alert
      </button>
    )
  ) : (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
        <Bell className="w-3 h-3" />
        Alert set at {fmt(alertPrice)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSetAlert(asset.id, null);
        }}
        className="text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewType === "list") {
    return (
      <div
        className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300 hover:shadow-md"
        onClick={() => onOpen(asset)}
        style={{ ...borderStyle, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {asset.category}
            </p>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-amber-500 transition-colors truncate">
              {asset.model}
            </h3>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap"
            style={{
              color: urgencyPill.text,
              backgroundColor: urgencyPill.bg,
              borderColor: urgencyPill.border,
            }}
          >
            {urgencyPill.label}
          </span>
        </div>
        {isAlertFired && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 flex-1">
              Floor hit — value at or below {fmt(alertPrice ?? 0)}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit"
              style={{
                color: urgencyPill.text,
                backgroundColor: urgencyPill.bg,
              }}
            >
              <Clock className="w-3 h-3" />
              {sellWindow.sellByLabel}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              −{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d
            </p>
          </div>
          <div className="text-right">
            <span className="font-poppins font-bold text-xl sm:text-2xl text-gray-900 block">
              {fmt(current)}
            </span>
            <span
              className={`text-xs sm:text-sm font-semibold inline-flex items-center gap-0.5 ${pnl < 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              {pnl < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(1)}%
            </span>
          </div>
        </div>
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSell(asset.id);
            }}
            className="flex-1 min-w-[120px] h-9 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#9126EF" }}
          >
            Sell Now
          </button>
          <button
            className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(asset);
            }}
          >
            Analyse
          </button>
        </div>
        <div
          className="border-t border-gray-100 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {alertRow}
        </div>
      </div>
    );
  }

  // ── Tile view ──────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-white rounded-3xl p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300 hover:shadow-md"
      onClick={() => onOpen(asset)}
      style={{ ...borderStyle, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {asset.category}
          </p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-amber-500 transition-colors">
            {asset.model}
          </h3>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap"
          style={{
            color: urgencyPill.text,
            backgroundColor: urgencyPill.bg,
            borderColor: urgencyPill.border,
          }}
        >
          {urgencyPill.label}
        </span>
      </div>
      {isAlertFired && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            Floor hit — value at or below {fmt(alertPrice ?? 0)}
          </p>
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <span className="font-poppins font-bold text-2xl text-gray-900">
          {fmt(current)}
        </span>
        <span
          className={`text-sm font-semibold flex items-center gap-0.5 ${pnl < 0 ? "text-red-500" : "text-emerald-500"}`}
        >
          {pnl < 0 ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5" />
          )}
          {pnl >= 0 ? "+" : ""}
          {pnl.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg }}
        >
          <Clock className="w-3 h-3" />
          {sellWindow.sellByLabel}
        </div>
        <span className="text-xs text-gray-400">
          −{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d
        </span>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSell(asset.id);
          }}
          className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: "#9126EF" }}
        >
          Sell Now
        </button>
        <button
          className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(asset);
          }}
        >
          Analyse
        </button>
      </div>
      <div
        className="border-t border-gray-100 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {alertRow}
      </div>
    </div>
  );
}
