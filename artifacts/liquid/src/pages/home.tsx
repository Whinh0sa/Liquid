import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  X,
  Zap,
  ArrowRight,
  Package,
  Award,
  CalendarDays,
  Flame,
  Activity,
  Clock,
  BarChart2,
  Shield,
} from "lucide-react";
import { Link } from "wouter";
import AssetDrawer from "@/components/AssetDrawer";
import AppLayout from "@/components/AppLayout";
import PortfolioKPIs from "@/components/PortfolioKPIs";
import AssetLedgerGrid from "@/components/AssetLedgerGrid";
import LiquidationRadar from "@/components/LiquidationRadar";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

interface PortfolioAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

const TICKERS = [
  { label: "GOLD", price: "$3,247.80", change: "+1.2%", up: true },
  { label: "SILVER", price: "$32.41", change: "-0.4%", up: false },
  { label: "PLATINUM", price: "$1,018.00", change: "+0.8%", up: true },
  { label: "REAL ESTATE", price: "$842.50", change: "+2.1%", up: true },
  { label: "RARE WHISKY", price: "$2,104.00", change: "+0.3%", up: true },
  { label: "FINE ART IDX", price: "$5,880.00", change: "-1.1%", up: false },
  { label: "DIAMONDS", price: "$8,240.00", change: "+0.6%", up: true },
];

