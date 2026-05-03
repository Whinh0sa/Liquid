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
import { X, AlertTriangle, TrendingDown, Calendar, DollarSign, Clock, CheckCircle, Activity, Zap, ShoppingCart, Users, SlidersHorizontal } from "lucide-react";
import { computeSellWindow, buildExtendedChart, type UrgencyLevel } from "@/lib/sellWindow";

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

export default function AssetDrawer({ asset, onClose, onSell, isSelling }: AssetDrawerProps) {
  type SellStage = "idle" | "processing" | "success";
  const [sellStage, setSellStage] = useState<SellStage>("idle");
  const [sellOffsetDays, setSellOffsetDays] = useState(0);
  const [condition, setCondition] = useState<ConditionKey>("good");
  const [floorPrice, setFloorPrice] = useState(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => { setSellStage("idle"); }, [asset?.id]);
  useEffect(() => { setSellOffsetDays(0); }, [asset?.id]);
  useEffect(() => { setCondition("good"); }, [asset?.id]);
  useEffect(() => { setFloorPrice(asset ? Math.round((asset.currentValue / 100) * 0.9) : 0); }, [asset?.id]);
  useEffect(() => { setAlertMessage(null); }, [asset?.id]);

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
      const t2 = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(t2);
    }, 1200);
    return () => clearTimeout(t1);
  }, [asset, sellStage, onSell, onClose]);

  const handleSaveAlert = async () => {
    if (!asset || floorPrice <= 0) return;
    const res = await fetch(`${import.meta.env.BASE_URL}api/price-alerts/${asset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPrice }),
    });
    if (!res.ok) {
      setAlertMessage("Could not save alert.");
      return;
    }
    setAlertMessage(`Alert saved at ${fmt(floorPrice)}.`);
  };

  const handleClearAlert = async () => {
    if (!asset) return;
    await fetch(`${import.meta.env.BASE_URL}api/price-alerts/${asset.id}`, { method: "DELETE" });
    setAlertMessage("Alert cleared.");
  };

  const currentValue  = asset ? asset.currentValue / 100 : 0;
  const purchaseValue = asset ? asset.purchasePrice / 100 : 0;
  const dropDollars   = asset ? asset.depreciationCliff.projectedDrop / 100 : 0;
  const daysAway      = asset?.depreciationCliff.daysAway ?? 0;
  const totalPnl      = ((currentValue - purchaseValue) / purchaseValue) * 100;
  const isDown        = totalPnl < 0;
  const isAlreadySold = asset?.status === "LIQUIDATE" || asset?.status === "IN_TRANSIT";
  const conditionMultiplier    = CONDITIONS[condition].multiplier;
  const conditionAdjustedValue = currentValue * conditionMultiplier;
  const dailyDecayRate = daysAway > 0 ? dropDollars / daysAway : 0;
  const simulatedDaysAway = Math.max(0, daysAway - sellOffsetDays);
  const simulatedDropAtSell = Math.min(dropDollars, dailyDecayRate * sellOffsetDays);
  const simulatedValue = Math.max(0, currentValue - simulatedDropAtSell);
  const simulatedLoss = Math.max(0, currentValue - simulatedValue);
  const simulatedDrop = Math.max(0, dropDollars - simulatedDropAtSell);

  const sellWindow = asset ? computeSellWindow(daysAway, dropDollars) : null;
  const simulatedWindow = asset ? computeSellWindow(simulatedDaysAway, simulatedDrop) : null;
  const urgencyConf = sellWindow ? URGENCY_CONFIG[sellWindow.urgency] : null;

  const { data: chartData, windowStartLabel, windowEndLabel, cliffLabel } = asset
    ? buildExtendedChart(asset.currentValue, asset.depreciationCliff.projectedDrop, daysAway)
    : { data: [], windowStartLabel: null, windowEndLabel: null, cliffLabel: "" };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

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
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Current Value</p>
                  <p className="font-poppins font-bold text-3xl text-gray-900">{fmt(currentValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium mb-1">Since Purchase</p>
                  <p className={`text-lg font-bold ${isDown ? "text-red-500" : "text-emerald-500"}`}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">{fmt(purchaseValue)} paid</p>
                </div>
              </div>
              {sellWindow && urgencyConf && (
                <div className="rounded-xl p-4" style={{ backgroundColor: urgencyConf.bg, border: `1px solid ${urgencyConf.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" style={{ color: urgencyConf.badge }} /><span className="text-sm font-bold" style={{ color: urgencyConf.text }}>Best Time to Sell</span></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ color: urgencyConf.badge, backgroundColor: urgencyConf.badgeBg }}>{urgencyConf.label}</span>
                  </div>
                </div>
              )}
              <div className="rounded-xl p-4 flex gap-3" style={{ backgroundColor: daysAway <= 14 ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${daysAway <= 14 ? "#FECACA" : "#FDE68A"}` }}>
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: daysAway <= 14 ? "#EF4444" : "#F59E0B" }} />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: daysAway <= 14 ? "#DC2626" : "#B45309" }}>Value expected to drop {fmt(dropDollars)} in {daysAway} days</p>
                  <p className="text-xs leading-relaxed" style={{ color: daysAway <= 14 ? "#EF4444" : "#D97706" }}>Reason: {asset.depreciationCliff.reason}.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Price Alert</h3>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">Saved in DB</span>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Floor price</label>
                  <input type="number" value={floorPrice} onChange={(e) => setFloorPrice(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveAlert} disabled={!asset} className="flex-1 h-11 rounded-xl font-semibold text-white bg-blue-600 disabled:opacity-50">Save alert</button>
                    <button type="button" onClick={handleClearAlert} className="h-11 px-4 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200">Clear</button>
                  </div>
                  {alertMessage && <p className="text-xs text-emerald-600">{alertMessage}</p>}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 border-t border-gray-100">
              {isAlreadySold ? (
                <div className="w-full h-14 flex items-center justify-center rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100">{asset.status === "LIQUIDATE" ? "Sale pending…" : "In transit"}</div>
              ) : (
                <>
                  <button data-testid="btn-drawer-sell" disabled={sellStage !== "idle"} onClick={handleSell} className="w-full h-14 rounded-xl font-bold text-base tracking-wide transition-all duration-300" style={{ backgroundColor: sellStage === "processing" ? "#9CA3AF" : sellStage === "success" ? "#10B981" : "#10B981", color: "#FFFFFF", boxShadow: sellStage === "success" ? "0 4px 20px rgba(16,185,129,0.45)" : sellStage === "processing" ? "none" : "0 2px 8px rgba(16,185,129,0.25)", cursor: sellStage !== "idle" ? "not-allowed" : "pointer" }}>{sellStage === "processing" ? "PROCESSING..." : sellStage === "success" ? "FUNDS SECURED!" : `SELL NOW · ${fmt(conditionAdjustedValue)}`}</button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const CONDITIONS = {
  mint: { label: "Mint", sub: "Like new — original box, no marks", multiplier: 1.00, color: "#10B981", bg: "#F0FDF4", border: "#6EE7B7" },
  good: { label: "Good", sub: "Minor wear — fully functional", multiplier: 0.92, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  fair: { label: "Fair", sub: "Visible scratches — works perfectly", multiplier: 0.78, color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  poor: { label: "Poor", sub: "Heavy wear or cosmetic damage", multiplier: 0.60, color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
} as const;
type ConditionKey = keyof typeof CONDITIONS;
