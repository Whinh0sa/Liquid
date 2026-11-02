// ─── AssetDrawer — Physical Asset Command Center ──────────────────────────────
//
// Decomposed modular drawer orchestrating:
//   - AssetHeader & Product Hero
//   - Best Time to Sell Urgency Banner
//   - DrawerChart (Historical actuals vs Projected cliff drop)
//   - ScenarioComparison & WhatIfSimulator
//   - ConditionGrader & PlatformEstimates
//   - Direct Liquidation Trigger & Exit Listing Generator Modal

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar, DollarSign, TrendingDown, CheckCircle } from "lucide-react";
import { computeSellWindow, buildExtendedChart, type UrgencyLevel } from "@/lib/sellWindow";
import { formatCurrency } from "@/lib/currency";
import ExitListingModal from "@/components/ExitListingModal";
import AssetImage from "@/components/ui/AssetImage";
import { triggerActionFeedback } from "@/lib/feedback";
import { BRAND } from "@/lib/tokens";

// Sub-components
import { StatTile } from "./drawer/StatTile";
import { MarketDemand } from "./drawer/MarketDemand";
import { PlatformEstimates } from "./drawer/PlatformEstimates";
import { ConditionGrader, CONDITIONS, type ConditionKey } from "./drawer/ConditionGrader";
import { ScenarioComparison, WhatIfSimulator } from "./drawer/ScenarioComparison";
import { DrawerChart } from "./drawer/DrawerChart";

export interface Asset {
  id: string;
  model: string;
  category: string;
  purchasePrice: number;
  currentValue: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

export interface AssetDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onSell: (id: string) => void;
  isSelling: boolean;
}

const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { bg: string; border: string; text: string; badge: string; badgeBg: string; label: string }
> = {
  PLANNED: {
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#334155",
    badge: "#64748B",
    badgeBg: "#F1F5F9",
    label: "Plan Ahead",
  },
  WINDOW: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    text: "#065F46",
    badge: "#059669",
    badgeBg: "#D1FAE5",
    label: "Optimal Window Open",
  },
  URGENT: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#92400E",
    badge: "#D97706",
    badgeBg: "#FEF3C7",
    label: "Urgent Cliff",
  },
  CLIFF: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#DC2626",
    badge: "#DC2626",
    badgeBg: "#FEE2E2",
    label: "Window Closed",
  },
};

