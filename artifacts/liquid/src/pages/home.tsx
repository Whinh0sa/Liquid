import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import { AlertTriangle, TrendingDown, TrendingUp, Shield, BarChart2, Bell, BellRing, Clock, CheckCircle, ShieldCheck, X } from "lucide-react";
import AssetDrawer from "@/components/AssetDrawer";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

type StatusType = "HOLD" | "LIQUIDATE" | "IN_TRANSIT" | "ACTION_REQUIRED";

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
  { label: "GOLD",         price: "$3,247.80", change: "+1.2%", up: true },
  { label: "SILVER",       price: "$32.41",    change: "-0.4%", up: false },
  { label: "PLATINUM",     price: "$1,018.00", change: "+0.8%", up: true },
  { label: "REAL ESTATE",  price: "$842.50",   change: "+2.1%", up: true },
  { label: "RARE WHISKY",  price: "$2,104.00", change: "+0.3%", up: true },
  { label: "FINE ART IDX", price: "$5,880.00", change: "-1.1%", up: false },
  { label: "DIAMONDS",     price: "$8,240.00", change: "+0.6%", up: true },
];

const URGENCY_PILL: Record<UrgencyLevel, { label: string; bg: string; text: string; border: string }> = {
  PLANNED:  { label: "Plan ahead", bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  WINDOW:   { label: "⚡ Sell now", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  URGENT:   { label: "Last chance", bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  CLIFF:    { label: "Window closed", bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

export default function Home() {
  const queryClient = useQueryClient();
  const [optimisticNetWorth, setOptimisticNetWorth] = useState<number | null>(null);
  const [sellingIds, setSellingIds] = useState<Set<string>>(new Set());
  const [soldRecords, setSoldRecords] = useState<Map<string, { saleValue: number; dropAvoided: number; soldAt: number }>>(new Map());
  const [priceAlerts, setPriceAlerts] = useState<Map<string, number>>(new Map());

  const onSetAlert = (id: string, price: number | null) => {
    setPriceAlerts((prev) => {
      const next = new Map(prev);
      if (price === null) next.delete(id);
      else next.set(id, price);
      return next;
    });
  };
  const [drawerAsset, setDrawerAsset] = useState<PortfolioAsset | null>(null);

  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });

  const updateStatus = useUpdateAssetStatus({
    mutation: {
      onMutate: async ({ id, data: body }) => {
        if (body.status === "LIQUIDATE") {
          setSellingIds((prev) => new Set(prev).add(id));
          const prev = data?.metrics.totalNetWorth ?? null;
          const asset = data?.portfolio.find((a) => a.id === id);
          if (asset && data) {
            setOptimisticNetWorth(data.metrics.totalNetWorth - asset.currentValue / 100);
          }
          return { previousNetWorth: prev };
        }
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

  const handleSell = (id: string) => {
    const asset = portfolio.find((a) => a.id === id);
    if (asset) {
      setSoldRecords((prev) => {
        const next = new Map(prev);
        next.set(id, {
          saleValue:   asset.currentValue / 100,
          dropAvoided: asset.depreciationCliff.projectedDrop / 100,
          soldAt:      Date.now(),
        });
        return next;
      });
    }
    updateStatus.mutate({ id, data: { status: "LIQUIDATE" } });
  };

  const portfolio = data?.portfolio ?? [];
  const metrics   = data?.metrics;
  const displayedNetWorth = optimisticNetWorth !== null
    ? optimisticNetWorth
    : metrics?.totalNetWorth ?? 0;

  const urgentAssets = portfolio.filter(
    (a) => a.depreciationCliff.daysAway <= 14 && a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT",
  );

  const firedAlerts = portfolio.filter((a) => {
    const floor = priceAlerts.get(a.id);
    return floor !== undefined && a.currentValue / 100 <= floor &&
      a.status !== "LIQUIDATE" && a.status !== "IN_TRANSIT" && !sellingIds.has(a.id);
  });

  // Total depreciation avoided across all sold assets this session
  const totalSaved = useMemo(() => {
    let sum = 0;
    soldRecords.forEach((r) => { sum += r.dropAvoided; });
    return sum;
  }, [soldRecords]);

  // Count assets currently in their sell window
  const windowOpenCount = portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return sw.urgency === "WINDOW";
  }).length;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ backgroundColor: "#F9FAFB" }}>

      <AssetDrawer
        asset={drawerAsset}
        onClose={() => setDrawerAsset(null)}
        onSell={handleSell}
        isSelling={drawerAsset ? sellingIds.has(drawerAsset.id) : false}
      />

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <span className="font-poppins font-bold text-xl text-blue-600">Liquid</span>
            <div className="hidden md:flex items-center gap-1">
              {["Portfolio", "Markets", "Assets", "Alerts"].map((link) => (
                <button
                  key={link}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  data-testid={`nav-link-${link.toLowerCase()}`}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">UH</span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="w-full overflow-hidden h-8 bg-gray-50 border-t border-gray-100 flex items-center whitespace-nowrap">
          <div className="inline-block ticker-tape font-inter text-xs font-medium text-gray-500 space-x-6">
            {[...TICKERS, ...TICKERS].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className="font-semibold text-gray-700">{t.label}</span>
                <span>{t.price}</span>
                <span style={{ color: t.up ? "#10B981" : "#EF4444" }} className="font-semibold">
                  {t.change} {t.up ? "▲" : "▼"}
                </span>
                <span className="mx-3 text-gray-300">|</span>
              </span>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* ── Hero: Net Worth ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Portfolio Value</p>
              {isLoading ? (
                <div className="h-10 w-52 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <h1
                  className="font-poppins font-bold text-4xl sm:text-5xl text-gray-900 tracking-tight transition-colors duration-500"
                  data-testid="metric-total-net-worth"
                  style={optimisticNetWorth !== null ? { color: "#10B981" } : {}}
                >
                  {fmt(displayedNetWorth)}
                </h1>
              )}
              {metrics && (
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +$312,440 today (+1.27%)
                  </span>
                  {metrics.capitalAtRisk > 0 && (
                    <span className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {fmt(metrics.capitalAtRisk)} at risk
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                data-testid="btn-rebalance"
              >
                Rebalance
              </button>
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                data-testid="btn-view-report"
              >
                Full Report
              </button>
            </div>
          </div>

          {/* Total Saved counter — appears after first sale */}
          <AnimatePresence>
            {totalSaved > 0 && (
              <motion.div
                key="total-saved"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Depreciation avoided this session</p>
                      <p className="text-xs text-emerald-700 font-medium">
                        {soldRecords.size} asset{soldRecords.size > 1 ? "s" : ""} sold at optimal price
                      </p>
                    </div>
                  </div>
                  <motion.span
                    key={totalSaved}
                    initial={{ scale: 1.15, color: "#059669" }}
                    animate={{ scale: 1, color: "#059669" }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="font-poppins font-bold text-xl text-emerald-600"
                  >
                    +{fmt(totalSaved)}
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <SummaryTile label="Items Tracked" value={isLoading ? "—" : `${portfolio.length}`} icon={<BarChart2 className="w-4 h-4 text-blue-500" />} />
            <SummaryTile label="Sell Windows Open" value={isLoading ? "—" : `${windowOpenCount}`} valueColor={windowOpenCount > 0 ? "#10B981" : "#1F2937"} icon={<Clock className="w-4 h-4 text-emerald-500" />} />
            <SummaryTile label="Urgent Alerts" value={isLoading ? "—" : `${urgentAssets.length}`} valueColor={urgentAssets.length > 0 ? "#EF4444" : "#1F2937"} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          </div>
        </section>

        {/* ── Sell window open banner ──────────────────────────────────────── */}
        {windowOpenCount > 0 && !isLoading && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 mb-1">
                {windowOpenCount} item{windowOpenCount > 1 ? "s" : ""} in optimal sell window right now
              </p>
              <p className="text-sm text-emerald-700">
                {portfolio
                  .filter((a) => {
                    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
                    return sw.urgency === "WINDOW";
                  })
                  .map((a) => {
                    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
                    return (
                      <button
                        key={a.id}
                        className="underline underline-offset-2 hover:text-emerald-900 mr-3 font-medium"
                        onClick={() => setDrawerAsset(a as PortfolioAsset)}
                      >
                        {a.model} — {sw.sellByLabel}
                      </button>
                    );
                  })}
              </p>
            </div>
          </div>
        )}

        {/* ── Urgent alerts banner ─────────────────────────────────────────── */}
        {urgentAssets.length > 0 && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">
                {urgentAssets.length} item{urgentAssets.length > 1 ? "s" : ""} at risk of depreciation
              </p>
              <p className="text-sm text-red-600">
                {urgentAssets.map((a) => (
                  <button
                    key={a.id}
                    className="underline underline-offset-2 hover:text-red-800 mr-3 font-medium"
                    onClick={() => setDrawerAsset(a as PortfolioAsset)}
                  >
                    {a.model} ({a.depreciationCliff.daysAway}d)
                  </button>
                ))}
              </p>
            </div>
          </div>
        )}

        {/* ── Price alert fired banner ──────────────────────────────────────── */}
        <AnimatePresence>
          {firedAlerts.length > 0 && !isLoading && (
            <motion.div
              key="fired-alerts"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <BellRing className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" style={{ animation: "bounce 1s infinite" }} />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {firedAlerts.length} price floor alert{firedAlerts.length > 1 ? "s" : ""} triggered
                </p>
                <p className="text-sm text-amber-700">
                  {firedAlerts.map((a) => (
                    <button
                      key={a.id}
                      className="underline underline-offset-2 hover:text-amber-900 mr-3 font-medium"
                      onClick={() => setDrawerAsset(a as PortfolioAsset)}
                    >
                      {a.model} — floor {fmt(priceAlerts.get(a.id)!)}
                    </button>
                  ))}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Asset Grid ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Your Items</h2>
            {!isLoading && (
              <span className="text-sm text-gray-400">{portfolio.length} items tracked</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                    <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
                    <div className="h-6 bg-gray-100 rounded w-2/3 mb-4" />
                    <div className="h-8 bg-gray-100 rounded w-full" />
                  </div>
                ))
              : portfolio.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset as PortfolioAsset}
                    isSelling={sellingIds.has(asset.id)}
                    soldRecord={soldRecords.get(asset.id)}
                    alertPrice={priceAlerts.get(asset.id)}
                    onSell={handleSell}
                    onOpen={setDrawerAsset}
                    onSetAlert={onSetAlert}
                  />
                ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">How sell windows are calculated</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              Each item's optimal sell window opens 7 days before the depreciation cliff and closes 3 days before — giving resale platforms time to process. Selling inside the window maximises your price before the market reprices.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="font-poppins font-bold text-blue-600">Liquid</span>
          <p className="text-xs text-gray-400">© 2026 Liquid. Sell smart, not late.</p>
        </div>
      </footer>
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────
interface SoldRecord { saleValue: number; dropAvoided: number; soldAt: number }

interface AssetCardProps {
  asset: PortfolioAsset;
  isSelling: boolean;
  soldRecord?: SoldRecord;
  alertPrice?: number;
  onSell: (id: string) => void;
  onOpen: (asset: PortfolioAsset) => void;
  onSetAlert: (id: string, price: number | null) => void;
}

function AssetCard({ asset, isSelling, soldRecord, alertPrice, onSell, onOpen, onSetAlert }: AssetCardProps) {
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertInput, setAlertInput]         = useState("");

  const current  = asset.currentValue / 100;
  const purchase = asset.purchasePrice / 100;
  const pnl      = ((current - purchase) / purchase) * 100;
  const isDown   = pnl < 0;
  const cliff    = asset.depreciationCliff;
  const isSold   = asset.status === "LIQUIDATE" || asset.status === "IN_TRANSIT";

  // Swap to Recovery Card once selling starts or API confirms sale
  if (isSelling || isSold) {
    return <RecoveryCard asset={asset} soldRecord={soldRecord} />;
  }

  const sellWindow      = computeSellWindow(cliff.daysAway, cliff.projectedDrop / 100);
  const urgencyPill     = URGENCY_PILL[sellWindow.urgency];
  const isAlertFired    = alertPrice !== undefined && current <= alertPrice;
  const alertHasBeenSet = alertPrice !== undefined;

  const confirmAlert = () => {
    const v = parseFloat(alertInput);
    if (!isNaN(v) && v > 0) {
      onSetAlert(asset.id, v);
      setShowAlertInput(false);
      setAlertInput("");
    }
  };

  return (
    <div
      className="bg-white rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group transition-all duration-300"
      data-testid={`card-asset-${asset.id}`}
      onClick={() => onOpen(asset)}
      style={{
        border: isAlertFired
          ? "1.5px solid #F59E0B"
          : alertHasBeenSet
          ? "1.5px solid #FCD34D"
          : "1px solid #E5E7EB",
        boxShadow: isAlertFired ? "0 0 0 3px rgba(245,158,11,0.12)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">
            {asset.model}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Amber bell badge if alert is set */}
          {alertHasBeenSet && (
            <span
              className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full border"
              style={isAlertFired
                ? { color: "#92400E", backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }
                : { color: "#B45309", backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
            >
              {isAlertFired
                ? <BellRing className="w-2.5 h-2.5" />
                : <Bell className="w-2.5 h-2.5" />}
              {fmt(alertPrice)}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap"
            style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg, borderColor: urgencyPill.border }}
          >
            {urgencyPill.label}
          </span>
        </div>
      </div>

      {/* Alert fired callout */}
      {isAlertFired && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            Floor hit — value at or below your {fmt(alertPrice)} alert
          </p>
        </div>
      )}

      {/* Value */}
      <div className="flex items-baseline justify-between">
        <span className="font-poppins font-bold text-2xl text-gray-900">{fmt(current)}</span>
        <span className={`text-sm font-semibold flex items-center gap-0.5 ${isDown ? "text-red-500" : "text-emerald-500"}`}>
          {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
        </span>
      </div>

      {/* Sell-by date pill */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg }}
        >
          <Clock className="w-3 h-3" />
          {sellWindow.sellByLabel}
        </div>
        <span className="text-xs text-gray-400">
          −{fmt(cliff.projectedDrop / 100)} in {cliff.daysAway}d
        </span>
      </div>

      {/* CTAs */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          data-testid={`btn-sell-${asset.id}`}
          onClick={(e) => { e.stopPropagation(); onSell(asset.id); }}
          className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-all"
          style={{ backgroundColor: "#10B981" }}
        >
          Sell Now
        </button>
        <button
          className="h-9 px-4 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          data-testid={`btn-analyse-${asset.id}`}
          onClick={(e) => { e.stopPropagation(); onOpen(asset); }}
        >
          Analyse
        </button>
      </div>

      {/* Price floor alert row */}
      <div className="border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
        {!alertHasBeenSet ? (
          showAlertInput ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-400 shrink-0">Floor $</span>
              <input
                type="number"
                value={alertInput}
                onChange={(e) => setAlertInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmAlert(); if (e.key === "Escape") { setShowAlertInput(false); setAlertInput(""); }}}
                placeholder={current.toFixed(0)}
                autoFocus
                className="flex-1 h-7 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400 min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); confirmAlert(); }}
                className="h-7 px-2.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 shrink-0"
              >Set</button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowAlertInput(false); setAlertInput(""); }}
                className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-lg shrink-0"
              ><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAlertInput(true); setAlertInput(current.toFixed(0)); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-500 transition-colors"
            >
              <Bell className="w-3 h-3" />
              Set price floor alert
            </button>
          )
        ) : (
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isAlertFired ? "text-amber-600" : "text-amber-500"}`}>
              <Bell className="w-3 h-3" />
              Alert set at {fmt(alertPrice)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onSetAlert(asset.id, null); }}
              className="text-gray-300 hover:text-gray-500 transition-colors"
              title="Remove alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recovery Card ─────────────────────────────────────────────────────────────
function formatTimeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function RecoveryCard({ asset, soldRecord }: { asset: PortfolioAsset; soldRecord?: SoldRecord }) {
  const saleValue   = soldRecord?.saleValue   ?? asset.currentValue / 100;
  const dropAvoided = soldRecord?.dropAvoided ?? asset.depreciationCliff.projectedDrop / 100;
  const wouldBeWorth = Math.max(saleValue - dropAvoided, 0);
  const barPct = saleValue > 0 ? Math.round((wouldBeWorth / saleValue) * 100) : 0;

  return (
    <div
      className="rounded-2xl border border-emerald-200 p-5 flex flex-col gap-4"
      style={{ background: "linear-gradient(145deg, #f0fdf4 0%, #ffffff 55%)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{asset.model}</h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
          <CheckCircle className="w-3 h-3" />
          PROTECTED
        </span>
      </div>

      {/* Values: locked-in vs would-be */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Locked in</p>
          <span className="font-poppins font-bold text-2xl text-emerald-600">{fmt(saleValue)}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Market now</p>
          <span className="font-poppins font-bold text-lg text-red-400 line-through decoration-red-300">{fmt(wouldBeWorth)}</span>
        </div>
      </div>

      {/* Comparison bar */}
      <div>
        <div className="relative h-2.5 bg-red-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-emerald-400"
            style={{ width: `${Math.max(barPct, 4)}%`, transition: "width 0.8s ease" }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1 font-medium">
          <span className="text-emerald-600">You: {fmt(saleValue)}</span>
          <span className="text-red-400">Market: {fmt(wouldBeWorth)}</span>
        </div>
      </div>

      {/* Saved pill + timestamp */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">+{fmt(dropAvoided)} saved</span>
        </div>
        {soldRecord && (
          <span className="text-[11px] text-gray-400 font-medium">{formatTimeAgo(soldRecord.soldAt)}</span>
        )}
      </div>
    </div>
  );
}

// ── Summary Tile ──────────────────────────────────────────────────────────────
function SummaryTile({ label, value, icon, valueColor = "#1F2937" }: {
  label: string; value: string; icon: React.ReactNode; valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400">{icon}</div>
      <span className="text-lg font-bold" style={{ color: valueColor }}>{value}</span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}
