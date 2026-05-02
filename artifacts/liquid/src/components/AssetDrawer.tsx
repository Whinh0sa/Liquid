import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { X, AlertTriangle, TrendingDown, Clock, DollarSign, Zap } from "lucide-react";

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
  onLiquidate: (id: string) => void;
  isLiquidating: boolean;
}

// ── Depreciation Curve Math ───────────────────────────────────────────────────
// Models two phases:
//   Phase 1 (days -14 → cliffDay-1): Slow daily bleed (~0.15%/day) + noise
//   Phase 2 (cliffDay): Sharp event-driven drop (projectedDrop)
//   Phase 3 (cliffDay+1 → cliffDay+7): Stabilisation at new floor
function buildDepreciationCurve(
  currentValueCents: number,
  projectedDropCents: number,
  daysAway: number,
): { day: string; value: number; isHistorical: boolean; isCliff: boolean }[] {
  const current = currentValueCents / 100;
  const dropAmount = projectedDropCents / 100;
  const dailyBleed = 0.0015; // 0.15% per day
  const points: { day: string; value: number; isHistorical: boolean; isCliff: boolean }[] = [];

  // ── Historical: 14 days back ──────────────────────────────────────────────
  const seed = currentValueCents % 997; // deterministic "random" from asset value
  for (let d = -14; d <= 0; d++) {
    const drift = 1 + dailyBleed * 1.2 * (1 - d / -14); // slightly higher in older history
    const noise = (((seed * (d + 20)) % 41) - 20) / 10000; // ±0.2% deterministic noise
    const historicalMultiplier = Math.pow(1 + dailyBleed + noise, -d);
    const value = parseFloat((current * historicalMultiplier * drift).toFixed(2));
    points.push({ day: d === 0 ? "Today" : `${Math.abs(d)}d ago`, value, isHistorical: true, isCliff: false });
  }

  // ── Projection: today → cliff day ─────────────────────────────────────────
  const cliffCapped = Math.min(daysAway, 21); // render max 21 future days
  for (let d = 1; d <= cliffCapped; d++) {
    const noise = (((seed * (d + 100)) % 31) - 15) / 10000;
    const prevValue = points[points.length - 1].value;
    const isCliff = d === daysAway;
    let value: number;
    if (isCliff) {
      value = parseFloat((prevValue * (1 - dailyBleed + noise) - dropAmount).toFixed(2));
    } else {
      value = parseFloat((prevValue * (1 - dailyBleed + noise)).toFixed(2));
    }
    points.push({ day: `+${d}d`, value: Math.max(value, 0), isHistorical: false, isCliff });
  }

  // ── Post-cliff stabilisation: 7 days ─────────────────────────────────────
  if (daysAway <= 21) {
    for (let d = 1; d <= 7; d++) {
      const noise = (((seed * (d + 200)) % 21) - 10) / 10000;
      const prevValue = points[points.length - 1].value;
      const value = parseFloat((prevValue * (1 - dailyBleed * 0.3 + noise)).toFixed(2));
      points.push({ day: `+${daysAway + d}d`, value: Math.max(value, 0), isHistorical: false, isCliff: false });
    }
  }

  return points;
}

// ── Historical price rows for table ──────────────────────────────────────────
function buildHistoricalRows(currentValueCents: number, seed: number) {
  const current = currentValueCents / 100;
  const rows = [];
  const now = new Date();
  for (let d = 7; d >= 0; d--) {
    const noise = (((seed * (d + 50)) % 61) - 30) / 10000;
    const mult = Math.pow(1.0015 + noise, d);
    const close = parseFloat((current * mult).toFixed(2));
    const prev = d < 7
      ? parseFloat((current * Math.pow(1.0015 + (((seed * (d + 51)) % 61) - 30) / 10000, d + 1)).toFixed(2))
      : close * 1.001;
    const change = close - prev;
    const date = new Date(now);
    date.setDate(now.getDate() - d);
    rows.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      open: parseFloat((close * 1.002).toFixed(2)),
      high: parseFloat((close * 1.005).toFixed(2)),
      low: parseFloat((close * 0.997).toFixed(2)),
      close,
      change,
    });
  }
  return rows.reverse();
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="font-inter text-xs px-3 py-2 rounded-sm"
      style={{ backgroundColor: "#0D0D0F", border: "1px solid rgba(145,38,239,0.4)" }}
    >
      <div className="text-[#9126EF]/70 mb-1">{label}</div>
      <div className="text-white font-bold">
        {payload[0].value.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </div>
    </div>
  );
}

