import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, Activity, ShieldCheck } from "lucide-react";
import AssetDrawer from "@/components/AssetDrawer";

// ── Static sparkline data ─────────────────────────────────────────────────────
const techSectorData = [
  { v: 4000 }, { v: 3000 }, { v: 2000 }, { v: 2780 }, { v: 1890 },
  { v: 2390 }, { v: 3490 }, { v: 4100 }, { v: 4800 }, { v: 5100 },
  { v: 5900 }, { v: 6200 },
];
const volatilityData = [
  { v: 15 }, { v: 18 }, { v: 12 }, { v: 22 }, { v: 28 },
  { v: 25 }, { v: 19 }, { v: 14 }, { v: 12 }, { v: 16 },
  { v: 24 }, { v: 20 },
];

// ── Static transactions ───────────────────────────────────────────────────────
const transactions = [
  { asset: "SpaceX PE",    type: "BUY",     amount: "$420,000", date: "2026-03-12", status: "SETTLED" },
  { asset: "NVIDIA Opt",   type: "SELL",    amount: "$150,000", date: "2026-03-14", status: "PROCESSING" },
  { asset: "Palantir War", type: "BUY",     amount: "$85,000",  date: "2026-03-15", status: "PENDING" },
  { asset: "OpenAI Note",  type: "CONVERT", amount: "$500,000", date: "2026-03-16", status: "SETTLED" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDollars(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

type StatusType = "HOLD" | "LIQUIDATE" | "IN_TRANSIT" | "ACTION_REQUIRED";

const STATUS_LABELS: Record<StatusType, string> = {
  HOLD: "HOLD",
  LIQUIDATE: "LIQUIDATE",
  IN_TRANSIT: "IN TRANSIT",
  ACTION_REQUIRED: "ACTION REQUIRED",
};

const STATUS_COLORS: Record<StatusType, string> = {
  HOLD: "rgba(145,38,239,0.8)",
  LIQUIDATE: "#ef4444",
  IN_TRANSIT: "#f59e0b",
  ACTION_REQUIRED: "#32CD32",
};

// ── Portfolio asset type ──────────────────────────────────────────────────────
interface PortfolioAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [optimisticNetWorth, setOptimisticNetWorth] = useState<number | null>(null);
  const [liquidatingIds, setLiquidatingIds] = useState<Set<string>>(new Set());
  const [drawerAsset, setDrawerAsset] = useState<PortfolioAsset | null>(null);

  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });

  const updateStatus = useUpdateAssetStatus({
    mutation: {
      onMutate: async ({ id, data: body }) => {
        if (body.status === "LIQUIDATE") {
          setLiquidatingIds((prev) => new Set(prev).add(id));
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
        setLiquidatingIds(new Set());
      },
      onSettled: () => {
        setLiquidatingIds(new Set());
        setOptimisticNetWorth(null);
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
      },
    },
  });

  const handleStatusChange = (id: string, status: StatusType) => {
    updateStatus.mutate({ id, data: { status } });
  };

  const portfolio = data?.portfolio ?? [];
  const metrics = data?.metrics;
  const displayedNetWorth = optimisticNetWorth !== null
    ? optimisticNetWorth
    : metrics?.totalNetWorth ?? 0;

  const actionRequiredAssets = portfolio.filter((a) => a.status === "ACTION_REQUIRED");
  const urgentCliffs = portfolio.filter((a) => a.depreciationCliff.daysAway < 15);

  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col" style={{ backgroundColor: "#0B0B0B" }}>

      {/* Drawer — z-index 51, overlays everything */}
      <AssetDrawer
        asset={drawerAsset}
        onClose={() => setDrawerAsset(null)}
        onLiquidate={(id) => handleStatusChange(id, "LIQUIDATE")}
        isLiquidating={drawerAsset ? liquidatingIds.has(drawerAsset.id) : false}
      />

      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <nav className="w-full flex flex-col border-b border-purple-glow">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="font-poppins font-light text-2xl tracking-wider" style={{ color: "#9126EF" }}>
              LIQUID
            </span>
            <div className="hidden md:flex items-center gap-6">
              {["Portfolio", "Markets", "Assets", "Alerts"].map((link) => (
                <button
                  key={link}
                  className="font-montserrat text-sm text-[#9126EF]/70 hover:text-[#9126EF] transition-colors"
                  data-testid={`nav-link-${link.toLowerCase()}`}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-purple-glow"
              style={{ backgroundColor: "#0D0D0F" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#32CD32", boxShadow: "0 0 8px #32CD32" }} />
              <span className="font-montserrat text-xs uppercase font-semibold" style={{ color: "#32CD32" }}>
                Pro Terminal
              </span>
            </div>
            <Avatar className="h-8 w-8 border border-purple-glow cursor-pointer">
              <AvatarFallback className="bg-[#0D0D0F] text-[#9126EF] font-montserrat text-xs">UHN</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Ticker tape */}
        <div className="w-full overflow-hidden flex items-center h-8 border-t border-purple-glow bg-[#0B0B0B] whitespace-nowrap">
          <div className="inline-block ticker-tape font-inter text-xs text-[#9126EF]/80 font-medium space-x-8">
            {["GOLD $3,247.80 +1.2% ▲", "SILVER $32.41 -0.4% ▼", "PLATINUM $1,018.00 +0.8% ▲",
              "REAL ESTATE IDX $842.50 +2.1% ▲", "RARE WHISKY IDX $2,104.00 +0.3% ▲",
              "FINE ART IDX $5,880.00 -1.1% ▼", "DIAMONDS $8,240.00 +0.6% ▲"].map((t, i) => (
              <span key={i}>
                {t.split(" ").map((word, wi) => {
                  const isChange = word.includes("%");
                  const isUp = word.includes("▲");
                  return <span key={wi} style={isChange ? { color: isUp ? "#32CD32" : "#ef4444" } : {}}>{word} </span>;
                })}
                <span className="mx-4 opacity-30">|</span>
              </span>
            ))}
            {["GOLD $3,247.80 +1.2% ▲", "SILVER $32.41 -0.4% ▼", "PLATINUM $1,018.00 +0.8% ▲",
              "REAL ESTATE IDX $842.50 +2.1% ▲", "RARE WHISKY IDX $2,104.00 +0.3% ▲",
              "FINE ART IDX $5,880.00 -1.1% ▼", "DIAMONDS $8,240.00 +0.6% ▲"].map((t, i) => (
              <span key={`dup-${i}`}>
                {t.split(" ").map((word, wi) => {
                  const isChange = word.includes("%");
                  const isUp = word.includes("▲");
                  return <span key={wi} style={isChange ? { color: isUp ? "#32CD32" : "#ef4444" } : {}}>{word} </span>;
                })}
                <span className="mx-4 opacity-30">|</span>
              </span>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 lg:p-12 flex flex-col gap-16">

        {/* ── Hero Metric ──────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center gap-4 py-8">
          <h2 className="font-montserrat text-sm uppercase tracking-[0.2em] text-[#9126EF]/70">
            Total Liquid Net Worth
          </h2>

          {isLoading ? (
            <div className="font-poppins font-bold text-5xl sm:text-6xl md:text-7xl text-white tracking-tight leading-none opacity-30 animate-pulse">
              $—,———,———.——
            </div>
          ) : (
            <h1
              className="font-poppins font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight leading-none transition-all duration-500"
              data-testid="metric-total-net-worth"
              style={optimisticNetWorth !== null ? { color: "#32CD32" } : {}}
            >
              {formatDollars(displayedNetWorth)}
            </h1>
          )}

          {metrics && (
            <div className="flex flex-col items-center gap-1">
              <div className="font-montserrat text-sm font-semibold" style={{ color: "#32CD32" }}>
                +$312,440 today (+1.27%)
              </div>
              {metrics.capitalAtRisk > 0 && (
                <div className="flex items-center gap-2 font-montserrat text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {formatDollars(metrics.capitalAtRisk)} at risk — {urgentCliffs.length} cliff{urgentCliffs.length !== 1 ? "s" : ""} within 15 days
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="w-24 h-px mt-4" style={{ backgroundColor: "rgba(145,38,239,0.5)" }} />

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
            <Button
              variant="outline"
              className="font-montserrat uppercase tracking-wider text-xs border-purple-glow hover:bg-[#9126EF]/10 text-[#9126EF] h-10 px-6 rounded-none bg-transparent"
              data-testid="btn-view-report"
            >
              View Report
            </Button>
            <Button
              className="btn-lime-pulse font-montserrat uppercase tracking-wider text-sm h-12 px-8 rounded-none border-0"
              data-testid="btn-rebalance"
            >
              Rebalance Portfolio
            </Button>
            <Button
              variant="outline"
              className="font-montserrat uppercase tracking-wider text-xs border-purple-glow hover:bg-[#9126EF]/10 text-[#9126EF] h-10 px-6 rounded-none bg-transparent"
              data-testid="btn-set-alert"
            >
              Set Alert
            </Button>
          </div>
        </section>

        {/* ── Digital Twin Tech Portfolio ──────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-l-2 pl-3" style={{ borderColor: "#9126EF" }}>
            <h3 className="font-montserrat text-sm uppercase tracking-widest text-[#9126EF]/80 font-medium">
              Tech Portfolio — Digital Twin
            </h3>
            {isLoading ? (
              <span className="font-inter text-[10px] text-[#9126EF]/40 uppercase tracking-wider animate-pulse">Syncing…</span>
            ) : (
              <span className="font-inter text-[10px] text-[#9126EF]/40 uppercase tracking-wider">{portfolio.length} assets</span>
            )}
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">

            {/* AI Signal card */}
            {(actionRequiredAssets.length > 0 || isLoading) && (
              <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: "#9126EF" }} />
                  <h4 className="font-montserrat font-bold text-sm tracking-wider" style={{ color: "#9126EF" }}>
                    AI SIGNAL DETECTED
                  </h4>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-[#9126EF]/10 animate-pulse w-full" />
                    <div className="h-3 rounded bg-[#9126EF]/10 animate-pulse w-3/4" />
                  </div>
                ) : (
                  <>
                    {actionRequiredAssets.map((a) => (
                      <div key={a.id} className="border-t border-purple-glow pt-3 first:border-t-0 first:pt-0">
                        <p className="font-inter text-xs text-gray-300 leading-relaxed mb-3">
                          <span className="text-white font-medium">{a.model}</span>
                          {" "}— cliff in{" "}
                          <span style={{ color: "#32CD32" }} className="font-bold">{a.depreciationCliff.daysAway}d</span>
                          {" "}({a.depreciationCliff.reason}).{" "}
                          <span className="text-red-400 font-bold">−{formatDollars(a.depreciationCliff.projectedDrop / 100)}</span> projected.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            className="btn-lime-pulse font-montserrat uppercase text-xs h-9 rounded-none flex-1"
                            data-testid={`btn-liquidate-signal-${a.id}`}
                            disabled={liquidatingIds.has(a.id) || updateStatus.isPending}
                            onClick={() => handleStatusChange(a.id, "LIQUIDATE")}
                          >
                            {liquidatingIds.has(a.id) ? "Liquidating…" : "Liquidate Now"}
                          </Button>
                          <Button
                            variant="outline"
                            className="font-montserrat uppercase text-xs h-9 px-3 rounded-none border-purple-glow text-[#9126EF]/80 hover:bg-[#9126EF]/10 bg-transparent"
                            onClick={() => setDrawerAsset(a as PortfolioAsset)}
                          >
                            Analyse
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Dynamic asset cards */}
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="card-terminal p-5 flex flex-col gap-3 rounded-sm break-inside-avoid animate-pulse">
                    <div className="h-3 bg-[#9126EF]/10 rounded w-2/3" />
                    <div className="h-7 bg-[#9126EF]/10 rounded w-1/2 mt-1" />
                    <div className="h-1 bg-[#9126EF]/10 rounded w-full mt-3" />
                  </div>
                ))
              : portfolio.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset as PortfolioAsset}
                    isUpdating={liquidatingIds.has(asset.id)}
                    onStatusChange={handleStatusChange}
                    onOpenDrawer={setDrawerAsset}
                  />
                ))}

            {/* Tech Sector Performance sparkline */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#9126EF]/60" />
                <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase">
                  Tech Sector Performance
                </h4>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={techSectorData}>
                    <defs>
                      <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9126EF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#9126EF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#9126EF" strokeWidth={2} fillOpacity={1} fill="url(#colorTech)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Portfolio Health */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9126EF]/60" />
                <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase">
                  Portfolio Health
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <HealthMetric label="Diversification" value="87" suffix="/100" />
                <HealthMetric label="Liquidity Score" value="72" suffix="/100" />
                <HealthMetric label="Risk Rating" value="MODERATE" valueColor="#f59e0b" />
                <HealthMetric label="Yield" value="4.2%" suffix=" APY" valueColor="#32CD32" />
              </div>
            </div>

            {/* Volatility Index sparkline */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase">
                Volatility Index
              </h4>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volatilityData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#32CD32" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#32CD32" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#32CD32" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase mb-1">
                Recent Transactions
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-glow">
                      {["Asset", "Type", "Amount", "Status"].map((h) => (
                        <th key={h} className="font-montserrat text-[10px] uppercase text-[#9126EF]/70 pb-2 font-medium pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-inter text-xs">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-purple-glow/30 hover:bg-white/5 transition-colors" data-testid={`row-tx-${i}`}>
                        <td className="py-3 font-medium text-gray-200 pr-3">{tx.asset}</td>
                        <td className={`py-3 font-bold pr-3 ${tx.type === "BUY" ? "text-[#32CD32]" : tx.type === "SELL" ? "text-red-400" : "text-[#9126EF]"}`}>
                          {tx.type}
                        </td>
                        <td className="py-3 font-mono text-gray-300 pr-3">{tx.amount}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider border rounded-sm ${
                            tx.status === "SETTLED"   ? "border-[#32CD32] text-[#32CD32] bg-[#32CD32]/10" :
                            tx.status === "PENDING"   ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" :
                                                        "border-[#9126EF] text-[#9126EF] bg-[#9126EF]/10"
                          }`}>{tx.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      </main>

      <footer className="w-full border-t border-purple-glow/50 py-6 mt-12 bg-[#0B0B0B]">
        <div className="max-w-[1600px] mx-auto px-6 text-center">
          <p className="font-montserrat text-xs text-[#9126EF]/50 tracking-widest uppercase">
            LIQUID © 2026 — Real-Time Data. Zero Compromise.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────
interface AssetCardProps {
  asset: PortfolioAsset;
  isUpdating: boolean;
  onStatusChange: (id: string, status: StatusType) => void;
  onOpenDrawer: (asset: PortfolioAsset) => void;
}

function AssetCard({ asset, isUpdating, onStatusChange, onOpenDrawer }: AssetCardProps) {
  const currentDollars = asset.currentValue / 100;
  const purchaseDollars = asset.purchasePrice / 100;
  const pnl = ((currentDollars - purchaseDollars) / purchaseDollars) * 100;
  const isUp = pnl >= 0;
  const pnlColor = isUp ? "#32CD32" : "#ef4444";
  const status = asset.status as StatusType;
  const isUrgent = asset.depreciationCliff.daysAway < 15;
  const isLiquidated = status === "LIQUIDATE" || status === "IN_TRANSIT";

  return (
    <div
      className="card-terminal p-5 flex flex-col gap-3 rounded-sm break-inside-avoid cursor-pointer group"
      data-testid={`card-asset-${asset.id}`}
      style={isUrgent && !isLiquidated ? { borderColor: "rgba(239,68,68,0.5)" } : {}}
      onClick={() => onOpenDrawer(asset)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-montserrat font-semibold text-sm text-gray-200 leading-tight group-hover:text-white transition-colors">
            {asset.model}
          </h4>
          <p className="font-inter text-[10px] text-[#9126EF]/60 uppercase tracking-wider mt-0.5">{asset.category}</p>
        </div>
        <span
          className="font-montserrat text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border shrink-0"
          style={{ color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] + "55", backgroundColor: STATUS_COLORS[status] + "15" }}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <span className="font-poppins font-bold text-2xl text-white">{formatDollars(currentDollars)}</span>
        <span className="font-inter font-medium text-sm" style={{ color: pnlColor }}>
          {isUp ? "+" : ""}{pnl.toFixed(1)}% {isUp ? "▲" : "▼"}
        </span>
      </div>

      {/* Depreciation Cliff Warning */}
      {isUrgent && !isLiquidated && (
        <div className="flex items-start gap-2 p-2.5 rounded-sm mt-1" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-[10px] text-red-300 leading-tight">
              Cliff in <span className="font-bold">{asset.depreciationCliff.daysAway}d</span> — {asset.depreciationCliff.reason}
            </p>
            <p className="font-inter text-[10px] text-red-400 font-bold mt-0.5">
              −{formatDollars(asset.depreciationCliff.projectedDrop / 100)} projected
            </p>
          </div>
        </div>
      )}

      {/* Tap hint */}
      <div className="font-inter text-[9px] text-[#9126EF]/30 uppercase tracking-wider group-hover:text-[#9126EF]/60 transition-colors">
        Tap to analyse →
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
        {!isLiquidated ? (
          <>
            <Button
              className="btn-lime-pulse font-montserrat uppercase text-[10px] h-8 flex-1 rounded-none"
              data-testid={`btn-liquidate-${asset.id}`}
              disabled={isUpdating}
              onClick={(e) => { e.stopPropagation(); onStatusChange(asset.id, "LIQUIDATE"); }}
            >
              {isUpdating ? "…" : "Liquidate"}
            </Button>
            <Button
              variant="outline"
              className="font-montserrat uppercase text-[10px] h-8 px-3 rounded-none border-purple-glow text-[#9126EF]/80 hover:bg-[#9126EF]/10 bg-transparent"
              data-testid={`btn-hold-${asset.id}`}
              onClick={(e) => { e.stopPropagation(); onStatusChange(asset.id, "HOLD"); }}
            >
              Hold
            </Button>
          </>
        ) : (
          <div className="font-montserrat text-[10px] uppercase tracking-wider text-red-400 font-bold pt-1">
            {status === "LIQUIDATE" ? "Pending liquidation…" : "In transit"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Health Metric ─────────────────────────────────────────────────────────────
function HealthMetric({ label, value, suffix = "", valueColor = "#ffffff" }: {
  label: string; value: string; suffix?: string; valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-montserrat text-[10px] text-[#9126EF]/80 uppercase tracking-wide">{label}</span>
      <span className="font-poppins font-bold text-lg leading-none" style={{ color: valueColor }}>
        {value}
        {suffix && <span className="text-[10px] font-normal text-gray-500 ml-0.5">{suffix}</span>}
      </span>
    </div>
  );
}
