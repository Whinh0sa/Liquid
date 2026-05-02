import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import { AlertTriangle, TrendingDown, TrendingUp, Shield, BarChart2, Bell, Clock } from "lucide-react";
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
                    onSell={handleSell}
                    onOpen={setDrawerAsset}
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
interface AssetCardProps {
  asset: PortfolioAsset;
  isSelling: boolean;
  onSell: (id: string) => void;
  onOpen: (asset: PortfolioAsset) => void;
}

function AssetCard({ asset, isSelling, onSell, onOpen }: AssetCardProps) {
  const current  = asset.currentValue / 100;
  const purchase = asset.purchasePrice / 100;
  const pnl      = ((current - purchase) / purchase) * 100;
  const isDown   = pnl < 0;
  const cliff    = asset.depreciationCliff;
  const isSold   = asset.status === "LIQUIDATE" || asset.status === "IN_TRANSIT";

  const sellWindow = computeSellWindow(cliff.daysAway, cliff.projectedDrop / 100);
  const urgencyPill = URGENCY_PILL[sellWindow.urgency];

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 cursor-pointer group hover:shadow-md hover:border-gray-300 transition-all duration-200"
      data-testid={`card-asset-${asset.id}`}
      onClick={() => onOpen(asset)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{asset.category}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">
            {asset.model}
          </h3>
        </div>
        {!isSold && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 whitespace-nowrap"
            style={{ color: urgencyPill.text, backgroundColor: urgencyPill.bg, borderColor: urgencyPill.border }}
          >
            {urgencyPill.label}
          </span>
        )}
        {isSold && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400 shrink-0">
            Sold
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline justify-between">
        <span className="font-poppins font-bold text-2xl text-gray-900">{fmt(current)}</span>
        <span className={`text-sm font-semibold flex items-center gap-0.5 ${isDown ? "text-red-500" : "text-emerald-500"}`}>
          {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
        </span>
      </div>

      {/* Sell-by date pill */}
      {!isSold && (
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
      )}

      {/* CTAs */}
      <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
        {isSold ? (
          <div className="text-sm font-medium text-gray-400 py-1">
            {asset.status === "LIQUIDATE" ? "Pending sale…" : "In transit"}
          </div>
        ) : (
          <>
            <button
              data-testid={`btn-sell-${asset.id}`}
              disabled={isSelling}
              onClick={(e) => { e.stopPropagation(); onSell(asset.id); }}
              className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-all"
              style={{ backgroundColor: isSelling ? "#6EE7B7" : "#10B981" }}
            >
              {isSelling ? "Selling…" : "Sell Now"}
            </button>
            <button
              className="h-9 px-4 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              data-testid={`btn-analyse-${asset.id}`}
              onClick={(e) => { e.stopPropagation(); onOpen(asset); }}
            >
              Analyse
            </button>
          </>
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