// ── HFT Execution Simulation ───────────────────────────────────────────────────
function useHFTEffect(active: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (!active) { setLines([]); return; }
    const exchanges = ["NASDAQ", "NYSE", "CBOE", "ARCA", "BATS", "IEX"];
    const statuses = ["ROUTING", "MATCHING", "FILLED", "PARTIAL", "CONFIRMED"];
    let i = 0;
    const iv = setInterval(() => {
      const ex = exchanges[i % exchanges.length];
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const qty = Math.floor(Math.random() * 90 + 10);
      const px = (Math.random() * 0.002 + 0.999).toFixed(4);
      setLines((prev) => [`[${ex}] ${st} ${qty}u @ ${px}`, ...prev].slice(0, 6));
      i++;
    }, 80);
    return () => clearInterval(iv);
  }, [active]);
  return lines;
}

// ── Main Drawer Component ──────────────────────────────────────────────────────
export default function AssetDrawer({ asset, onClose, onLiquidate, isLiquidating }: AssetDrawerProps) {
  const [hoveringLiquidate, setHoveringLiquidate] = useState(false);
  const [executing, setExecuting] = useState(false);
  const hftLines = useHFTEffect(hoveringLiquidate || executing);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleLiquidate = useCallback(() => {
    if (!asset || executing) return;
    setExecuting(true);
    setTimeout(() => {
      onLiquidate(asset.id);
      setExecuting(false);
      onClose();
    }, 1200);
  }, [asset, executing, onLiquidate, onClose]);

  const curve = asset ? buildDepreciationCurve(
    asset.currentValue,
    asset.depreciationCliff.projectedDrop,
    asset.depreciationCliff.daysAway,
  ) : [];

  const historicalRows = asset ? buildHistoricalRows(asset.currentValue, asset.currentValue % 997) : [];
  const cliffIndex = curve.findIndex((p) => p.isCliff);
  const cliffDayLabel = cliffIndex >= 0 ? curve[cliffIndex].day : null;

  const currentDollars = asset ? asset.currentValue / 100 : 0;
  const purchaseDollars = asset ? asset.purchasePrice / 100 : 0;
  const pnlPct = purchaseDollars > 0 ? ((currentDollars - purchaseDollars) / purchaseDollars) * 100 : 0;
  const projectedFloor = asset ? Math.max(0, currentDollars - asset.depreciationCliff.projectedDrop / 100) : 0;
  const riskPct = currentDollars > 0 ? (asset!.depreciationCliff.projectedDrop / 100 / currentDollars) * 100 : 0;
  const isUrgent = asset ? asset.depreciationCliff.daysAway <= 14 : false;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

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
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            style={{ zIndex: 50 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed top-0 right-0 h-full flex flex-col overflow-hidden"
            style={{
              zIndex: 51,
              width: "min(520px, 100vw)",
              backgroundColor: "#0B0B0B",
              borderLeft: "2px solid #9126EF",
              boxShadow: "-8px 0 40px rgba(145,38,239,0.25)",
            }}
            data-testid="asset-drawer"
          >
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div
              className="flex items-start justify-between px-6 pt-6 pb-5 shrink-0"
              style={{ borderBottom: "1px solid rgba(145,38,239,0.25)" }}
            >
              <div>
                <p className="font-montserrat text-[10px] uppercase tracking-[0.2em] text-[#9126EF]/60 mb-1">
                  {asset.category} · {asset.id}
                </p>
                <h2 className="font-poppins font-bold text-xl text-white leading-tight">
                  {asset.model}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="mt-1 p-1.5 rounded-sm hover:bg-[#9126EF]/10 transition-colors"
                data-testid="btn-close-drawer"
                style={{ color: "rgba(145,38,239,0.6)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable body ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Key metrics row */}
              <div className="grid grid-cols-3 gap-3">
                <MetricTile
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  label="Current Value"
                  value={fmt(currentDollars)}
                  valueColor="#ffffff"
                />
                <MetricTile
                  icon={<TrendingDown className="w-3.5 h-3.5" />}
                  label="Total P&L"
                  value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                  valueColor={pnlPct >= 0 ? "#32CD32" : "#ef4444"}
                />
                <MetricTile
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Cliff In"
                  value={`${asset.depreciationCliff.daysAway}d`}
                  valueColor={isUrgent ? "#ef4444" : "#f59e0b"}
                />
              </div>

              {/* Depreciation Risk block */}
              <div
                className="rounded-sm p-4"
                style={{
                  backgroundColor: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-montserrat text-xs font-bold uppercase tracking-wider text-red-400">
                    Depreciation Risk Analysis
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  <RiskRow label="Trigger Event" value={asset.depreciationCliff.reason} />
                  <RiskRow label="Days to Cliff" value={`${asset.depreciationCliff.daysAway} days`} urgent={isUrgent} />
                  <RiskRow label="Projected Drop" value={fmt(asset.depreciationCliff.projectedDrop / 100)} urgent />
                  <RiskRow label="% Capital at Risk" value={`${riskPct.toFixed(1)}%`} urgent={riskPct > 10} />
                  <RiskRow label="Post-Cliff Floor" value={fmt(projectedFloor)} />
                  <RiskRow label="Arbitrage Window" value={`${Math.max(0, asset.depreciationCliff.daysAway - 1)}d remaining`} urgent={isUrgent} />
                </div>
              </div>

              {/* Depreciation Cliff Chart */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-[#9126EF]/70" />
                  <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#9126EF]/80">
                    14-Day Depreciation Projection
                  </span>
                </div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curve} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(145,38,239,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "rgba(145,38,239,0.4)", fontSize: 9, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fill: "rgba(145,38,239,0.4)", fontSize: 9, fontFamily: "Inter" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                        width={42}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {cliffDayLabel && (
                        <ReferenceLine
                          x={cliffDayLabel}
                          stroke="rgba(239,68,68,0.6)"
                          strokeDasharray="4 3"
                          label={{
                            value: "CLIFF",
                            position: "top",
                            fill: "rgba(239,68,68,0.8)",
                            fontSize: 8,
                            fontFamily: "Montserrat",
                            fontWeight: 700,
                          }}
                        />
                      )}
                      {/* Historical segment: solid purple */}
                      <Line
                        data={curve.filter((p) => p.isHistorical)}
                        dataKey="value"
                        stroke="#9126EF"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, fill: "#9126EF" }}
                        isAnimationActive
                        animationDuration={600}
                        connectNulls
                      />
                      {/* Projected segment: dashed red-to-purple gradient via stroke */}
                      <Line
                        dataKey="value"
                        stroke="rgba(239,68,68,0.85)"
                        strokeWidth={2}
                        strokeDasharray="0"
                        dot={(props: { cx?: number; cy?: number; index?: number }) => {
                          const point = curve[props.index ?? 0];
                          if (!point?.isCliff) return <g key={props.index} />;
                          return (
                            <circle
                              key={props.index}
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="#ef4444"
                              stroke="#0B0B0B"
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={{ r: 3, fill: "#ef4444" }}
                        isAnimationActive
                        animationDuration={900}
                        animationBegin={200}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <LegendItem color="#9126EF" label="Historical" />
                  <LegendItem color="#ef4444" label="Projected" dashed={false} />
                  <LegendItem color="rgba(239,68,68,0.5)" label="Cliff Event" dashed />
                </div>
              </div>

              {/* Historical Price Table */}
              <div>
                <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#9126EF]/70 block mb-3">
                  Historical Price Data — Last 8 Sessions
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-inter text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(145,38,239,0.25)" }}>
                        {["Date", "Open", "High", "Low", "Close", "Chg"].map((h) => (
                          <th
                            key={h}
                            className="font-montserrat text-[9px] uppercase text-[#9126EF]/50 pb-2 font-semibold tracking-wider text-right first:text-left"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historicalRows.map((row, i) => (
                        <tr
                          key={i}
                          className="transition-colors hover:bg-[#9126EF]/5"
                          style={{ borderBottom: "1px solid rgba(145,38,239,0.1)" }}
                          data-testid={`row-history-${i}`}
                        >
                          <td className="py-2 text-gray-400 text-left">{row.date}</td>
                          <td className="py-2 text-gray-300 text-right">{fmt(row.open)}</td>
                          <td className="py-2 text-right" style={{ color: "#32CD32" }}>{fmt(row.high)}</td>
                          <td className="py-2 text-red-400 text-right">{fmt(row.low)}</td>
                          <td className="py-2 text-white font-medium text-right">{fmt(row.close)}</td>
                          <td
                            className="py-2 font-bold text-right"
                            style={{ color: row.change >= 0 ? "#32CD32" : "#ef4444" }}
                          >
                            {row.change >= 0 ? "+" : ""}{fmt(row.change)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ── HFT execution console (visible on hover / executing) ───────── */}
            <AnimatePresence>
              {(hoveringLiquidate || executing) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden shrink-0"
                  style={{ borderTop: "1px solid rgba(145,38,239,0.2)" }}
                >
                  <div className="px-6 py-3 font-mono text-[10px] space-y-0.5" style={{ backgroundColor: "#070709" }}>
                    <div className="text-[#9126EF]/40 uppercase tracking-widest mb-1 font-sans font-montserrat text-[9px]">
                      ▶ EXECUTION ENGINE
                    </div>
                    {hftLines.map((line, i) => (
                      <div
                        key={i}
                        className="leading-tight"
                        style={{
                          color: line.includes("FILLED") || line.includes("CONFIRMED")
                            ? "#32CD32"
                            : line.includes("PARTIAL")
                            ? "#f59e0b"
                            : "rgba(145,38,239,0.7)",
                          opacity: 1 - i * 0.12,
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── LIQUIDATE NOW button ───────────────────────────────────────── */}
            <div
              className="px-6 pb-6 pt-4 shrink-0"
              style={{ borderTop: "1px solid rgba(145,38,239,0.2)" }}
            >
              {asset.status === "LIQUIDATE" || asset.status === "IN_TRANSIT" ? (
                <div
                  className="w-full h-14 flex items-center justify-center font-montserrat uppercase text-sm font-bold tracking-widest rounded-none"
                  style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.05)" }}
                >
                  {asset.status === "LIQUIDATE" ? "Pending Liquidation…" : "In Transit"}
                </div>
              ) : (
                <button
                  data-testid="btn-drawer-liquidate"
                  disabled={isLiquidating || executing}
                  onClick={handleLiquidate}
                  onMouseEnter={() => setHoveringLiquidate(true)}
                  onMouseLeave={() => setHoveringLiquidate(false)}
                  className="w-full h-14 font-montserrat uppercase font-bold tracking-widest text-sm transition-all duration-150 rounded-none relative overflow-hidden"
                  style={{
                    backgroundColor: executing ? "#28b828" : "#32CD32",
                    color: "#0B0B0B",
                    boxShadow: hoveringLiquidate || executing
                      ? "0 0 0 4px rgba(50,205,50,0), 0 0 32px rgba(50,205,50,0.6), inset 0 0 20px rgba(255,255,255,0.1)"
                      : "0 0 0 0 rgba(50,205,50,0.45), 0 0 12px rgba(50,205,50,0.25)",
                    animation: executing ? "none" : "lime-pulse 2s ease-in-out infinite",
                  }}
                >
                  {executing ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.4 }}
                      >
                        ●
                      </motion.span>
                      EXECUTING ORDER…
                    </span>
                  ) : hoveringLiquidate ? (
                    "⚡ CONFIRM LIQUIDATION"
                  ) : (
                    "LIQUIDATE NOW"
                  )}
                </button>
              )}
              <p className="font-inter text-[10px] text-center mt-2.5 text-[#9126EF]/30 leading-tight">
                Executes market order via best-route algorithm. Slippage ±0.05% max.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricTile({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-sm"
      style={{ backgroundColor: "#0D0D0F", border: "1px solid rgba(145,38,239,0.2)" }}
    >
      <div className="flex items-center gap-1.5 text-[#9126EF]/50">{icon}</div>
      <span className="font-montserrat text-[9px] uppercase tracking-wider text-[#9126EF]/50">{label}</span>
      <span className="font-poppins font-bold text-sm leading-none" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

function RiskRow({ label, value, urgent = false }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-montserrat text-[9px] uppercase tracking-wider text-[#9126EF]/50">{label}</span>
      <span
        className="font-inter text-xs font-semibold"
        style={{ color: urgent ? "#ef4444" : "rgba(255,255,255,0.8)" }}
      >
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-8 h-px" style={{ backgroundColor: dashed ? "transparent" : color }}>
        {dashed && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${color} 0, ${color} 4px, transparent 4px, transparent 7px)`,
              height: "1px",
            }}
          />
        )}
      </div>
      <span className="font-inter text-[9px] uppercase tracking-wider" style={{ color: "rgba(145,38,239,0.5)" }}>
        {label}
      </span>
    </div>
  );
}
