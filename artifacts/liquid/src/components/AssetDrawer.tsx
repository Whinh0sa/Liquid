import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { X, AlertTriangle, TrendingDown, Calendar, DollarSign, Clock, CheckCircle, Activity, Zap, ShoppingCart, Users } from "lucide-react";
import { computeSellWindow, buildExtendedChart, type UrgencyLevel } from "@/lib/sellWindow";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Asset {
  id: string;
  model: string;
  category: string;
  purchasePrice: number;
  currentValue: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

interface AssetDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onSell: (id: string) => void;
  isSelling: boolean;
}

// ── Urgency config ────────────────────────────────────────────────────────────
const URGENCY_CONFIG: Record<UrgencyLevel, {
  bg: string; border: string; text: string; badge: string; badgeBg: string; label: string;
}> = {
  PLANNED: {
    bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8",
    badge: "#2563EB", badgeBg: "#DBEAFE", label: "Plan ahead",
  },
  WINDOW: {
    bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D",
    badge: "#10B981", badgeBg: "#D1FAE5", label: "⚡ Sell now — optimal window",
  },
  URGENT: {
    bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C",
    badge: "#F97316", badgeBg: "#FFEDD5", label: "Last chance",
  },
  CLIFF: {
    bg: "#FEF2F2", border: "#FECACA", text: "#DC2626",
    badge: "#EF4444", badgeBg: "#FEE2E2", label: "Window closed",
  },
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const isCliff = typeof label === "string" && label.includes("cliff");
  const isWindow = typeof label === "string" && label.includes("★");
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-lg min-w-[130px]">
      <p className="text-xs font-semibold text-gray-500 mb-1">
        {isCliff ? "⚠️ Cliff Event" : isWindow ? "⭐ Ideal sell-by" : label}
      </p>
      <p className="text-sm font-bold text-gray-900">
        {payload[0].value.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </p>
      {isCliff && <p className="text-[10px] text-red-500 mt-1">Value drops sharply here</p>}
      {isWindow && <p className="text-[10px] text-emerald-600 mt-1">Best price-to-risk balance</p>}
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function AssetDrawer({ asset, onClose, onSell, isSelling }: AssetDrawerProps) {
  type SellStage = "idle" | "processing" | "success";
  const [sellStage, setSellStage] = useState<SellStage>("idle");

  // Reset stage when a different asset opens
  useEffect(() => { setSellStage("idle"); }, [asset?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && sellStage === "idle") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, sellStage]);

  const handleSell = useCallback(() => {
    if (!asset || sellStage !== "idle") return;

    // Step 1 — immediate: gray "PROCESSING..." state
    setSellStage("processing");

    // Step 2 — after 1.2 s: fire the API call + show success
    const t1 = setTimeout(() => {
      onSell(asset.id);
      setSellStage("success");

      // Step 3 — after 2 more seconds: close the drawer
      const t2 = setTimeout(() => {
        onClose();
      }, 2000);

      return () => clearTimeout(t2);
    }, 1200);

    return () => clearTimeout(t1);
  }, [asset, sellStage, onSell, onClose]);

  const currentValue  = asset ? asset.currentValue / 100 : 0;
  const purchaseValue = asset ? asset.purchasePrice / 100 : 0;
  const dropDollars   = asset ? asset.depreciationCliff.projectedDrop / 100 : 0;
  const daysAway      = asset?.depreciationCliff.daysAway ?? 0;
  const totalPnl      = ((currentValue - purchaseValue) / purchaseValue) * 100;
  const isDown        = totalPnl < 0;
  const isAlreadySold = asset?.status === "LIQUIDATE" || asset?.status === "IN_TRANSIT";

  const sellWindow = asset ? computeSellWindow(daysAway, dropDollars) : null;
  const urgencyConf = sellWindow ? URGENCY_CONFIG[sellWindow.urgency] : null;

  const { data: chartData, windowStartLabel, windowEndLabel, cliffLabel } = asset
    ? buildExtendedChart(asset.currentValue, asset.depreciationCliff.projectedDrop, daysAway)
    : { data: [], windowStartLabel: null, windowEndLabel: null, cliffLabel: "" };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

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

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed top-0 right-0 h-full flex flex-col bg-white overflow-hidden"
            style={{
              zIndex: 51,
              width: "min(500px, 100vw)",
              boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
            }}
            data-testid="asset-drawer"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
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
                onClick={onClose}
                data-testid="btn-close-drawer"
                className="mt-1 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable body ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Current value row */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Current Value</p>
                  <p className="font-poppins font-bold text-3xl text-gray-900">{fmt(currentValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium mb-1">Since Purchase</p>
                  <p className={`text-lg font-bold ${isDown ? "text-red-500" : "text-emerald-500"}`}>
                    {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">{fmt(purchaseValue)} paid</p>
                </div>
              </div>

              {/* ── Best Time to Sell recommendation ─────────────────────── */}
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

                  {sellWindow.urgency === "PLANNED" && (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: urgencyConf.text }}>
                        Ideal listing window opens in{" "}
                        <strong>{sellWindow.daysUntilWindow} days</strong> —
                        sell by <strong>{sellWindow.sellByLabel.replace("Sell by ", "")}</strong> to maximise value.
                      </p>
                      <SellWindowTimeline sellWindow={sellWindow} />
                    </div>
                  )}

                  {sellWindow.urgency === "WINDOW" && (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: urgencyConf.text }}>
                        You're in the optimal sell window right now.{" "}
                        <strong>{sellWindow.daysUntilClose} day{sellWindow.daysUntilClose !== 1 ? "s" : ""} remaining</strong> before it closes.
                        Listing today protects <strong>{fmt(dropDollars)}</strong> in value.
                      </p>
                      <SellWindowTimeline sellWindow={sellWindow} />
                    </div>
                  )}

                  {sellWindow.urgency === "URGENT" && (
                    <p className="text-sm" style={{ color: urgencyConf.text }}>
                      Ideal window has closed — cliff hits in{" "}
                      <strong>{daysAway} day{daysAway !== 1 ? "s" : ""}</strong>.
                      Selling now may still recover most of the <strong>{fmt(dropDollars)}</strong> projected drop.
                    </p>
                  )}

                  {sellWindow.urgency === "CLIFF" && (
                    <p className="text-sm" style={{ color: urgencyConf.text }}>
                      The depreciation event has occurred. Value has dropped approximately{" "}
                      <strong>{fmt(dropDollars)}</strong>. Consider holding for the next cycle.
                    </p>
                  )}
                </div>
              )}

              {/* ── Depreciation warning ──────────────────────────────────── */}
              <div
                className="rounded-xl p-4 flex gap-3"
                style={{
                  backgroundColor: daysAway <= 14 ? "#FEF2F2" : "#FFFBEB",
                  border: `1px solid ${daysAway <= 14 ? "#FECACA" : "#FDE68A"}`,
                }}
              >
                <AlertTriangle
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: daysAway <= 14 ? "#EF4444" : "#F59E0B" }}
                />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: daysAway <= 14 ? "#DC2626" : "#B45309" }}>
                    Value expected to drop {fmt(dropDollars)} in {daysAway} days
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: daysAway <= 14 ? "#EF4444" : "#D97706" }}>
                    Reason: {asset.depreciationCliff.reason}.
                  </p>
                </div>
              </div>

              {/* ── Extended chart with sell window ──────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Price Trajectory</h3>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-red-400 inline-block rounded" />
                      Actual
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-orange-300 inline-block rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg,#f97316 0,#f97316 3px,transparent 3px,transparent 6px)", height: 1 }} />
                      Projected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: "rgba(16,185,129,0.15)" }} />
                      Sell window
                    </span>
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />

                      {/* Sell window highlight — green band */}
                      {windowStartLabel && windowEndLabel && (
                        <ReferenceArea
                          x1={windowStartLabel}
                          x2={windowEndLabel}
                          fill="rgba(16,185,129,0.12)"
                          stroke="rgba(16,185,129,0.4)"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          label={{
                            value: "Sell window",
                            position: "insideTop",
                            fill: "#10B981",
                            fontSize: 9,
                            fontFamily: "Inter",
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {/* If window is open now, shade Today → windowEnd */}
                      {!windowStartLabel && windowEndLabel && (
                        <ReferenceArea
                          x1="Today"
                          x2={windowEndLabel}
                          fill="rgba(16,185,129,0.12)"
                          stroke="rgba(16,185,129,0.4)"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Cliff reference line */}
                      <ReferenceLine
                        x={cliffLabel}
                        stroke="rgba(239,68,68,0.6)"
                        strokeDasharray="4 3"
                        label={{
                          value: "⚠ Cliff",
                          position: "top",
                          fill: "#EF4444",
                          fontSize: 9,
                          fontFamily: "Montserrat",
                          fontWeight: 700,
                        }}
                      />

                      {/* Today divider */}
                      <ReferenceLine
                        x="Today"
                        stroke="rgba(37,99,235,0.3)"
                        strokeDasharray="2 3"
                        label={{
                          value: "Now",
                          position: "top",
                          fill: "#2563EB",
                          fontSize: 9,
                          fontFamily: "Inter",
                        }}
                      />

                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={36}
                        tickFormatter={(v: string) => v.replace(" cliff", "").replace(" ★", "★")}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                        width={46}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip content={<CustomTooltip />} />

                      {/* Historical line — solid red */}
                      <Line
                        data={chartData.filter((p) => !p.projected)}
                        dataKey="price"
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive
                        animationDuration={500}
                        connectNulls
                      />
                      {/* Projected line — dashed orange */}
                      <Line
                        data={chartData}
                        dataKey="price"
                        stroke="#F97316"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={(props: { cx?: number; cy?: number; index?: number }) => {
                          const p = chartData[props.index ?? 0];
                          if (!p?.projected) return <g key={props.index} />;
                          const isCliffPoint = p.label.includes("cliff");
                          const isWindowPoint = p.label.includes("★");
                          if (!isCliffPoint && !isWindowPoint) return <g key={props.index} />;
                          return (
                            <circle
                              key={props.index}
                              cx={props.cx}
                              cy={props.cy}
                              r={isCliffPoint ? 5 : 4}
                              fill={isCliffPoint ? "#EF4444" : "#10B981"}
                              stroke="white"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                        activeDot={{ r: 4 }}
                        isAnimationActive
                        animationDuration={800}
                        animationBegin={200}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Stats grid ────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Calendar className="w-4 h-4 text-blue-500" />}
                  label="Recommended Sell By"
                  value={sellWindow ? sellWindow.sellByLabel : "—"}
                  sub={sellWindow?.urgency === "WINDOW" ? "Window open now" : `Cliff: +${daysAway}d`}
                  valueColor={urgencyConf?.badge ?? "#1F2937"}
                />
                <StatTile
                  icon={<DollarSign className="w-4 h-4 text-red-500" />}
                  label="At-Risk Value"
                  value={fmt(dropDollars)}
                  sub="if you miss the cliff"
                  valueColor="#EF4444"
                />
                <StatTile
                  icon={<TrendingDown className="w-4 h-4 text-gray-400" />}
                  label="Post-Cliff Floor"
                  value={fmt(currentValue - dropDollars)}
                  sub="estimated after drop"
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

              {/* ── Scenario comparison ──────────────────────────────────── */}
              <ScenarioComparison
                currentValue={currentValue}
                dropDollars={dropDollars}
                daysAway={daysAway}
                sellWindow={sellWindow}
              />

              {/* ── Platform estimates ───────────────────────────────────── */}
              <PlatformEstimates
                currentValue={currentValue}
                urgency={sellWindow?.urgency ?? "PLANNED"}
              />

              {/* ── Market demand ─────────────────────────────────────────── */}
              <MarketDemand category={asset.category} daysAway={daysAway} />

            </div>

            {/* ── Sell button ──────────────────────────────────────────────── */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100">
              {isAlreadySold ? (
                <div className="w-full h-14 flex items-center justify-center rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100">
                  {asset.status === "LIQUIDATE" ? "Sale pending…" : "In transit"}
                </div>
              ) : (
                <>
                  <button
                    data-testid="btn-drawer-sell"
                    disabled={sellStage !== "idle"}
                    onClick={handleSell}
                    className="w-full h-14 rounded-xl font-bold text-base tracking-wide transition-all duration-300"
                    style={{
                      backgroundColor:
                        sellStage === "processing" ? "#9CA3AF"
                        : sellStage === "success"  ? "#10B981"
                        : "#10B981",
                      color: "#FFFFFF",
                      boxShadow:
                        sellStage === "success"
                          ? "0 4px 20px rgba(16,185,129,0.45)"
                          : sellStage === "processing"
                          ? "none"
                          : "0 2px 8px rgba(16,185,129,0.25)",
                      cursor: sellStage !== "idle" ? "not-allowed" : "pointer",
                    }}
                  >
                    {sellStage === "processing"
                      ? "PROCESSING..."
                      : sellStage === "success"
                      ? "FUNDS SECURED!"
                      : `SELL NOW TO LOCK IN ${fmt(currentValue)}`}
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
                        Submitting your order…
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sell Window Timeline Bar ──────────────────────────────────────────────────
function SellWindowTimeline({ sellWindow }: { sellWindow: ReturnType<typeof computeSellWindow> }) {
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
          className="absolute top-0 h-full w-0.5 bg-blue-500"
          style={{ left: `${todayPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 font-medium mt-1 px-0.5">
        <span className="text-blue-500">Today</span>
        {sellWindow.windowStartDay > 0 && (
          <span className="text-emerald-600">Window +{sellWindow.windowStartDay}d</span>
        )}
        <span className="text-red-400">Cliff +{cliff}d</span>
      </div>
    </div>
  );
}

// ── Scenario Comparison ───────────────────────────────────────────────────────
function ScenarioComparison({
  currentValue, dropDollars, daysAway, sellWindow,
}: {
  currentValue: number;
  dropDollars: number;
  daysAway: number;
  sellWindow: ReturnType<typeof computeSellWindow> | null;
}) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const urgency   = sellWindow?.urgency ?? "PLANNED";
  const postCliff = Math.max(0, currentValue - dropDollars);
  const lossPct   = currentValue > 0 ? (dropDollars / currentValue) * 100 : 0;
  const dailyCost = daysAway > 0 ? dropDollars / daysAway : dropDollars;

  type Col = {
    title: string; sub: string; value: number;
    color: string; highlight: boolean; dimmed: boolean;
    badge: { text: string; bg: string; color: string } | null;
    pct: number | null;
  };

  const cols: Col[] = [
    {
      title: "Sell Today",
      sub: urgency === "WINDOW"  ? "Window open ✓"
         : urgency === "URGENT"  ? "Act fast"
         : urgency === "CLIFF"   ? "Post-cliff"
         : "Pre-window",
      value: currentValue,
      color: urgency === "WINDOW" ? "#059669" : urgency === "URGENT" ? "#EA580C" : "#1F2937",
      highlight: urgency === "WINDOW" || urgency === "URGENT",
      dimmed: false,
      pct: null,
      badge: urgency === "WINDOW"
        ? { text: "Best time ✓", bg: "#D1FAE5", color: "#065F46" }
        : urgency === "URGENT"
        ? { text: "Act now", bg: "#FFEDD5", color: "#9A3412" }
        : null,
    },
    {
      title: urgency === "PLANNED" ? `+${sellWindow?.daysUntilWindow ?? "?"}d Window` : "Optimal window",
      sub: urgency === "PLANNED" ? "Ideal listing zone"
         : urgency === "WINDOW"  ? "You're here now"
         : "Window closed",
      value: currentValue,
      color: urgency === "PLANNED" ? "#2563EB" : urgency === "WINDOW" ? "#059669" : "#9CA3AF",
      highlight: urgency === "PLANNED",
      dimmed: urgency === "URGENT" || urgency === "CLIFF",
      pct: 0,
      badge: urgency === "PLANNED"
        ? { text: "Recommended", bg: "#DBEAFE", color: "#1D4ED8" }
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
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        Sell Scenario Comparison
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div
            key={col.title}
            className="rounded-xl p-3 border flex flex-col gap-1"
            style={{
              backgroundColor: col.highlight ? "#F0FDF4" : "#F9FAFB",
              borderColor: col.highlight ? "#6EE7B7" : "#E5E7EB",
              opacity: col.dimmed ? 0.5 : 1,
            }}
          >
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">{col.title}</p>
            <p className="font-poppins font-bold text-sm leading-tight" style={{ color: col.color }}>{f(col.value)}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{col.sub}</p>
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
      <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
        Missing the cliff costs approx.{" "}
        <strong className="text-gray-600 font-semibold">{f(dailyCost)}/day</strong> amortised over the window.
      </p>
    </div>
  );
}

// ── Platform Estimates ────────────────────────────────────────────────────────
const PLATFORMS_DATA = [
  { code: "FB", name: "Facebook Marketplace", fee: 0.02,   tag: "No listing fee",     speed: "3–7 days"  },
  { code: "SW", name: "Swappa",               fee: 0.03,   tag: "Electronics only",   speed: "1–3 days"  },
  { code: "eB", name: "eBay",                 fee: 0.1325, tag: "Widest buyer reach",  speed: "3–10 days" },
  { code: "BM", name: "Back Market",          fee: 0.20,   tag: "Certified refurb",   speed: "5–14 days" },
];

function PlatformEstimates({ currentValue, urgency }: { currentValue: number; urgency: UrgencyLevel }) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const ranked = [...PLATFORMS_DATA]
    .map((p) => ({ ...p, net: currentValue * (1 - p.fee) }))
    .sort((a, b) => b.net - a.net);

  const fastCode = urgency === "WINDOW" || urgency === "URGENT" ? "SW" : null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-blue-500" />
        Where to Sell
      </h3>
      <div className="space-y-2">
        {ranked.map((p, i) => {
          const isTop  = i === 0;
          const isFast = p.code === fastCode;
          return (
            <div
              key={p.code}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
              style={{
                backgroundColor: isTop ? "#F0FDF4" : "#FAFAFA",
                borderColor: isTop ? "#A7F3D0" : "#F3F4F6",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                style={{ backgroundColor: isTop ? "#10B981" : "#9CA3AF" }}
              >
                {p.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                  {isTop && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Best $</span>
                  )}
                  {isFast && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Fastest</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{p.tag} · {p.speed}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: isTop ? "#059669" : "#1F2937" }}>{f(p.net)}</p>
                <p className="text-[10px] text-gray-400">{((1 - p.fee) * 100).toFixed(0)}% net</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Market Demand ─────────────────────────────────────────────────────────────
function MarketDemand({ category, daysAway }: { category: string; daysAway: number }) {
  const BASE: Record<string, number> = { Hardware: 7, Optics: 6, Audio: 5 };
  let score = BASE[category] ?? 6;
  if (daysAway <= 7)       score += 2;
  else if (daysAway <= 14) score += 1;
  else if (daysAway >= 60) score -= 2;
  score = Math.min(10, Math.max(1, score));

  const level  = score >= 8 ? "High"   : score >= 5 ? "Moderate" : "Low";
  const color  = score >= 8 ? "#10B981": score >= 5 ? "#F59E0B"  : "#EF4444";
  const bgPill = score >= 8 ? "#D1FAE5": score >= 5 ? "#FEF3C7"  : "#FEE2E2";
  const buyers = score >= 8 ? "100–180": score >= 5 ? "40–80"    : "10–30";
  const trend  = daysAway <= 14 ? "↑ Rising — cliff creates buyer urgency" : daysAway >= 60 ? "→ Stable" : "→ Steady interest";

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Market Demand
        </h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: bgPill }}>
          {level}
        </span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${score * 10}%`, backgroundColor: color, transition: "width 0.8s ease" }}
        />
      </div>
      <p className="text-[11px] text-gray-500 font-medium">{trend}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">~{buyers} active buyers estimated for this category today</p>
    </div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────
function StatTile({
  icon, label, value, sub, valueColor = "#1F2937",
}: { icon: React.ReactNode; label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-2">{icon}</div>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="font-bold text-sm leading-tight" style={{ color: valueColor }}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}