export default function AssetDrawer({ asset, onClose, onSell, isSelling: _isSelling }: AssetDrawerProps) {
  type SellStage = "idle" | "processing" | "success";
  const [sellStage, setSellStage] = useState<SellStage>("idle");
  const [sellOffsetDays, setSellOffsetDays] = useState(0);
  const [condition, setCondition] = useState<ConditionKey>("good");
  const [showExitModal, setShowExitModal] = useState(false);

  // Reset stage when a different asset opens
  useEffect(() => {
    setSellStage("idle");
    setSellOffsetDays(0);
    setCondition("good");
  }, [asset?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sellStage === "idle") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, sellStage]);

  const handleSell = useCallback(() => {
    if (!asset || sellStage !== "idle") return;

    triggerActionFeedback("confirm");
    setSellStage("processing");
    const t1 = setTimeout(() => {
      onSell(asset.id);
      setSellStage("success");
      triggerActionFeedback("success");

      const t2 = setTimeout(() => {
        onClose();
      }, 2000);

      return () => clearTimeout(t2);
    }, 1200);

    return () => clearTimeout(t1);
  }, [asset, sellStage, onSell, onClose]);

  const currentValue = asset ? asset.currentValue / 100 : 0;
  const purchaseValue = asset ? asset.purchasePrice / 100 : 0;
  const dropDollars = asset ? asset.depreciationCliff.projectedDrop / 100 : 0;
  const daysAway = asset?.depreciationCliff.daysAway ?? 0;
  const totalPnl = purchaseValue > 0 ? ((currentValue - purchaseValue) / purchaseValue) * 100 : 0;
  const isDown = totalPnl < 0;
  const isAlreadySold = asset?.status === "LIQUIDATE" || asset?.status === "IN_TRANSIT";
  const conditionMultiplier = CONDITIONS[condition].multiplier;
  const conditionAdjustedValue = currentValue * conditionMultiplier;
  const safeDays = Math.max(1, Math.abs(daysAway));
  const dailyDecayRate = dropDollars / safeDays;
  const simulatedDaysAway = Math.max(0, daysAway - sellOffsetDays);
  const simulatedDropAtSell = Math.min(dropDollars, dailyDecayRate * sellOffsetDays);
  const simulatedValue = Math.max(0, currentValue - simulatedDropAtSell);
  const simulatedLoss = Math.max(0, currentValue - simulatedValue);
  const simulatedDrop = Math.max(0, dropDollars - simulatedDropAtSell);

  const sellWindow = asset ? computeSellWindow(daysAway, dropDollars) : null;
  const simulatedWindow = asset ? computeSellWindow(simulatedDaysAway, simulatedDrop) : null;
  const urgencyConf = sellWindow ? URGENCY_CONFIG[sellWindow.urgency] : null;

  const { data: chartData, windowStartLabel, windowEndLabel, cliffLabel } = useMemo(
    () =>
      asset
        ? buildExtendedChart(asset.currentValue, asset.depreciationCliff.projectedDrop, daysAway)
        : { data: [], windowStartLabel: null, windowEndLabel: null, cliffLabel: "" },
    [asset?.currentValue, asset?.depreciationCliff.projectedDrop, daysAway],
  );

  const fmt = formatCurrency;

  return (
    <AnimatePresence>
      {asset && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30"
            style={{ zIndex: 50 }}
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${asset.model} Asset Management Console`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed top-0 right-0 h-full flex flex-col bg-white overflow-hidden shadow-2xl"
            style={{
              zIndex: 51,
              width: "min(500px, 100vw)",
            }}
            data-testid="asset-drawer"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                  {asset.category}
                </p>
                <h2 className="font-poppins font-bold text-xl text-gray-900 leading-tight">
                  {asset.model}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close asset details"
                onClick={onClose}
                data-testid="btn-close-drawer"
                className="mt-1 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Hero Image */}
            <div className="relative w-full h-44 bg-slate-100 overflow-hidden border-b border-slate-100 shrink-0">
              <AssetImage
                model={asset.model}
                category={asset.category}
                alt={asset.model}
                aspectRatio="hero"
                className="h-full"
              />
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Valuation Overview */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Current Estimated Value</p>
                  <p className="font-poppins font-bold text-3xl text-gray-900">{fmt(currentValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium mb-1">Since Purchase</p>
                  <p className={`text-lg font-bold ${isDown ? "text-red-500" : "text-emerald-500"}`}>
                    {totalPnl >= 0 ? "+" : ""}
                    {totalPnl.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">{fmt(purchaseValue)} baseline</p>
                </div>
              </div>

              {/* Best Time to Sell Urgency Banner */}
              {sellWindow && urgencyConf && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: urgencyConf.bg, border: `1px solid ${urgencyConf.border}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: urgencyConf.badge }} />
                      <span className="text-sm font-bold" style={{ color: urgencyConf.text }}>
                        Best Time to Sell
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ color: urgencyConf.badge, backgroundColor: urgencyConf.badgeBg }}
                    >
                      {urgencyConf.label}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: urgencyConf.text }}>
                    {sellWindow.urgency === "CLIFF"
                      ? "Depreciation cliff has already passed. Liquidation value is now trading at secondary floor."
                      : sellWindow.urgency === "URGENT"
                        ? `Only ${sellWindow.daysUntilClose} days left to exit ahead of ${asset.depreciationCliff.reason}.`
                        : sellWindow.urgency === "WINDOW"
                          ? `Currently in prime sell window. Exit before ${sellWindow.sellByLabel} to protect ${fmt(dropDollars)}.`
                          : `Safe holding band. Next cliff is expected in ${daysAway} days.`}
                  </p>
                </div>
              )}

              {/* Chart */}
              <DrawerChart
                chartData={chartData}
                windowStartLabel={windowStartLabel}
                windowEndLabel={windowEndLabel}
                cliffLabel={cliffLabel}
              />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Calendar className="w-4 h-4 text-amber-500" />}
                  label="Recommended Sell By"
                  value={sellWindow ? sellWindow.sellByLabel : "—"}
                  sub={sellWindow?.urgency === "WINDOW" ? "Window open now" : `Cliff: +${daysAway}d`}
                  valueColor={urgencyConf?.badge ?? "#1F2937"}
                />
                <StatTile
                  icon={<DollarSign className="w-4 h-4 text-red-500" />}
                  label="At-Risk Value"
                  value={fmt(dropDollars)}
                  sub="if held through cliff"
                  valueColor="#EF4444"
                />
                <StatTile
                  icon={<TrendingDown className="w-4 h-4 text-gray-400" />}
                  label="Post-Cliff Floor"
                  value={fmt(Math.max(0, currentValue - dropDollars))}
                  sub="estimated floor price"
                />
                <StatTile
                  icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
                  label="Window Duration"
                  value={sellWindow ? `${Math.max(0, sellWindow.windowEndDay - sellWindow.windowStartDay)}d` : "—"}
                  sub={
                    sellWindow?.urgency === "WINDOW"
                      ? `${sellWindow.daysUntilClose}d remaining`
                      : sellWindow?.urgency === "PLANNED"
                        ? `Opens in ${sellWindow.daysUntilWindow}d`
                        : "Closed"
                  }
                  valueColor={urgencyConf?.badge ?? "#1F2937"}
                />
              </div>

              {/* Scenario Comparison */}
              <ScenarioComparison
                currentValue={currentValue}
                dropDollars={dropDollars}
                daysAway={daysAway}
                sellWindow={sellWindow}
              />

              {/* What-if Simulator */}
              <WhatIfSimulator
                currentValue={currentValue}
                purchaseValue={purchaseValue}
                baseDrop={dropDollars}
                daysAway={daysAway}
                sellOffsetDays={sellOffsetDays}
                setSellOffsetDays={setSellOffsetDays}
                simulatedDaysAway={simulatedDaysAway}
                simulatedValue={simulatedValue}
                simulatedLoss={simulatedLoss}
                simulatedWindow={simulatedWindow}
              />

              {/* Condition Grader */}
              <ConditionGrader
                currentValue={currentValue}
                condition={condition}
                setCondition={setCondition}
              />

              {/* Platform Estimates */}
              <PlatformEstimates
                currentValue={currentValue}
                conditionMultiplier={conditionMultiplier}
                urgency={sellWindow?.urgency ?? "PLANNED"}
                category={asset.category}
              />

              {/* Market Demand */}
              <MarketDemand category={asset.category} daysAway={daysAway} />
            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-3">
              {isAlreadySold ? (
                <div className="w-full h-14 flex items-center justify-center rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100">
                  {asset.status === "LIQUIDATE" ? "Sale pending…" : "In transit"}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    data-testid="btn-drawer-sell"
                    disabled={sellStage !== "idle"}
                    onClick={handleSell}
                    className="w-full h-14 rounded-xl font-bold text-base tracking-wide transition-all duration-300 shadow-sm active:scale-[0.99]"
                    style={{
                      backgroundColor:
                        sellStage === "processing"
                          ? "#9CA3AF"
                          : sellStage === "success"
                            ? "#059669"
                            : BRAND.primary,
                      color: "#FFFFFF",
                      cursor: sellStage !== "idle" ? "not-allowed" : "pointer",
                    }}
                  >
                    {sellStage === "processing"
                      ? "PROCESSING..."
                      : sellStage === "success"
                        ? "FUNDS SECURED!"
                        : `SELL NOW · ${fmt(conditionAdjustedValue)}`}
                  </button>

                  <button
                    type="button"
                    data-testid="btn-generate-exit-listing"
                    onClick={() => setShowExitModal(true)}
                    className="w-full h-11 rounded-xl font-bold text-sm tracking-wide bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    Generate Exit Listing
                  </button>

                  <AnimatePresence mode="wait">
                    {sellStage === "success" ? (
                      <motion.p
                        key="success-msg"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-xs text-emerald-600 font-semibold mt-2"
                      >
                        Sale confirmed — funds will be transferred within 1–2 business days.
                      </motion.p>
                    ) : sellStage === "processing" ? (
                      <motion.p
                        key="processing-msg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-xs text-gray-400 mt-2"
                      >
                        Submitting your liquidation order…
                      </motion.p>
                    ) : (
                      <motion.p
                        key="idle-msg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-xs text-gray-400 mt-2"
                      >
                        {sellWindow?.sellByLabel ?? `Avoid the projected ${fmt(dropDollars)} loss`}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* Exit Listing Modal */}
            <ExitListingModal
              open={showExitModal}
              onOpenChange={setShowExitModal}
              assetId={asset.id}
              assetModel={asset.model}
              assetCategory={asset.category}
              conditionLabel={CONDITIONS[condition]?.label}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
