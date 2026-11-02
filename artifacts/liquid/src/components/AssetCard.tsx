// ─── AssetCard — Standardized Financial Asset Component ──────────────────────────
//
// Renders a single portfolio asset in either "tiles" or "list" view.
// Color system strictly adheres to the 3-tier semantic model:
//   • Primary action: Electric Purple / Emerald Sell
//   • Window/Safe: Emerald / Slate
//   • Cliff/Alert: Amber / Crimson
//
// When an asset is sold/selling it renders <RecoveryCard>.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Clock,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  X,
  ArrowRight,
} from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";
import { formatCurrency as fmt } from "@/lib/currency";
import { URGENCY_PILL } from "@/lib/urgency";
import AssetImage from "@/components/ui/AssetImage";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AssetCardAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

// ─── RecoveryCard (shown post-sell) ──────────────────────────────────────────
function RecoveryCard({
  asset,
  soldRecord,
}: {
  asset: AssetCardAsset;
  soldRecord?: { saleValue: number; dropAvoided: number; soldAt: number };
}) {
  const saleValue = soldRecord?.saleValue ?? asset.currentValue / 100;
  const dropAvoided = soldRecord?.dropAvoided ?? asset.depreciationCliff.projectedDrop / 100;
  const wouldBeWorth = Math.max(saleValue - dropAvoided, 0);
  const barPct = saleValue > 0 ? Math.round((wouldBeWorth / saleValue) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 to-white p-5 flex flex-col gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
            {asset.category}
          </span>
          <h3 className="font-semibold text-slate-900 text-sm leading-tight">{asset.model}</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
          <CheckCircle className="w-3 h-3" />
          PROTECTED
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 pt-1">
        <div>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-0.5">
            Realized Recovery
          </span>
          <span className="font-poppins font-bold text-2xl text-emerald-600">{fmt(saleValue)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">
            Market If Kept
          </span>
          <span className="font-poppins font-semibold text-base text-rose-400 line-through">
            {fmt(wouldBeWorth)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${Math.max(barPct, 6)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-slate-500">
          <span>Protected: {fmt(saleValue)}</span>
          <span className="text-rose-600">Dropped: {fmt(wouldBeWorth)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-emerald-100/80 mt-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>+{fmt(dropAvoided)} saved from cliff</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Exit complete</span>
      </div>
    </motion.div>
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
  const pnl = purchase > 0 ? ((current - purchase) / purchase) * 100 : 0;
  const cliff = asset.depreciationCliff;
  const isSold = asset.status === "LIQUIDATE" || asset.status === "IN_TRANSIT";

  if (isSelling || isSold) return <RecoveryCard asset={asset} soldRecord={soldRecord} />;

  const sellWindow = computeSellWindow(cliff.daysAway, cliff.projectedDrop / 100);
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

  // Border styling using strict semantic tokens
  const cardBorderClass = isAlertFired
    ? "border-amber-300 ring-2 ring-amber-100/80 bg-amber-50/20"
    : alertPrice !== undefined
    ? "border-amber-200"
    : "border-slate-200/90 hover:border-slate-300";

  // ── Alert input row ────────────────────────────────────────────────────────
  const alertRow = !alertPrice ? (
    showAlertInput ? (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] font-medium text-slate-500 shrink-0">Floor $</span>
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
          className="flex-1 h-7 px-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 min-w-0"
        />
        <button
          type="button"
          onClick={confirmAlert}
          className="h-7 px-2.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shrink-0 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          aria-label="Cancel alert"
          onClick={() => {
            setShowAlertInput(false);
            setAlertInput("");
          }}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowAlertInput(true);
          setAlertInput(current.toFixed(0));
        }}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
      >
        <Bell className="w-3 h-3 text-slate-400" />
        <span>Set price floor alert</span>
      </button>
    )
  ) : (
    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Bell className="w-3 h-3 text-amber-600" />
        Alert set at {fmt(alertPrice)}
      </span>
      <button
        type="button"
        aria-label="Clear alert"
        onClick={() => onSetAlert(asset.id, null)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewType === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group transition-all duration-200 border shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md ${cardBorderClass}`}
        onClick={() => onOpen(asset)}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <AssetImage
            model={asset.model}
            category={asset.category}
            alt={asset.model}
            aspectRatio="square"
            className="w-12 h-12 rounded-xl border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {asset.category}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  color: urgencyPill.text,
                  backgroundColor: urgencyPill.bg,
                  borderColor: urgencyPill.border,
                }}
              >
                {urgencyPill.label}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-purple-600 transition-colors truncate">
              {asset.model}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Cliff in {cliff.daysAway}d: drops −{fmt(cliff.projectedDrop / 100)}</span>
            </p>
          </div>
        </div>

        {isAlertFired && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <BellRing className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Floor hit (&le; {fmt(alertPrice ?? 0)})</span>
          </div>
        )}

        <div className="flex items-center gap-6 self-end sm:self-auto shrink-0">
          <div className="text-right">
            <span className="font-poppins font-bold text-xl text-slate-900 block">
              {fmt(current)}
            </span>
            <span
              className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                pnl < 0 ? "text-rose-500" : "text-emerald-600"
              }`}
            >
              {pnl < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={`Sell ${asset.model} now`}
              onClick={() => onSell(asset.id)}
              className="h-8 px-3 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#059669" }}
            >
              Sell Now
            </button>
            <button
              type="button"
              aria-label={`Inspect ${asset.model} details`}
              onClick={() => onOpen(asset)}
              className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Inspect
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Tile view ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`bg-white rounded-2xl p-4 flex flex-col gap-3.5 cursor-pointer group transition-all duration-200 border shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md ${cardBorderClass}`}
      onClick={() => onOpen(asset)}
    >
      {/* Product Image Header */}
      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
        <AssetImage
          model={asset.model}
          category={asset.category}
          alt={asset.model}
          aspectRatio="hero"
          className="h-full group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 right-2.5 z-10">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-xs whitespace-nowrap"
            style={{
              color: urgencyPill.text,
              backgroundColor: urgencyPill.bg,
              borderColor: urgencyPill.border,
            }}
          >
            {urgencyPill.label}
          </span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
            {asset.category}
          </span>
          <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-purple-600 transition-colors line-clamp-1">
            {asset.model}
          </h3>
        </div>
      </div>

      {isAlertFired && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
          <BellRing className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            Floor reached (&le; {fmt(alertPrice ?? 0)})
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between pt-1">
        <span className="font-poppins font-bold text-2xl text-slate-900">{fmt(current)}</span>
        <span
          className={`text-xs font-semibold flex items-center gap-0.5 ${
            pnl < 0 ? "text-rose-500" : "text-emerald-600"
          }`}
        >
          {pnl < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {pnl >= 0 ? "+" : ""}
          {pnl.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{sellWindow.sellByLabel}</span>
        </div>
        <span className="text-[11px] text-rose-500 font-medium">
          −{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d
        </span>
      </div>

      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Sell ${asset.model} now`}
          onClick={() => onSell(asset.id)}
          className="flex-1 h-8 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: "#059669" }}
        >
          Sell Now
        </button>
        <button
          type="button"
          aria-label={`Inspect ${asset.model} details`}
          onClick={() => onOpen(asset)}
          className="h-8 px-3.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Inspect
        </button>
      </div>

      <div className="pt-2 border-t border-slate-100 mt-auto">{alertRow}</div>
    </motion.div>
  );
}
