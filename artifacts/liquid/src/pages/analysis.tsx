import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetPortfolio, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, TrendingDown, Shield, Zap, Clock,
  BarChart2, AlertTriangle, CheckCircle,
} from "lucide-react";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";
import AppLayout from "@/components/AppLayout";
import { formatCurrencyWhole } from "@/lib/currency";
import { URGENCY_PILL as URGENCY_COLOR } from "@/lib/urgency";


export default function Analysis() {
  const { data, isLoading } = useGetPortfolio({ query: { queryKey: getGetPortfolioQueryKey() } });
  const portfolio = data?.portfolio ?? [];

  const enriched = useMemo(() =>
    portfolio.map((a) => {
      const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
      return { ...a, sw };
    }),
  [portfolio]);

  const byUrgency = useMemo(() => ({
    WINDOW:  enriched.filter(a => a.sw.urgency === "WINDOW"),
    URGENT:  enriched.filter(a => a.sw.urgency === "URGENT"),
    CLIFF:   enriched.filter(a => a.sw.urgency === "CLIFF"),
    PLANNED: enriched.filter(a => a.sw.urgency === "PLANNED"),
  }), [enriched]);

  const totalAtRisk  = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const dailyDecay   = portfolio.reduce((s, a) => {
    const d = a.depreciationCliff.daysAway;
    return d > 0 ? s + a.depreciationCliff.projectedDrop / 100 / d : s;
  }, 0);
  const urgentCount  = byUrgency.WINDOW.length + byUrgency.URGENT.length;
  const avgDays      = portfolio.length > 0
    ? Math.round(portfolio.reduce((s, a) => s + a.depreciationCliff.daysAway, 0) / portfolio.length)
    : 0;

  const stats = [
    { icon: AlertTriangle, label: "Urgent assets",  value: `${urgentCount}`,     sub: "need action now",     color: "#EF4444", bg: "#FEF2F2" },
    { icon: TrendingDown,  label: "Total at risk",  value: formatCurrencyWhole(totalAtRisk),     sub: "projected loss",      color: "#F97316", bg: "#FFF7ED" },
    { icon: Clock,         label: "Avg days left",  value: `${avgDays}d`,        sub: "to cliff across all", color: "#9126EF", bg: "rgba(145,38,239,0.06)" },
    { icon: Zap,           label: "Daily decay",    value: formatCurrencyWhole(dailyDecay),      sub: "amortised loss/day",  color: "#F59E0B", bg: "#FFFBEB" },
  ];

  const urgencyOrder: UrgencyLevel[] = ["CLIFF", "URGENT", "WINDOW", "PLANNED"];

  return (
    <AppLayout>

        {/* Header */}
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-1" style={{ color: "#9126EF" }}>Analysis</p>
              <h1 className="text-3xl font-black text-gray-900">Liquidation Terminal</h1>
              <p className="text-gray-500 mt-1">Full portfolio breakdown by urgency, value, and depreciation risk.</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: s.bg }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Asset list by urgency */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-500" />
              Assets by urgency
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500">{portfolio.length} items</span>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div>
              {urgencyOrder.map((urgency) => {
                const group = byUrgency[urgency];
                if (group.length === 0) return null;
                const uc = URGENCY_COLOR[urgency];
                return (
                  <div key={urgency}>
                    <div className="px-5 py-2.5 border-b border-t border-gray-100 flex items-center gap-2"
                      style={{ backgroundColor: uc.bg + "55" }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: uc.text }}>{uc.label}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: uc.bg, color: uc.text, border: `1px solid ${uc.border}` }}>{group.length}</span>
                    </div>
                    {group.map((a) => {
                      const current  = a.currentValue / 100;
                      const purchase = a.purchasePrice / 100;
                      const pnl      = ((current - purchase) / purchase) * 100;
                      const dropPct  = (a.depreciationCliff.projectedDrop / 100 / current * 100).toFixed(0);
                      return (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{a.category}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{a.model}</p>
                          </div>
                          <div className="text-center shrink-0">
                            <p className="text-[10px] text-gray-400">Cliff in</p>
                            <p className="text-sm font-bold text-gray-900">{a.depreciationCliff.daysAway}d</p>
                          </div>
                          <div className="text-center shrink-0">
                            <p className="text-[10px] text-gray-400">Drop risk</p>
                            <p className="text-sm font-bold text-red-500">−{dropPct}%</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">{formatCurrencyWhole(current)}</p>
                            <p className={`text-[10px] font-semibold ${pnl < 0 ? "text-red-500" : "text-emerald-500"}`}>
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}% P&L
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom tips */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Zap,           color: "#9126EF", bg: "rgba(145,38,239,0.06)", title: "Sell in-window first", body: "Assets with ⚡ next to them are in their optimal resale window. List these immediately." },
            { icon: Shield,        color: "#10B981", bg: "#F0FDF4", title: "Protect your capital",  body: "Every day you hold past the cliff costs you in resale value. Use the daily decay figure above." },
            { icon: CheckCircle,   color: "#F59E0B", bg: "#FFFBEB", title: "Use condition grades",  body: "In the asset drawer, set the condition grade to get condition-adjusted platform estimates." },
          ].map((tip) => (
            <div key={tip.title} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tip.bg }}>
                <tip.icon className="w-5 h-5" style={{ color: tip.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{tip.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
    </AppLayout>
  );
}
