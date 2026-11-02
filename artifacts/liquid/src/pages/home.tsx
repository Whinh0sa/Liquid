import React, { useState, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  BellRing,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  X,
  Zap,
  ArrowRight,
  Package,
  Award,
  CalendarDays,
  Clock,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import AssetDrawer from "@/components/AssetDrawer";
import AppLayout from "@/components/AppLayout";
import PortfolioKPIs from "@/components/PortfolioKPIs";
import AssetLedgerGrid from "@/components/AssetLedgerGrid";
import LiquidationRadar from "@/components/LiquidationRadar";
import SpatialScanModal from "@/components/SpatialScanModal";
import { computeSellWindow } from "@/lib/sellWindow";
import { computePortfolioHealth } from "@/lib/portfolioHealth";

interface PortfolioAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

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
  const [showSpatialModal, setShowSpatialModal] = useState(false);
  const [itemsView, setItemsView] = useState<"tiles" | "list">("tiles");

  const { data, isLoading } = useGetPortfolio({ query: { queryKey: getGetPortfolioQueryKey() } });

  const portfolio = (data?.portfolio ?? []) as PortfolioAsset[];
  const portfolioById = useMemo(() => new Map(portfolio.map((a) => [a.id, a])), [portfolio]);
  const metrics = data?.metrics;
  const displayedNetWorth = optimisticNetWorth !== null ? optimisticNetWorth : metrics?.totalNetWorth ?? 0;

  const updateStatus = useUpdateAssetStatus({
    mutation: {
      onMutate: async ({ id, data: body }) => {
        if (body.status === "LIQUIDATE") {
          setSellingIds((prev) => new Set(prev).add(id));
          const prev = data?.metrics.totalNetWorth ?? null;
          const asset = portfolioById.get(id);
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
    const asset = portfolioById.get(id);
    if (asset) {
      setSoldRecords((prev) => {
        const next = new Map(prev);
        next.set(id, { saleValue: asset.currentValue / 100, dropAvoided: asset.depreciationCliff.projectedDrop / 100, soldAt: Date.now() });
        return next;
      });
    }
    updateStatus.mutate({ id, data: { status: "LIQUIDATE" } });
  }, [portfolioById, updateStatus]);

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
  const healthScore = useMemo(() => computePortfolioHealth(portfolio), [portfolio]);

  const batchTargets = useMemo(() => portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return (sw.urgency === "WINDOW" || sw.urgency === "URGENT") && a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT" && !sellingIds.has(a.id) && !soldRecords.has(a.id);
  }), [portfolio, sellingIds, soldRecords]);

  return (
    <AppLayout>
      <AssetDrawer
        asset={drawerAsset}
        onClose={() => setDrawerAsset(null)}
        onSell={handleSell}
        isSelling={drawerAsset ? sellingIds.has(drawerAsset.id) : false}
      />

      {/* ── Batch Sell Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBatchModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60]"
              onClick={() => setShowBatchModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="fixed inset-x-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-2xl w-full sm:w-[480px] overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-poppins font-bold text-base text-slate-900">
                    Batch Liquidate ({batchTargets.length} Items)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All assets currently positioned in peak window or urgent cliff zone.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowBatchModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-72 overflow-y-auto">
                {batchTargets.map((a) => {
                  const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="min-w-0 pr-3">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          {a.category}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 truncate">{a.model}</p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                          style={
                            sw.urgency === "WINDOW"
                              ? { backgroundColor: "#ECFDF5", color: "#065F46" }
                              : { backgroundColor: "#FFFBEB", color: "#92400E" }
                          }
                        >
                          {sw.urgency === "WINDOW" ? "Peak Window" : "Urgent Cliff"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600 font-poppins">
                          {formatCurrency(a.currentValue / 100)}
                        </p>
                        <p className="text-[11px] text-rose-500 font-medium">
                          protects {formatCurrency(a.depreciationCliff.projectedDrop / 100)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Total Recoverable Proceeds</span>
                  <span className="font-poppins font-bold text-sm text-emerald-600">
                    {formatCurrency(batchTargets.reduce((s, a) => s + a.currentValue / 100, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="text-slate-500 font-medium">Depreciation Avoided</span>
                  <span className="font-poppins font-semibold text-xs text-slate-700">
                    {formatCurrency(batchTargets.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    batchTargets.forEach((a) => handleSell(a.id));
                    setShowBatchModal(false);
                  }}
                  className="w-full h-11 rounded-xl font-bold text-white text-xs tracking-wide flex items-center justify-center gap-2 transition-all hover:opacity-95"
                  style={{ backgroundColor: "#059669" }}
                >
                  <Package className="w-4 h-4" />
                  EXECUTE ALL {batchTargets.length} EXITS NOW
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Executive KPI Command Strip ─────────────────────────────────── */}
      <PortfolioKPIs
        isLoading={isLoading}
        displayedNetWorth={displayedNetWorth}
        itemCount={portfolio.length}
        windowOpenCount={windowOpenCount}
        urgentCount={urgentAssets.length}
        atRiskTotal={atRiskTotal}
        dailyDecay={dailyDecay}
        healthScore={healthScore}
        onScanClick={() => setShowSpatialModal(true)}
        onBatchSellClick={() => setShowBatchModal(true)}
        batchSellCount={batchTargets.length}
      />

      {/* ── Urgent Alert Notice (Operational, not promotional) ─────────── */}
      <AnimatePresence>
        {urgentAssets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-200/80 bg-amber-50/70"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-900">
                {urgentAssets.length} {urgentAssets.length === 1 ? "asset is" : "assets are"} approaching depreciation cliff (&le;14 days). Downside loss upon market repricing is imminent.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 self-end sm:self-auto shrink-0 transition-colors"
            >
              Review batch exit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {firedAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-200/70 bg-amber-50/50"
          >
            <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-amber-900 flex-1">
              {firedAlerts.length} price floor {firedAlerts.length === 1 ? "alert has" : "alerts have"} been triggered by secondary market repricing.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Asset Ledger Workstation ───────────────────────────────── */}
      <AssetLedgerGrid
        isLoading={isLoading}
        portfolio={portfolio}
        viewType={itemsView}
        onViewChange={setItemsView}
        sellingIds={sellingIds}
        soldRecords={soldRecords}
        priceAlerts={priceAlerts}
        onSell={handleSell}
        onOpen={(a) => setDrawerAsset(a as PortfolioAsset)}
        onSetAlert={onSetAlert}
      />

      {/* ── Liquidation Intelligence: Heatmap, Opportunity Radar & Holding Cost ─ */}
      <LiquidationRadar
        isLoading={isLoading}
        portfolio={portfolio}
        windowOpenCount={windowOpenCount}
        onOpenAsset={(a) => setDrawerAsset(a as PortfolioAsset)}
        dailyDecay={dailyDecay}
      />

      {/* ── Upcoming Manufacturer Catalysts ──────────────────────────────── */}
      {!isLoading && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              Market Catalyst Calendar (Hardware Refreshes)
            </h3>
            <Link
              href="/alerts"
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
            >
              All catalyst alerts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {RELEASE_EVENTS.slice(0, 3).map((event) => {
              const sevBadge =
                event.severity === "critical"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : event.severity === "high"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
                    <span className="font-poppins font-bold text-base text-slate-900 leading-none">
                      {event.daysAway}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                      days
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{event.title}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Affects: <span className="font-medium text-slate-700">{event.affects}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-rose-600 block">{event.impact}%</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${sevBadge}`}>
                      {event.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Realized Recovery Performance (Shows only when sales exist) ─── */}
      {soldRecords.size > 0 && (
        <SessionPerformanceCard
          soldRecords={soldRecords}
          portfolio={portfolio}
          totalSaved={totalSaved}
        />
      )}

      {/* ── Persistent Floating Batch Exit Action Bar ──────────────────── */}
      <AnimatePresence>
        {batchTargets.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-full font-bold text-white text-xs shadow-xl whitespace-nowrap transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#059669", boxShadow: "0 8px 24px rgba(5,150,105,0.35)" }}
            >
              <Package className="w-4 h-4" />
              <span>Liquidate All In Window</span>
              <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {batchTargets.length}
              </span>
              <span className="text-[11px] font-medium bg-black/20 px-2 py-0.5 rounded-full">
                {formatCurrency(batchTargets.reduce((s, a) => s + a.currentValue / 100, 0))}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spatial Scan Modal (Preserved for DIR-003 AI Camera Scanning) ── */}
      <SpatialScanModal
        open={showSpatialModal}
        onOpenChange={setShowSpatialModal}
        onCommitted={() => {
          setDrawerAsset(null);
        }}
      />
    </AppLayout>
  );
}

function SessionPerformanceCard({
  soldRecords,
  portfolio,
  totalSaved,
}: {
  soldRecords: Map<string, { saleValue: number; dropAvoided: number; soldAt: number }>;
  portfolio: { depreciationCliff: { daysAway: number; projectedDrop: number } }[];
  totalSaved: number;
}) {
  const f = formatCurrency;
  const itemsSold = soldRecords.size;
  const totalProceeds = Array.from(soldRecords.values()).reduce((s, r) => s + r.saleValue, 0);
  const totalAtRisk = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const efficiency = totalAtRisk > 0 ? Math.min(100, Math.round((totalSaved / totalAtRisk) * 100)) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          Realized Exit Performance
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active Session
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Exited Items
          </p>
          <p className="font-poppins font-bold text-xl text-slate-900 leading-tight">
            {itemsSold}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">physical assets</p>
        </div>

        <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Gross Proceeds
          </p>
          <p className="font-poppins font-bold text-xl text-emerald-600 leading-tight">
            {f(totalProceeds)}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">recovered value</p>
        </div>

        <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Depreciation Avoided
          </p>
          <p className="font-poppins font-bold text-xl text-emerald-600 leading-tight">
            {f(totalSaved)}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">cliff drop saved</p>
        </div>

        <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Liquidation Efficiency
          </p>
          <p className="font-poppins font-bold text-xl text-purple-700 leading-tight">
            {efficiency}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">of at-risk capital</p>
        </div>
      </div>
    </motion.section>
  );
}