const URGENCY_PILL: Record<UrgencyLevel, { label: string; bg: string; text: string; border: string }> = {
  PLANNED: { label: "Plan ahead", bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  WINDOW: { label: "⚡ Sell now", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  URGENT: { label: "Last chance", bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  CLIFF: { label: "Window closed", bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

const TIMELINE_STEPS = [
  { title: "Sell now", description: "Move the most urgent assets first." },
  { title: "Prep alerts", description: "Set floors and queue the next exits." },
  { title: "Catch the window", description: "Capture the best remaining prices." },
  { title: "Exit cleanly", description: "Liquidate leftovers before the cliff." },
];

const PRODUCT_BENEFITS = [
  {
    title: "Sell at the right time",
    body: "Liquid surfaces the resale window before depreciation erodes your value.",
    icon: CalendarDays,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    title: "Know what is at risk",
    body: "Track capital at risk, daily decay, and urgency without spreadsheet guesswork.",
    icon: ShieldCheck,
    color: "#10B981",
    bg: "#F0FDF4",
  },
  {
    title: "Act with confidence",
    body: "Use condition-aware estimates and clear alerts to make better liquidation decisions.",
    icon: BellRing,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
];

const RELEASE_EVENTS = [
  { id: 1, daysAway: 12, title: "Apple iPhone 16 Series", affects: "iPhone 14 Pro - 256GB", impact: -20, severity: "critical" as const },
  { id: 2, daysAway: 38, title: "Sony A7R VI Announcement", affects: "Sony A7IV Body", impact: -15, severity: "high" as const },
  { id: 3, daysAway: 117, title: "Sony WH-1000XM6 Launch", affects: "Sony WH-1000XM5", impact: -18, severity: "high" as const },
  { id: 4, daysAway: 129, title: "iPad Pro M5 Event", affects: "iPad Pro M4", impact: -12, severity: "medium" as const },
  { id: 5, daysAway: 180, title: "MacBook Pro M4 Refresh", affects: "MacBook Pro M2", impact: -8, severity: "low" as const },
];

export default function Home() {
  const queryClient = useQueryClient();
  const [optimisticNetWorth, setOptimisticNetWorth] = useState<number | null>(null);
  const [sellingIds, setSellingIds] = useState<Set<string>>(new Set());
  const [soldRecords, setSoldRecords] = useState<Map<string, { saleValue: number; dropAvoided: number; soldAt: number }>>(new Map());
  const [priceAlerts, setPriceAlerts] = useState<Map<string, number>>(new Map());
  const [drawerAsset, setDrawerAsset] = useState<PortfolioAsset | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [itemsView, setItemsView] = useState<"tiles" | "list">("tiles");

  const { data, isLoading } = useGetPortfolio({ query: { queryKey: getGetPortfolioQueryKey() } });

  const portfolio = data?.portfolio ?? [];
  const metrics = data?.metrics;
  const displayedNetWorth = optimisticNetWorth !== null ? optimisticNetWorth : metrics?.totalNetWorth ?? 0;

  const updateStatus = useUpdateAssetStatus({
    mutation: {
      onMutate: async ({ id, data: body }) => {
        if (body.status === "LIQUIDATE") {
          setSellingIds((prev) => new Set(prev).add(id));
          const prev = data?.metrics.totalNetWorth ?? null;
          const asset = data?.portfolio.find((a) => a.id === id);
          if (asset && data) setOptimisticNetWorth(data.metrics.totalNetWorth - asset.currentValue / 100);
          return { previousNetWorth: prev };
        }
        return undefined;
      },
      onError: (_err, _vars, context: { previousNetWorth?: number | null } | undefined) => {
        setOptimisticNetWorth(context?.previousNetWorth ?? null);
        setSellingIds(new Set());
      },
      onSettled: () => {
        setSellingIds(new Set());
        setOptimisticNetWorth(null);
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
      },
    },
  });

  const onSetAlert = useCallback((id: string, price: number | null) => {
    setPriceAlerts((prev) => {
      const next = new Map(prev);
      if (price === null) next.delete(id);
      else next.set(id, price);
      return next;
    });
  }, []);

  const handleSell = useCallback((id: string) => {
    const asset = portfolio.find((a) => a.id === id);
    if (asset) {
      setSoldRecords((prev) => {
        const next = new Map(prev);
        next.set(id, { saleValue: asset.currentValue / 100, dropAvoided: asset.depreciationCliff.projectedDrop / 100, soldAt: Date.now() });
        return next;
      });
    }
    updateStatus.mutate({ id, data: { status: "LIQUIDATE" } });
  }, [portfolio, updateStatus]);

  const urgentAssets = useMemo(() => portfolio.filter((a) => a.depreciationCliff.daysAway <= 14 && a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT"), [portfolio]);
  const firedAlerts = useMemo(() => portfolio.filter((a) => {
    const floor = priceAlerts.get(a.id);
    return floor !== undefined && a.currentValue / 100 <= floor && a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT" && !sellingIds.has(a.id);
  }), [portfolio, priceAlerts, sellingIds]);

  const windowOpenCount = useMemo(() => portfolio.filter((a) => computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100).urgency === "WINDOW").length, [portfolio]);
  const totalSaved = useMemo(() => Array.from(soldRecords.values()).reduce((sum, r) => sum + r.dropAvoided, 0), [soldRecords]);
  const atRiskTotal = useMemo(() => portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0), [portfolio]);
  const dailyDecay = useMemo(() => portfolio.reduce((sum, a) => {
    const days = a.depreciationCliff.daysAway;
    const drop = a.depreciationCliff.projectedDrop / 100;
    return days > 0 ? sum + drop / days : sum;
  }, 0), [portfolio]);
  const healthScore = useMemo(() => {
    if (portfolio.length === 0) return { grade: "A", score: 100, color: "#10B981", label: "Excellent" };
    let score = 100;
    portfolio.forEach((a) => {
      const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
      if (sw.urgency === "CLIFF") score -= 28;
      else if (sw.urgency === "URGENT") score -= 18;
      else if (sw.urgency === "WINDOW") score -= 5;
      else score += 3;
    });
    score = Math.min(100, Math.max(0, score));
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
    const color = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
    const label = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Fair" : score >= 45 ? "At risk" : "Critical";
    return { grade, score, color, label };
  }, [portfolio]);

  const smartMoves = useMemo(() => portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return sw.urgency === "WINDOW" || sw.urgency === "URGENT";
  }), [portfolio]);

  const batchTargets = useMemo(() => portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return (sw.urgency === "WINDOW" || sw.urgency === "URGENT") && a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT" && !sellingIds.has(a.id) && !soldRecords.has(a.id);
  }), [portfolio, sellingIds, soldRecords]);

  // Ticker tape content (slotted into AppLayout's subNav)
  const tickerTape = (
    <div className="w-full overflow-hidden h-8 bg-gray-50 border-t border-gray-100 flex items-center whitespace-nowrap">
      <div className="inline-block ticker-tape font-inter text-xs font-medium text-gray-500 space-x-6">
        {[...TICKERS, ...TICKERS].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">{t.label}</span>
            <span>{t.price}</span>
            <span style={{ color: t.up ? "#10B981" : "#EF4444" }} className="font-semibold">{t.change} {t.up ? "▲" : "▼"}</span>
            <span className="mx-3 text-gray-300">|</span>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout subNav={tickerTape}>
      <>
        <AssetDrawer asset={drawerAsset} onClose={() => setDrawerAsset(null)} onSell={handleSell} isSelling={drawerAsset ? sellingIds.has(drawerAsset.id) : false} />

      {/* ── Batch sell modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBatchModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowBatchModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="fixed inset-x-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-2xl w-full sm:w-[480px] overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-poppins font-bold text-lg text-gray-900">Liquidate {batchTargets.length} item{batchTargets.length !== 1 ? "s" : ""}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Sell all assets in sell-window or urgent zone</p>
                </div>
                <button type="button" onClick={() => setShowBatchModal(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-3 max-h-72 overflow-y-auto">
                {batchTargets.map((a) => {
                  const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{a.category}</p>
                        <p className="text-sm font-semibold text-gray-900">{a.model}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={sw.urgency === "WINDOW" ? { backgroundColor: "#D1FAE5", color: "#065F46" } : { backgroundColor: "#FFEDD5", color: "#9A3412" }}>
                          {sw.urgency === "WINDOW" ? "⚡ In window" : "Urgent"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-emerald-600">{fmt(a.currentValue / 100)}</p>
                        <p className="text-xs text-red-400">saves {fmt(a.depreciationCliff.projectedDrop / 100)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-6 border-t border-gray-100">
                <p className="text-sm font-semibold text-center text-gray-900 mb-1">Total proceeds: <span className="text-emerald-600">{fmt(batchTargets.reduce((s, a) => s + a.currentValue / 100, 0))}</span></p>
                <p className="text-xs text-center text-gray-400 mb-4">Protects {fmt(batchTargets.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0))} from depreciation</p>
                <button type="button" onClick={() => { batchTargets.forEach((a) => handleSell(a.id)); setShowBatchModal(false); }} className="w-full h-12 rounded-xl font-bold text-white text-sm tracking-wide flex items-center justify-center gap-2" style={{ backgroundColor: "#10B981", boxShadow: "0 4px 16px rgba(16,185,129,0.35)" }}>
                  <Package className="w-4 h-4" />
                  SELL ALL {batchTargets.length} ITEMS NOW
                </button>
                <button type="button" onClick={() => setShowBatchModal(false)} className="w-full mt-2 h-10 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4 sm:gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-purple-600 mb-3" style={{ color: "#9126EF" }}>
              Liquid
            </p>
            <h1 className="font-poppins font-black text-4xl sm:text-5xl text-gray-900 tracking-tight max-w-xl">
              Know exactly when to sell your physical assets.
            </h1>
            <p className="text-gray-500 mt-4 text-base leading-7 max-w-2xl">
              Liquid is a resale intelligence platform for electronics and other
              high-value physical assets. It shows when value is about to decay,
              what is at risk, and what to do next.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="px-4 py-2.5 rounded-2xl font-bold text-white shadow-sm transition-all hover:opacity-90 hover:-translate-y-0.5" style={{ backgroundColor: "#9126EF", boxShadow: "0 4px 14px rgba(145,38,239,0.2)" }}>
                View portfolio
              </Link>
              <Link href="/analysis" className="px-4 py-2.5 rounded-2xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                See analysis
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {PRODUCT_BENEFITS.map((item) => (
              <div key={item.title} className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm flex gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {urgentAssets.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }}>
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-semibold text-orange-800 flex-1">{urgentAssets.length} asset{urgentAssets.length > 1 ? "s" : ""} approaching depreciation cliff</p>
              <button onClick={() => setShowBatchModal(true)} className="text-xs font-bold text-orange-700 flex items-center gap-1 hover:text-orange-900">Review <ArrowRight className="w-3 h-3" /></button>
            </motion.div>
          )}
          {firedAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
              <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-amber-800 flex-1">{firedAlerts.length} price floor{firedAlerts.length > 1 ? "s" : ""} triggered</p>
            </motion.div>
          )}
        </AnimatePresence>

        <PortfolioKPIs
          isLoading={isLoading}
          displayedNetWorth={displayedNetWorth}
          itemCount={portfolio.length}
          windowOpenCount={windowOpenCount}
          urgentCount={urgentAssets.length + firedAlerts.length}
          hasMetrics={!!metrics}
        />

        <AssetLedgerGrid
          isLoading={isLoading}
          portfolio={portfolio as any}
          viewType={itemsView}
          onViewChange={setItemsView}
          sellingIds={sellingIds}
          soldRecords={soldRecords}
          priceAlerts={priceAlerts}
          onSell={handleSell}
          onOpen={(a) => setDrawerAsset(a as PortfolioAsset)}
          onSetAlert={onSetAlert}
        />

        <LiquidationRadar
          isLoading={isLoading}
          portfolio={portfolio as any}
          windowOpenCount={windowOpenCount}
          onOpenAsset={(a) => setDrawerAsset(a as PortfolioAsset)}
        />

        {!isLoading && (smartMoves.length > 0 || dailyDecay > 0) && <div className="grid md:grid-cols-2 gap-4"><section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" />Smart Moves</h3><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">AI suggested</span></div><div className="space-y-3">{smartMoves.slice(0,3).map((asset) => { const sw = computeSellWindow(asset.depreciationCliff.daysAway, asset.depreciationCliff.projectedDrop / 100); const pill = URGENCY_PILL[sw.urgency]; return <div key={asset.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:border-gray-200 transition-colors" onClick={() => setDrawerAsset(asset as PortfolioAsset)}><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{asset.model}</p><p className="text-[10px] text-gray-400 mt-0.5">Move into the next purchase window</p></div><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pill.bg, color: pill.text }}>{pill.label}</span></div>; })}</div></section><section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" />Cost of Holding</h3><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-500">Daily burn</span></div><div className="space-y-3">{[{ label: "Daily", value: dailyDecay, color: "#EF4444" }, { label: "Weekly", value: dailyDecay * 7, color: "#F97316" }, { label: "Monthly", value: dailyDecay * 30, color: "#F59E0B" }].map((row) => <div key={row.label} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50"><span className="text-sm font-medium text-gray-600">{row.label} loss rate</span><span className="text-sm font-bold" style={{ color: row.color }}>{fmt(row.value)}</span></div>)}<p className="text-[11px] text-gray-400 mt-1 leading-relaxed">This is the amortised depreciation rate across all assets. Selling earlier saves this amount per day.</p></div></section></div>}

        {!isLoading && <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-500" />Portfolio Rings</h3><Link href="/rings" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1" style={{ color: "#9126EF" }}>Detail view <ArrowRight className="w-3 h-3" /></Link></div><div className="flex flex-col sm:flex-row items-center gap-8"><div className="shrink-0"><RingsGraphic grade={healthScore.grade} label={healthScore.label} score={healthScore.score} totalSaved={totalSaved} portfolio={portfolio} /></div><div className="flex-1 space-y-4 w-full"><RingRows healthScore={healthScore} totalSaved={totalSaved} portfolio={portfolio} soldRecordsSize={soldRecords.size} /></div></div></section>}

        {!isLoading && <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-500" />Upcoming Release Events</h3><Link href="/alerts" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1" style={{ color: "#9126EF" }}>All alerts <ArrowRight className="w-3 h-3" /></Link></div><div className="space-y-3">{RELEASE_EVENTS.slice(0, 3).map((event) => { const sevConfig = { critical: { bg: "#FEE2E2", color: "#991B1B", countBg: "#FEF2F2", countColor: "#DC2626" }, high: { bg: "#FFEDD5", color: "#9A3412", countBg: "#FFF7ED", countColor: "#B45309" }, medium: { bg: "#FEF3C7", color: "#92400E", countBg: "#FFFBEB", countColor: "#B45309" }, low: { bg: "#DBEAFE", color: "#1D4ED8", countBg: "#EFF6FF", countColor: "#2563EB" } }[event.severity]; return <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50"><div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ backgroundColor: sevConfig.countBg }}><span className="font-poppins font-bold text-lg leading-none" style={{ color: sevConfig.countColor }}>{event.daysAway}</span><span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">days</span></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{event.title}</p><p className="text-xs text-gray-400 truncate mt-0.5">Affects: <span className="font-medium text-gray-600">{event.affects}</span></p></div><div className="text-right shrink-0"><p className="text-lg font-bold text-red-500">{event.impact}%</p><span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sevConfig.bg, color: sevConfig.color }}>{event.severity}</span></div></div>; })}</div></section>}

        {soldRecords.size > 0 && <SessionPerformanceCard soldRecords={soldRecords} portfolio={portfolio} totalSaved={totalSaved} />}

        <div className="bg-purple-50 border border-purple-100 rounded-3xl p-5 flex gap-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#9126EF" }}><Clock className="w-5 h-5 text-white" /></div><div><p className="text-sm font-semibold text-purple-900 mb-1">How sell windows are calculated</p><p className="text-sm text-purple-700 leading-relaxed">Each item&apos;s optimal sell window opens 7 days before the depreciation cliff and closes 3 days before — giving resale platforms time to process. Selling inside the window maximises your price before the market reprices.</p></div></div>

      <AnimatePresence>
        {batchTargets.length > 0 && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ type: "spring", stiffness: 360, damping: 28 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button onClick={() => setShowBatchModal(true)} className="flex items-center gap-2.5 px-5 py-3.5 rounded-full font-bold text-white text-sm shadow-2xl whitespace-nowrap transition-all hover:scale-105" style={{ backgroundColor: "#9126EF", boxShadow: "0 8px 32px rgba(145,38,239,0.55)" }}>
              <Package className="w-4 h-4" /> Sell All Urgent <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded-full">{batchTargets.length}</span>
              <span className="ml-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>{fmt(batchTargets.reduce((s, a) => s + a.currentValue / 100, 0))}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-gray-200 py-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="font-poppins font-bold" style={{ color: "#9126EF" }}>Liquid</span>
          <p className="text-xs text-gray-400">© 2026 Liquid. Sell smart, not late.</p>
        </div>
      </footer>
      </>
    </AppLayout>
  );
}

function RingsGraphic({ grade, label, score, totalSaved, portfolio }: { grade: string; label: string; score: number; totalSaved: number; portfolio: { depreciationCliff: { projectedDrop: number } }[] }) {
  const totalAtRisk = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const capitalPct = totalAtRisk > 0 ? Math.min(100, Math.round((totalSaved / totalAtRisk) * 100)) : 0;
  const efficiencyPct = portfolio.length > 0 ? Math.round((totalSaved > 0 ? 1 : 0) * 100) : 0;
  const SIZE = 190;
  const CX = 95;
  const CY = 95;
  const SW = 13;
  const rings = [
    { color: "#9126EF", track: "rgba(145,38,239,0.1)", radius: 72, value: score },
    { color: "#10B981", track: "#D1FAE5", radius: 55, value: capitalPct },
    { color: "#F59E0B", track: "#FEF3C7", radius: 38, value: efficiencyPct },
  ];
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {rings.map((ring) => {
        const circ = 2 * Math.PI * ring.radius;
        const filled = Math.max(0, (ring.value / 100) * circ);
        return <g key={ring.radius}><circle cx={CX} cy={CY} r={ring.radius} fill="none" stroke={ring.track} strokeWidth={SW} /><circle cx={CX} cy={CY} r={ring.radius} fill="none" stroke={ring.color} strokeWidth={SW} strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} transform={`rotate(-90 ${CX} ${CY})`} /></g>;
      })}
      <text x={CX} y={CY - 9} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1F2937" fontFamily="'Poppins', sans-serif">{grade}</text>
      <text x={CX} y={CY + 11} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.5">{label.toUpperCase()}</text>
    </svg>
  );
}

function RingRows({ healthScore, totalSaved, portfolio, soldRecordsSize }: { healthScore: { score: number; grade: string; color: string; label: string }; totalSaved: number; portfolio: { depreciationCliff: { projectedDrop: number } }[]; soldRecordsSize: number }) {
  const totalAtRisk = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const capitalPct = totalAtRisk > 0 ? Math.min(100, Math.round((totalSaved / totalAtRisk) * 100)) : 0;
  const efficiencyPct = portfolio.length > 0 ? Math.round((soldRecordsSize / portfolio.length) * 100) : 0;
  const rings = [
    { label: "Portfolio Health", value: healthScore.score, color: "#9126EF", track: "rgba(145,38,239,0.1)", detail: `${healthScore.grade} — ${healthScore.label}` },
    { label: "Capital Protected", value: capitalPct, color: "#10B981", track: "#D1FAE5", detail: `${capitalPct}% of at-risk saved` },
    { label: "Sell Efficiency", value: efficiencyPct, color: "#F59E0B", track: "#FEF3C7", detail: `${soldRecordsSize} of ${portfolio.length} sold` },
  ];
  return <>{rings.map((ring) => <div key={ring.label}><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ring.color }} /><span className="text-xs font-semibold text-gray-700">{ring.label}</span></div><span className="text-xs font-bold" style={{ color: ring.color }}>{ring.detail}</span></div><div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: ring.track }}><div className="h-full rounded-full" style={{ width: `${ring.value}%`, backgroundColor: ring.color }} /></div></div>)}</>;
}

function SessionPerformanceCard({ soldRecords, portfolio, totalSaved }: { soldRecords: Map<string, { saleValue: number; dropAvoided: number; soldAt: number }>; portfolio: { depreciationCliff: { daysAway: number; projectedDrop: number } }[]; totalSaved: number }) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const itemsSold = soldRecords.size;
  const totalProceeds = Array.from(soldRecords.values()).reduce((s, r) => s + r.saleValue, 0);
  const totalAtRisk = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const efficiency = totalAtRisk > 0 ? Math.min(100, Math.round((totalSaved / totalAtRisk) * 100)) : 0;
  const trophies = [
    { icon: "⚡", label: "First Exit", unlocked: itemsSold >= 1 },
    { icon: "🔥", label: "Hot Streak", unlocked: itemsSold >= 3 },
    { icon: "💰", label: "Big Earner", unlocked: totalProceeds >= 1000 },
    { icon: "🛡️", label: "Risk Shield", unlocked: totalSaved >= 100 },
    { icon: "🏆", label: "Window Master", unlocked: efficiency >= 50 },
    { icon: "🚀", label: "Full Liquidation", unlocked: itemsSold >= 5 },
  ];
  return <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Session Performance</h3><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">This session</span></div><div className="grid grid-cols-4 gap-3 mb-5">{[{ label: "Sold", value: `${itemsSold}`, sub: "items", color: "#9126EF" }, { label: "Proceeds", value: f(totalProceeds), sub: "collected", color: "#10B981" }, { label: "Protected", value: f(totalSaved), sub: "from drops", color: "#10B981" }, { label: "Efficiency", value: `${efficiency}%`, sub: "of at-risk", color: efficiency >= 75 ? "#10B981" : efficiency >= 40 ? "#F59E0B" : "#EF4444" }].map((s) => <div key={s.label} className="rounded-xl p-3 bg-gray-50 border border-gray-100 text-center"><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{s.label}</p><p className="font-poppins font-bold text-base leading-tight" style={{ color: s.color }}>{s.value}</p><p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p></div>)}</div><div><p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" />Achievement Wall</p><div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{trophies.map((t) => <div key={t.label} className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-center transition-all" style={{ backgroundColor: t.unlocked ? "#FFFBEB" : "#F9FAFB", borderColor: t.unlocked ? "#FDE68A" : "#E5E7EB", opacity: t.unlocked ? 1 : 0.5 }}><span className="text-xl leading-none" style={{ filter: t.unlocked ? "none" : "grayscale(1)" }}>{t.icon}</span><p className="text-[9px] font-semibold text-gray-600 leading-tight">{t.label}</p></div>)}</div></div></motion.section>;
}

const AssetCard = React.memo(function AssetCard({ asset, isSelling, soldRecord, alertPrice, onSell, onOpen, onSetAlert, viewType = "tiles" }: { asset: PortfolioAsset; isSelling: boolean; soldRecord?: { saleValue: number; dropAvoided: number; soldAt: number }; alertPrice?: number; onSell: (id: string) => void; onOpen: (asset: PortfolioAsset) => void; onSetAlert: (id: string, price: number | null) => void; viewType?: "tiles" | "list"; }) {
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertInput, setAlertInput] = useState("");
  const current = asset.currentValue / 100;
  const purchase = asset.purchasePrice / 100;
  const pnl = ((current - purchase) / purchase) * 100;
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
  return viewType === "list" ? <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300" onClick={() => onOpen(asset)} style={{ border: isAlertFired ? "1.5px solid #F59E0B" : alertPrice !== undefined ? "1.5px solid #FCD34D" : "1px solid #E5E7EB", boxShadow: isAlertFired ? "0 0 0 3px rgba(245,158,11,0.12)" : undefined }}><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p><h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">{asset.model}</h3></div><span className="text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap" style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg, borderColor: urgencyPill.border }}>{urgencyPill.label}</span></div>{isAlertFired && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200"><BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" /><p className="text-xs font-semibold text-amber-800 flex-1">Floor hit — value at or below {fmt(alertPrice ?? 0)}</p></div>}<div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit" style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg }}><Clock className="w-3 h-3" />{sellWindow.sellByLabel}</div><p className="text-xs text-gray-400 mt-2">−{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d</p></div><div className="text-right"><span className="font-poppins font-bold text-xl sm:text-2xl text-gray-900 block">{fmt(current)}</span><span className={`text-xs sm:text-sm font-semibold inline-flex items-center gap-0.5 ${pnl < 0 ? "text-red-500" : "text-emerald-500"}`}>{pnl < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}{pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%</span></div></div><div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}><button onClick={(e) => { e.stopPropagation(); onSell(asset.id); }} className="flex-1 min-w-[120px] h-9 rounded-xl text-xs font-bold text-white transition-all" style={{ backgroundColor: "#10B981" }}>Sell Now</button><button className="h-9 px-4 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); onOpen(asset); }}>Analyse</button></div><div className="border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>{!alertPrice ? (showAlertInput ? <div className="flex items-center gap-1.5"><span className="text-xs text-gray-400 shrink-0">Floor $</span><input type="number" value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmAlert(); if (e.key === "Escape") { setShowAlertInput(false); setAlertInput(""); } }} placeholder={current.toFixed(0)} autoFocus className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400 min-w-0" onClick={(e) => e.stopPropagation()} /><button onClick={(e) => { e.stopPropagation(); confirmAlert(); }} className="h-7 px-2.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 shrink-0">Set</button><button onClick={(e) => { e.stopPropagation(); setShowAlertInput(false); setAlertInput(""); }} aria-label="Cancel alert" className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-lg shrink-0"><X className="w-3.5 h-3.5" /></button></div> : <button onClick={(e) => { e.stopPropagation(); setShowAlertInput(true); setAlertInput(current.toFixed(0)); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-500 transition-colors"><Bell className="w-3 h-3" />Set price floor alert</button>) : <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500"><Bell className="w-3 h-3" />Alert set at {fmt(alertPrice)}</span><button onClick={(e) => { e.stopPropagation(); onSetAlert(asset.id, null); }} aria-label="Clear alert" className="text-gray-300 hover:text-gray-500 transition-colors"><X className="w-3.5 h-3.5" /></button></div>}</div></div> : <div className="bg-white rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300" onClick={() => onOpen(asset)} style={{ border: isAlertFired ? "1.5px solid #F59E0B" : alertPrice !== undefined ? "1.5px solid #FCD34D" : "1px solid #E5E7EB", boxShadow: isAlertFired ? "0 0 0 3px rgba(245,158,11,0.12)" : undefined }}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p><h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{asset.model}</h3></div><span className="text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap" style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg, borderColor: urgencyPill.border }}>{urgencyPill.label}</span></div>{isAlertFired && <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200"><BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" /><p className="text-xs font-semibold text-amber-800 flex-1">Floor hit — value at or below {fmt(alertPrice ?? 0)}</p></div>}<div className="flex items-baseline justify-between"><span className="font-poppins font-bold text-2xl text-gray-900">{fmt(current)}</span><span className={`text-sm font-semibold flex items-center gap-0.5 ${pnl < 0 ? "text-red-500" : "text-emerald-500"}`}>{pnl < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}{pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg }}><Clock className="w-3 h-3" />{sellWindow.sellByLabel}</div><span className="text-xs text-gray-400">−{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d</span></div><div className="flex gap-2" onClick={(e) => e.stopPropagation()}><button onClick={(e) => { e.stopPropagation(); onSell(asset.id); }} className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-all" style={{ backgroundColor: "#10B981" }}>Sell Now</button><button className="h-9 px-4 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); onOpen(asset); }}>Analyse</button></div><div className="border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>{!alertPrice ? (showAlertInput ? <div className="flex items-center gap-1.5"><span className="text-xs text-gray-400 shrink-0">Floor $</span><input type="number" value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmAlert(); if (e.key === "Escape") { setShowAlertInput(false); setAlertInput(""); } }} placeholder={current.toFixed(0)} autoFocus className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400 min-w-0" onClick={(e) => e.stopPropagation()} /><button onClick={(e) => { e.stopPropagation(); confirmAlert(); }} className="h-7 px-2.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 shrink-0">Set</button><button onClick={(e) => { e.stopPropagation(); setShowAlertInput(false); setAlertInput(""); }} aria-label="Cancel alert" className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-lg shrink-0"><X className="w-3.5 h-3.5" /></button></div> : <button onClick={(e) => { e.stopPropagation(); setShowAlertInput(true); setAlertInput(current.toFixed(0)); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-500 transition-colors"><Bell className="w-3 h-3" />Set price floor alert</button>) : <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500"><Bell className="w-3 h-3" />Alert set at {fmt(alertPrice)}</span><button onClick={(e) => { e.stopPropagation(); onSetAlert(asset.id, null); }} aria-label="Clear alert" className="text-gray-300 hover:text-gray-500 transition-colors"><X className="w-3.5 h-3.5" /></button></div>}</div></div>;
});

function RecoveryCard({ asset, soldRecord }: { asset: PortfolioAsset; soldRecord?: { saleValue: number; dropAvoided: number; soldAt: number } }) {
  const saleValue = soldRecord?.saleValue ?? asset.currentValue / 100;
  const dropAvoided = soldRecord?.dropAvoided ?? asset.depreciationCliff.projectedDrop / 100;
  const wouldBeWorth = Math.max(saleValue - dropAvoided, 0);
  const barPct = saleValue > 0 ? Math.round((wouldBeWorth / saleValue) * 100) : 0;
  return <div className="rounded-2xl border border-emerald-200 p-5 flex flex-col gap-4" style={{ background: "linear-gradient(145deg, #f0fdf4 0%, #ffffff 55%)" }}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p><h3 className="font-semibold text-gray-900 text-sm leading-tight">{asset.model}</h3></div><span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0"><CheckCircle className="w-3 h-3" />PROTECTED</span></div><div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Locked in</p><span className="font-poppins font-bold text-2xl text-emerald-600">{fmt(saleValue)}</span></div><div className="text-right"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Market now</p><span className="font-poppins font-bold text-lg text-red-400 line-through decoration-red-300">{fmt(wouldBeWorth)}</span></div></div><div><div className="relative h-2.5 bg-red-100 rounded-full overflow-hidden"><div className="absolute left-0 top-0 h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(barPct, 4)}%`, transition: "width 0.8s ease" }} /></div><div className="flex justify-between text-[10px] mt-1 font-medium"><span className="text-emerald-600">You: {fmt(saleValue)}</span><span className="text-red-400">Market: {fmt(wouldBeWorth)}</span></div></div><div className="flex items-center justify-between mt-auto"><div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /><span className="text-xs font-bold text-emerald-700">+{fmt(dropAvoided)} saved</span></div>{soldRecord && <span className="text-[11px] text-gray-400 font-medium">just now</span>}</div></div>;
}

function SummaryTile({ label, value, icon, valueColor = "#1F2937" }: { label: string; value: string; icon: React.ReactNode; valueColor?: string }) {
  return <div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-gray-400">{icon}</div><span className="text-lg font-bold" style={{ color: valueColor }}>{value}</span><span className="text-xs text-gray-400 font-medium">{label}</span></div>;
}
