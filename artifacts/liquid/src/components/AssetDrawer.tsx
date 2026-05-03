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

  useEffect(() => { setSellStage("idle"); }, [asset?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && sellStage === "idle") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, sellStage]);

  const handleSell = useCallback(() => {
    if (!asset || sellStage !== "idle") return;
    setSellStage("processing");
    const t1 = setTimeout(() => {
      onSell(asset.id);
      setSellStage("success");
      const t2 = setTimeout(() => { onClose(); }, 2000);
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

  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const riskScore = Math.max(0, Math.min(100, 100 - Math.round(daysAway * 2) - Math.round(dropDollars / 1000)));
  const riskLabel = riskScore >= 80 ? "Low risk" : riskScore >= 55 ? "Moderate" : "Elevated";
  const demand = asset ? Math.min(10, Math.max(1, Math.round(10 - daysAway / 8 + (asset.category === "Hardware" ? 1 : asset.category === "Audio" ? 0 : -1)))) : 5;

  return (
    <AnimatePresence>
      {asset && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30" style={{ zIndex: 50 }} onClick={onClose} />
          <motion.div key="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="fixed top-0 right-0 h-full flex flex-col bg-white overflow-hidden" style={{ zIndex: 51, width: "min(500px, 100vw)", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }} data-testid="asset-drawer">
            <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{asset.category}</p>
                <h2 className="font-poppins font-bold text-xl text-gray-900 leading-tight">{asset.model}</h2>
              </div>
              <button onClick={onClose} data-testid="btn-close-drawer" className="mt-1 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-end justify-between">
                <div><p className="text-xs text-gray-400 font-medium mb-1">Current Value</p><p className="font-poppins font-bold text-3xl text-gray-900">{f(currentValue)}</p></div>
                <div className="text-right"><p className="text-xs text-gray-400 font-medium mb-1">Since Purchase</p><p className={`text-lg font-bold ${isDown ? "text-red-500" : "text-emerald-500"}`}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}%</p><p className="text-xs text-gray-400">{f(purchaseValue)} paid</p></div>
              </div>

              <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /><span className="text-sm font-bold text-blue-700">Portfolio health score</span></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white text-gray-700 border border-blue-100">{riskLabel}</span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Grade</p><p className="font-poppins font-bold text-3xl" style={{ color: riskScore >= 80 ? "#10B981" : riskScore >= 55 ? "#F59E0B" : "#EF4444" }}>{riskScore >= 80 ? "A" : riskScore >= 55 ? "B" : "C"}</p></div>
                  <div className="flex-1"><div className="h-2 rounded-full bg-white overflow-hidden border border-blue-100"><div className="h-full rounded-full" style={{ width: `${riskScore}%`, backgroundColor: riskScore >= 80 ? "#10B981" : riskScore >= 55 ? "#F59E0B" : "#EF4444" }} /></div><p className="text-xs text-blue-700 mt-2">{daysAway} days to cliff · {f(dropDollars)} at risk</p></div>
                </div>
              </div>

              <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-gray-700">Market pulse</span></div><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: demand >= 8 ? "#D1FAE5" : demand >= 5 ? "#FEF3C7" : "#FEE2E2", color: demand >= 8 ? "#065F46" : demand >= 5 ? "#92400E" : "#991B1B" }}>{demand >= 8 ? "High" : demand >= 5 ? "Medium" : "Low"}</span></div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2"><div className="h-full rounded-full" style={{ width: `${demand * 10}%`, backgroundColor: demand >= 8 ? "#10B981" : demand >= 5 ? "#F59E0B" : "#EF4444" }} /></div>
                <p className="text-[11px] text-gray-500">Estimated buyer interest is <strong className="text-gray-700">{demand}/10</strong> right now.</p>
              </div>

              {/* existing content continues below */}

              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-emerald-800">Next best action</span><span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-emerald-700 border border-emerald-200">{sellWindow?.urgency ?? "PLANNED"}</span></div>
                <p className="text-sm text-emerald-700">{sellWindow?.sellByLabel ?? "—"}</p>
                <p className="text-xs text-emerald-600 mt-1">If you wait, expected value falls to {f(currentValue - dropDollars)}.</p>
              </div>

              <div className="rounded-xl p-4 bg-red-50 border border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold text-red-700">Risk signal</span></div>
                <span className="text-sm font-bold text-red-600">{f(dropDollars)} at risk</span>
              </div>

              {/* ── Sell button ──────────────────────────────────────────────── */}
              <div className="px-0 pb-6 pt-2 border-t border-gray-100">
                {isAlreadySold ? (
                  <div className="w-full h-14 flex items-center justify-center rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100">{asset.status === "LIQUIDATE" ? "Sale pending…" : "In transit"}</div>
                ) : (
                  <>
                    <button data-testid="btn-drawer-sell" disabled={sellStage !== "idle"} onClick={handleSell} className="w-full h-14 rounded-xl font-bold text-base tracking-wide transition-all duration-300" style={{ backgroundColor: sellStage === "processing" ? "#9CA3AF" : sellStage === "success" ? "#10B981" : "#10B981", color: "#FFFFFF", boxShadow: sellStage === "success" ? "0 4px 20px rgba(16,185,129,0.45)" : sellStage === "processing" ? "none" : "0 2px 8px rgba(16,185,129,0.25)", cursor: sellStage !== "idle" ? "not-allowed" : "pointer" }}>{sellStage === "processing" ? "PROCESSING..." : sellStage === "success" ? "FUNDS SECURED!" : `SELL NOW TO LOCK IN ${f(currentValue)}`}</button>
                    <AnimatePresence mode="wait">{sellStage === "success" ? <motion.p key="success-msg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-center text-xs text-emerald-600 font-semibold mt-2">Sale confirmed — funds will be transferred within 1–2 business days.</motion.p> : sellStage === "processing" ? <motion.p key="processing-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-gray-400 mt-2">Submitting your order…</motion.p> : <motion.p key="idle-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-gray-400 mt-2">Avoid the projected {f(dropDollars)} loss by selling in window.</motion.p>}</AnimatePresence>
                  </>
                )}
              </div>
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
        <div className="absolute top-0 h-full rounded-full" style={{ left: `${windowStartPct}%`, width: `${Math.max(windowWidthPct, 2)}%`, backgroundColor: "rgba(16,185,129,0.35)" }} />
        <div className="absolute top-0 h-full" style={{ left: `${cliffPct}%`, width: `${100 - cliffPct}%`, backgroundColor: "rgba(239,68,68,0.2)" }} />
        <div className="absolute top-0 h-full w-0.5 bg-blue-500" style={{ left: `${todayPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 font-medium mt-1 px-0.5"><span className="text-blue-500">Today</span>{sellWindow.windowStartDay > 0 && <span className="text-emerald-600">Window +{sellWindow.windowStartDay}d</span>}<span className="text-red-400">Cliff +{cliff}d</span></div>
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
