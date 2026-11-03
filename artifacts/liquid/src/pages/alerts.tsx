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
  AlertTriangle,
  BellRing,
  CalendarDays,
  Clock,
  Zap,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Search,
  Cpu,
  TrendingDown,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AssetDrawer from "@/components/AssetDrawer";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";
import { formatCurrencyWhole } from "@/lib/currency";
import { URGENCY_PILL } from "@/lib/urgency";
import AssetImage from "@/components/ui/AssetImage";
import { useToast } from "@/hooks/use-toast";

type AlertFilter = "ALL" | "ACTIONABLE" | "MONITORING";

export default function Alerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });
  const portfolio = data?.portfolio ?? [];

  const [filter, setFilter] = useState<AlertFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const updateStatusMutation = useUpdateAssetStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        toast({
          title: "Asset status updated",
          description: "Alert triggers re-evaluated against latest portfolio status.",
        });
        setSelectedAsset(null);
      },
    },
  });

  // Enrich portfolio with computed urgency and drop values
  const enriched = useMemo(() =>
    portfolio.map((a) => {
      const sw = computeSellWindow(
        a.depreciationCliff.daysAway,
        a.depreciationCliff.projectedDrop / 100,
      );
      const current = a.currentValue / 100;
      const drop = a.depreciationCliff.projectedDrop / 100;
      const dropPct = current > 0 ? (drop / current) * 100 : 0;

      return {
        ...a,
        sw,
        current,
        drop,
        dropPct,
      };
    }),
  [portfolio]);

  const actionable = useMemo(
    () => enriched.filter((a) => a.sw.urgency !== "PLANNED"),
    [enriched],
  );

  const monitoring = useMemo(
    () => enriched.filter((a) => a.sw.urgency === "PLANNED"),
    [enriched],
  );

  const criticalCount = useMemo(
    () => enriched.filter((a) => a.sw.urgency === "CLIFF" || a.sw.urgency === "URGENT").length,
    [enriched],
  );
  const windowCount = useMemo(
    () => enriched.filter((a) => a.sw.urgency === "WINDOW").length,
    [enriched],
  );
  const monitoringCount = monitoring.length;

  const filteredAlerts = useMemo(() => {
    let list =
      filter === "ACTIONABLE"
        ? actionable
        : filter === "MONITORING"
        ? monitoring
        : enriched;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.model.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.depreciationCliff.reason.toLowerCase().includes(q),
      );
    }

    return list;
  }, [filter, actionable, monitoring, enriched, search]);

  const summaryCards = [
    {
      label: "Critical / Urgent Cliffs",
      value: `${criticalCount}`,
      sub: "Immediate capital risk",
      tone: "crimson" as const,
      icon: AlertTriangle,
    },
    {
      label: "Optimal Sell Windows",
      value: `${windowCount}`,
      sub: "Peak recovery active now",
      tone: "emerald" as const,
      icon: Zap,
    },
    {
      label: "Catalysts In Monitoring",
      value: `${monitoringCount}`,
      sub: "Horizon > 14 days",
      tone: "slate" as const,
      icon: CalendarDays,
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Workstation Dashboard
            </Link>
            <h1 className="font-poppins font-bold text-2xl sm:text-3xl text-slate-950 dark:text-slate-100 tracking-tight">
              Catalyst Events &amp; Risk Alerts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automated triggers monitoring product lifecycle shifts, hardware keynote announcements, and secondary market floors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 shadow-xs">
              <BellRing className="w-3.5 h-3.5 text-amber-500" />
              {criticalCount + windowCount} Actionable Triggers
            </span>
          </div>
        </div>

        {/* 3 Summary Metric Cards */}
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-[#131722] rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  card.tone === "crimson"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50"
                    : card.tone === "emerald"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                    : "bg-slate-50 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {card.label}
                </p>
                <p
                  className={`font-poppins font-bold text-xl sm:text-2xl tracking-tight ${
                    card.tone === "crimson"
                      ? "text-red-600 dark:text-red-400"
                      : card.tone === "emerald"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-400">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Alert Feed Container */}
        <section className="bg-white dark:bg-[#131722] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header & Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Active Catalyst Feed
              </h2>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-400">
                {filteredAlerts.length} Active
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search alert by asset or catalyst..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1F2E] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] w-full sm:w-60"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1A1F2E] p-1 rounded-lg border border-slate-200/70 dark:border-slate-700">
                {(
                  [
                    { key: "ALL", label: "All Signals" },
                    { key: "ACTIONABLE", label: "Action Required" },
                    { key: "MONITORING", label: "Monitoring" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      filter === tab.key
                        ? "bg-white dark:bg-[#23283A] text-slate-900 dark:text-slate-100 font-semibold shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#23283A]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feed Content */}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-50 dark:bg-[#1A1F2E] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No active alerts match criteria</p>
              <p className="text-xs text-slate-400">
                All portfolio assets are stable or outside the active filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAlerts.map((a, i) => {
                const pill = URGENCY_PILL[a.sw.urgency];
                const isUrgent = a.sw.urgency === "CLIFF" || a.sw.urgency === "URGENT";
                const isWindow = a.sw.urgency === "WINDOW";

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedAsset(a)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-[#1A1F2E]/70 transition-all cursor-pointer group"
                  >
                    {/* Left: Catalyst Icon & Asset Description */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <AssetImage
                        model={a.model}
                        category={a.category}
                        alt={a.model}
                        aspectRatio="square"
                        className="w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-800 mt-0.5"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#7C3AED] dark:group-hover:text-purple-400 transition-colors truncate">
                            {a.model}
                          </p>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: pill.bg,
                              color: pill.text,
                              border: `1px solid ${pill.border}`,
                            }}
                          >
                            {pill.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {a.depreciationCliff.reason}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            Cliff hits in {a.depreciationCliff.daysAway} days
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {a.sw.sellByLabel}
                        </p>
                      </div>
                    </div>

                    {/* Right: Financial Impact & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrencyWhole(a.current)}
                        </p>
                        <p className="text-[11px] font-mono font-semibold text-red-600 dark:text-red-400">
                          −{formatCurrencyWhole(a.drop)} (−{a.dropPct.toFixed(0)}%)
                        </p>
                        <p className="text-[10px] text-slate-400">At-risk cliff drop</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(a);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#1A1F2E] hover:bg-purple-50 dark:hover:bg-[#23283A] hover:text-[#7C3AED] dark:hover:text-purple-300 hover:border-purple-200 dark:hover:border-purple-800 border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
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
