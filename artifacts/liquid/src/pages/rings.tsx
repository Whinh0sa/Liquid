import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Award,
} from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";
import AppLayout from "@/components/AppLayout";
import AssetDrawer from "@/components/AssetDrawer";
import { formatCurrencyWhole } from "@/lib/currency";
import { computePortfolioHealth } from "@/lib/portfolioHealth";
import { URGENCY_PILL } from "@/lib/urgency";
import AssetImage from "@/components/ui/AssetImage";
import { useToast } from "@/hooks/use-toast";

export default function Rings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });
  const portfolio = data?.portfolio ?? [];

  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const updateStatusMutation = useUpdateAssetStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        toast({
          title: "Asset status updated",
          description: "Portfolio health scores re-calculated.",
        });
        setSelectedAsset(null);
      },
    },
  });

  const healthScore = useMemo(() => computePortfolioHealth(portfolio), [portfolio]);

  const totalAtRisk = useMemo(
    () => portfolio.reduce((s: number, a) => s + a.depreciationCliff.projectedDrop / 100, 0),
    [portfolio],
  );

  const totalValue = useMemo(
    () => portfolio.reduce((s: number, a) => s + a.currentValue / 100, 0),
    [portfolio],
  );

  const riskPct = totalValue > 0 ? Math.min(100, Math.round((totalAtRisk / totalValue) * 100)) : 0;
  const protectedPct = Math.max(0, 100 - riskPct);

  const windowCount = useMemo(() => {
    return portfolio.filter((a) => {
      const sw = computeSellWindow(
        a.depreciationCliff.daysAway,
        a.depreciationCliff.projectedDrop / 100,
      );
      return sw.urgency === "WINDOW" || sw.urgency === "URGENT";
    }).length;
  }, [portfolio]);

  const actionPct = portfolio.length > 0 ? Math.round((windowCount / portfolio.length) * 100) : 0;
  const safeInventoryPct = Math.max(0, 100 - actionPct);

  const SIZE = 240;
  const CX = 120;
  const CY = 120;
  const SW = 14;

  const rings = [
    {
      label: "Portfolio Health",
      desc: "Overall vitality score based on urgency mix and decay exposure",
      value: healthScore.score,
      color: "#7C3AED",
      track: "#EDE9FE",
      radius: 92,
      detail: `${healthScore.score}/100 · Grade ${healthScore.grade}`,
    },
    {
      label: "Capital Protected",
      desc: "Portfolio value currently insulated from near-term cliff drops",
      value: protectedPct,
      color: "#059669",
      track: "#D1FAE5",
      radius: 72,
      detail: `${protectedPct}% capital secured`,
    },
    {
      label: "Stable Inventory",
      desc: "Percentage of inventory safely outside high-urgency cliff zones",
      value: safeInventoryPct,
      color: "#D97706",
      track: "#FEF3C7",
      radius: 52,
      detail: `${portfolio.length - windowCount} of ${portfolio.length} inventory stable`,
    },
  ];

  const breakdownItems = useMemo(() => {
    return portfolio.map((a) => {
      const sw = computeSellWindow(
        a.depreciationCliff.daysAway,
        a.depreciationCliff.projectedDrop / 100,
      );
      const score =
        sw.urgency === "CLIFF"
          ? 15
          : sw.urgency === "URGENT"
          ? 40
          : sw.urgency === "WINDOW"
          ? 70
          : 95;
      const barColor =
        sw.urgency === "CLIFF"
          ? "#DC2626"
          : sw.urgency === "URGENT"
          ? "#D97706"
          : sw.urgency === "WINDOW"
          ? "#059669"
          : "#64748B";

      return { ...a, score, barColor, sw };
    });
  }, [portfolio]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Workstation Dashboard
            </Link>
            <h1 className="font-poppins font-bold text-2xl sm:text-3xl text-slate-950 tracking-tight">
              Portfolio Health Rings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Concentric risk modeling measuring capital preservation, cliff exposure, and urgency balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
              <Award className="w-3.5 h-3.5 text-[#7C3AED]" />
              Rating: {healthScore.grade} ({healthScore.label})
            </span>
          </div>
        </div>

        {/* Concentric Rings Visual + Metrics Grid */}
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs items-center">
          {/* Ring Graphic */}
          <div className="flex items-center justify-center">
            {isLoading ? (
              <div
                style={{ width: SIZE, height: SIZE }}
                className="rounded-full bg-slate-100 animate-pulse"
              />
            ) : (
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {rings.map((ring) => {
                  const circ = 2 * Math.PI * ring.radius;
                  const filled = Math.max(0, (ring.value / 100) * circ);
                  return (
                    <g key={ring.label}>
                      {/* Track */}
                      <circle
                        cx={CX}
                        cy={CY}
                        r={ring.radius}
                        fill="none"
                        stroke={ring.track}
                        strokeWidth={SW}
                      />
                      {/* Progress Arc */}
                      <circle
                        cx={CX}
                        cy={CY}
                        r={ring.radius}
                        fill="none"
                        stroke={ring.color}
                        strokeWidth={SW}
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ}`}
                        transform={`rotate(-90 ${CX} ${CY})`}
                        style={{
                          transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </g>
                  );
                })}
                {/* Center Readout */}
                <text
                  x={CX}
                  y={CY - 10}
                  textAnchor="middle"
                  fontSize="38"
                  fontWeight="800"
                  fill="#0F172A"
                  fontFamily="'Poppins', sans-serif"
                >
                  {healthScore.grade}
                </text>
                <text
                  x={CX}
                  y={CY + 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="700"
                  letterSpacing="1"
                >
                  {healthScore.label.toUpperCase()}
                </text>
                <text
                  x={CX}
                  y={CY + 28}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="500"
                >
                  {healthScore.score} / 100
                </text>
              </svg>
            )}
          </div>

          {/* Ring Descriptions & Progress Sliders */}
          <div className="space-y-5">
            {rings.map((ring, i) => (
              <motion.div
                key={ring.label}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-100"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ring.color }}
                    />
                    <span className="text-xs font-semibold text-slate-900">{ring.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: ring.color }}>
                    {ring.detail}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-200">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ring.value}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: i * 0.1 }}
                    style={{ backgroundColor: ring.color }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">{ring.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Per-Asset Health Breakdown */}
        <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7C3AED]" />
              Individual Asset Health Index
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {portfolio.length} Total Monitored
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {breakdownItems.map((a, idx) => {
                const pill = URGENCY_PILL[a.sw.urgency];
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => setSelectedAsset(a)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:w-64 min-w-0">
                      <AssetImage
                        model={a.model}
                        category={a.category}
                        alt={a.model}
                        aspectRatio="square"
                        className="w-8 h-8 rounded-lg border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-[#7C3AED] transition-colors truncate">
                          {a.model}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{a.category}</p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${a.score}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.04 }}
                          style={{ backgroundColor: a.barColor }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 w-12 text-right">
                        {a.score}/100
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: pill.bg,
                          color: pill.text,
                          border: `1px solid ${pill.border}`,
                        }}
                      >
                        {pill.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 w-18 text-right">
                        {formatCurrencyWhole(a.currentValue / 100)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(a);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3 Executive Stat Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: TrendingUp,
              label: "Total Valuation",
              value: formatCurrencyWhole(totalValue),
              sub: "Gross portfolio basis",
              tone: "slate" as const,
            },
            {
              icon: Shield,
              label: "Total Capital At Risk",
              value: formatCurrencyWhole(totalAtRisk),
              sub: `${riskPct}% exposed to near cliff`,
              tone: "crimson" as const,
            },
            {
              icon: Zap,
              label: "Active Liquidation Windows",
              value: `${windowCount}`,
              sub: "Eligible for peak recovery",
              tone: "amber" as const,
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  s.tone === "crimson"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : s.tone === "amber"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-purple-50 text-[#7C3AED] border border-purple-100"
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p
                  className={`font-poppins font-bold text-xl tracking-tight ${
                    s.tone === "crimson"
                      ? "text-red-600"
                      : s.tone === "amber"
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-slate-400">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Asset Inspection & Liquidation Drawer */}
      <AssetDrawer
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onSell={(id) => {
          updateStatusMutation.mutate({
            id,
            data: { status: "LIQUIDATE" },
          });
        }}
        isSelling={updateStatusMutation.isPending}
      />
    </AppLayout>
  );
}
