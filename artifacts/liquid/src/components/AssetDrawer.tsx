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
} from "recharts";
import { X, AlertTriangle, TrendingDown, Calendar, DollarSign } from "lucide-react";

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

// ── Price history — derived from the depreciation data ───────────────────────
// Generates a simple 4-point history matching the user's sample data format
function buildPriceHistory(asset: Asset): { time: string; price: number }[] {
  const current = asset.currentValue / 100;
  const drop = asset.depreciationCliff.projectedDrop / 100;
  // Work backwards: each week was slightly higher before the slide began
  const weeklyDrift = drop / 4; // spread projected drop evenly across 4 weeks
  return [
    { time: "Last Month",     price: parseFloat((current + weeklyDrift * 3.2).toFixed(2)) },
    { time: "Two Weeks Ago",  price: parseFloat((current + weeklyDrift * 2.1).toFixed(2)) },
    { time: "Last Week",      price: parseFloat((current + weeklyDrift * 0.9).toFixed(2)) },
    { time: "Today",          price: current },
  ];
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {payload[0].value.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </p>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function AssetDrawer({ asset, onClose, onSell, isSelling }: AssetDrawerProps) {
  const [confirming, setConfirming] = useState(false);

  // Reset confirm state when a different asset is opened
  useEffect(() => { setConfirming(false); }, [asset?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSell = useCallback(() => {
    if (!asset) return;
    if (!confirming) { setConfirming(true); return; }
    onSell(asset.id);
    onClose();
  }, [asset, confirming, onSell, onClose]);

  const history = asset ? buildPriceHistory(asset) : [];
  const currentValue = asset ? asset.currentValue / 100 : 0;
  const projectedDrop = asset ? asset.depreciationCliff.projectedDrop / 100 : 0;
  const postCliffValue = currentValue - projectedDrop;
  const purchaseValue = asset ? asset.purchasePrice / 100 : 0;
  const totalPnl = ((currentValue - purchaseValue) / purchaseValue) * 100;
  const isDown = totalPnl < 0;
  const daysAway = asset?.depreciationCliff.daysAway ?? 0;
  const isUrgent = daysAway <= 14;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const isAlreadySold = asset?.status === "LIQUIDATE" || asset?.status === "IN_TRANSIT";

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
              width: "min(480px, 100vw)",
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
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Current value + P&L row */}
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

              {/* ── Warning box ──────────────────────────────────────────── */}
              <div
                className="rounded-xl p-4 flex gap-3"
                style={{ backgroundColor: isUrgent ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${isUrgent ? "#FECACA" : "#FDE68A"}` }}
              >
                <AlertTriangle
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: isUrgent ? "#EF4444" : "#F59E0B" }}
                />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: isUrgent ? "#DC2626" : "#B45309" }}>
                    Value expected to drop {fmt(projectedDrop)} in {daysAway} days
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: isUrgent ? "#EF4444" : "#D97706" }}>
                    Reason: {asset.depreciationCliff.reason}. After this event, estimated resale value drops to approximately <strong>{fmt(postCliffValue)}</strong>.
                  </p>
                </div>
              </div>

              {/* ── Price history chart ──────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Price History</h3>
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Declining trend
                  </span>
                </div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                        width={46}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine
                        y={postCliffValue}
                        stroke="#EF4444"
                        strokeDasharray="4 3"
                        strokeOpacity={0.5}
                        label={{
                          value: "Post-cliff floor",
                          position: "insideTopRight",
                          fill: "#EF4444",
                          fontSize: 9,
                          fontFamily: "Inter",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#EF4444" }}
                        isAnimationActive
                        animationDuration={600}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Stats grid ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<DollarSign className="w-4 h-4 text-blue-500" />}
                  label="Post-Cliff Floor"
                  value={fmt(postCliffValue)}
                  sub="estimated floor value"
                />
                <StatTile
                  icon={<Calendar className="w-4 h-4 text-amber-500" />}
                  label="Days to Cliff"
                  value={`${daysAway} days`}
                  sub={isUrgent ? "Act soon" : "Monitor closely"}
                  valueColor={isUrgent ? "#EF4444" : "#F59E0B"}
                />
                <StatTile
                  icon={<TrendingDown className="w-4 h-4 text-red-500" />}
                  label="Projected Drop"
                  value={fmt(projectedDrop)}
                  sub={`${((projectedDrop / currentValue) * 100).toFixed(1)}% of current value`}
                  valueColor="#EF4444"
                />
                <StatTile
                  icon={<DollarSign className="w-4 h-4 text-blue-500" />}
                  label="Purchase Price"
                  value={fmt(purchaseValue)}
                  sub="original cost"
                />
              </div>

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
                    disabled={isSelling}
                    onClick={handleSell}
                    className="w-full h-14 rounded-xl text-white font-bold text-base tracking-wide transition-all duration-150"
                    style={{
                      backgroundColor: confirming ? "#059669" : "#10B981",
                      boxShadow: confirming
                        ? "0 4px 20px rgba(5,150,105,0.4)"
                        : "0 2px 8px rgba(16,185,129,0.25)",
                    }}
                  >
                    {isSelling
                      ? "Processing…"
                      : confirming
                      ? `✓ Confirm — Lock in ${fmt(currentValue)}`
                      : `SELL NOW TO LOCK IN ${fmt(currentValue)}`}
                  </button>
                  {confirming && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs text-gray-400 mt-2"
                    >
                      Tap again to confirm. This will execute a market sale.
                    </motion.p>
                  )}
                  {!confirming && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      Avoid the projected {fmt(projectedDrop)} loss — sell before the cliff.
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
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
