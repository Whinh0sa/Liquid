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
  TrendingDown,
  Clock,
  Zap,
  BarChart2,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";
import AppLayout from "@/components/AppLayout";
import AssetDrawer from "@/components/AssetDrawer";
import { formatCurrencyWhole } from "@/lib/currency";
import { URGENCY_PILL } from "@/lib/urgency";
import { useToast } from "@/hooks/use-toast";

type FilterTab = "ALL" | UrgencyLevel;

export default function Analysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });
  const portfolio = data?.portfolio ?? [];

  const [search, setSearch] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState<FilterTab>("ALL");
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const updateStatusMutation = useUpdateAssetStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        toast({
          title: "Asset status updated",
          description: "Portfolio liquidation ledger re-computed.",
        });
        setSelectedAsset(null);
      },
    },
  });

  const enriched = useMemo(() =>
    portfolio.map((a) => {
      const sw = computeSellWindow(
        a.depreciationCliff.daysAway,
        a.depreciationCliff.projectedDrop / 100,
      );
      const current = a.currentValue / 100;
      const purchase = a.purchasePrice / 100;
      const pnl = purchase > 0 ? ((current - purchase) / purchase) * 100 : 0;
      const dropDollars = a.depreciationCliff.projectedDrop / 100;
      const dropPct = current > 0 ? (dropDollars / current) * 100 : 0;
      const dailyDecay = a.depreciationCliff.daysAway > 0
        ? dropDollars / a.depreciationCliff.daysAway
        : 0;

      return {
        ...a,
        sw,
        current,
        purchase,
        pnl,
        dropDollars,
        dropPct,
        dailyDecay,
      };
    }),
  [portfolio]);

  const totalAtRisk = useMemo(
    () => enriched.reduce((s, a) => s + a.dropDollars, 0),
    [enriched],
  );

  const totalDailyDecay = useMemo(
    () => enriched.reduce((s, a) => s + a.dailyDecay, 0),
    [enriched],
  );

  const urgentCount = useMemo(
    () => enriched.filter((a) => a.sw.urgency === "WINDOW" || a.sw.urgency === "URGENT").length,
    [enriched],
  );

  const avgDays = useMemo(() => {
    if (enriched.length === 0) return 0;
    return Math.round(
      enriched.reduce((s, a) => s + a.depreciationCliff.daysAway, 0) / enriched.length,
    );
  }, [enriched]);

  const filteredAssets = useMemo(() => {
    return enriched.filter((a) => {
      const matchesSearch =
        a.model.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase());
      const matchesTab =
        selectedUrgency === "ALL" ? true : a.sw.urgency === selectedUrgency;
      return matchesSearch && matchesTab;
    });
  }, [enriched, search, selectedUrgency]);

  const stats = [
    {
      icon: AlertTriangle,
      label: "Urgent Assets",
      value: `${urgentCount}`,
      sub: "Action window closing",
      tone: "amber" as const,
    },
    {
      icon: TrendingDown,
      label: "Capital At Risk",
      value: formatCurrencyWhole(totalAtRisk),
      sub: "Projected cliff loss",
      tone: "crimson" as const,
    },
    {
      icon: Zap,
      label: "Daily Decay Rate",
      value: formatCurrencyWhole(totalDailyDecay),
      sub: "Amortized burn / 24h",
      tone: "amber" as const,
    },
    {
      icon: Clock,
      label: "Avg Cliff Horizon",
      value: `${avgDays} days`,
      sub: "Mean across inventory",
      tone: "slate" as const,
    },
  ];

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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Terminal
              </span>
              <h1 className="font-poppins font-bold text-2xl sm:text-3xl text-slate-950 tracking-tight">
                Liquidation Terminal
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Portfolio risk breakdown, depreciation curves, and calibrated exit velocity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-600 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Pricing Feed
            </span>
          </div>
        </div>

        {/* 4-Metric Executive Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    s.tone === "crimson"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : s.tone === "amber"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-slate-50 text-slate-600 border border-slate-200"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p
                  className={`font-poppins font-bold text-xl sm:text-2xl tracking-tight ${
                    s.tone === "crimson"
                      ? "text-red-600"
                      : s.tone === "amber"
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Liquidation Table Ledger */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-slate-900">
                Asset Urgency &amp; Valuation Ledger
              </h2>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredAssets.length} of {portfolio.length}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter assets or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] w-full sm:w-56"
                />
              </div>

              {/* Urgency Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/70 overflow-x-auto">
                {(
                  [
                    { key: "ALL", label: "All" },
                    { key: "WINDOW", label: "⚡ Windows" },
                    { key: "URGENT", label: "Urgent" },
                    { key: "CLIFF", label: "Closed" },
                    { key: "PLANNED", label: "Planned" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedUrgency(tab.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedUrgency === tab.key
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table / List */}
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800">No assets match the active filter</p>
              <p className="text-xs text-slate-400">
                Try switching the urgency tab or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Asset &amp; Category</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Basis &amp; P&amp;L</th>
                    <th className="py-3 px-4 text-center">Cliff Horizon</th>
                    <th className="py-3 px-4 text-right">Drop Risk</th>
                    <th className="py-3 px-4 text-center">Urgency</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAssets.map((a) => {
                    const pill = URGENCY_PILL[a.sw.urgency];
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAsset(a)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Asset */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-[#7C3AED] transition-colors">
                              {a.model}
                            </p>
                            <p className="text-[11px] text-slate-400 capitalize">{a.category}</p>
                          </div>
                        </td>

                        {/* Current Value */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrencyWhole(a.current)}
                        </td>

                        {/* Cost & PnL */}
                        <td className="py-3.5 px-4 text-right">
                          <p className="font-mono text-slate-600">{formatCurrencyWhole(a.purchase)}</p>
                          <p
                            className={`font-mono text-[10px] font-semibold ${
                              a.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {a.pnl >= 0 ? "+" : ""}
                            {a.pnl.toFixed(1)}%
                          </p>
                        </td>

                        {/* Cliff Horizon */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800">
                            {a.depreciationCliff.daysAway}d
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {a.sw.sellByLabel.replace("Sell by ", "")}
                          </p>
                        </td>

                        {/* Drop Risk */}
                        <td className="py-3.5 px-4 text-right">
                          <p className="font-mono font-semibold text-red-600">
                            −{formatCurrencyWhole(a.dropDollars)}
                          </p>
                          <p className="font-mono text-[10px] text-red-500">
                            −{a.dropPct.toFixed(0)}%
                          </p>
                        </td>

                        {/* Urgency Pill */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: pill.bg,
                              color: pill.text,
                              border: `1px solid ${pill.border}`,
                            }}
                          >
                            {pill.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsset(a);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-200 border border-slate-200 transition-all"
                          >
                            Inspect
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Strategic Liquidation Playbooks */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-1">
                Prioritize Optimal Windows
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Assets flagged with ⚡ are within their peak secondary pricing window. Listing now recovers the highest percentage of capital.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-1">
                Holding Decay Index
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Daily decay compounds as release dates approach. Monitor the burn rate per 24 hours to schedule exits in advance.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-1">
                Condition-Calibrated Pricing
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Open any asset drawer to calibrate Pristine, Good, or Fair grades, auto-adjusting projected resale quotes and marketplace routing.
              </p>
            </div>
          </div>
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
