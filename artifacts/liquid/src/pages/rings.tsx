import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetPortfolio, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Activity, TrendingUp, Shield, Zap } from "lucide-react";
import { computeSellWindow } from "@/lib/sellWindow";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <span className="font-poppins font-bold text-xl text-blue-600">Liquid</span>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Dashboard</Link>
            <Link href="/analysis" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Analysis</Link>
            <Link href="/rings" className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50">Rings</Link>
            <Link href="/alerts" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Alerts</Link>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">JD</span>
        </div>
      </div>
    </nav>
  );
}

export default function Rings() {
  const { data, isLoading } = useGetPortfolio({ query: { queryKey: getGetPortfolioQueryKey() } });
  const portfolio = data?.portfolio ?? [];

  const healthScore = useMemo(() => {
    if (portfolio.length === 0) return { grade: "A", score: 100, color: "#10B981", label: "Excellent" };
    let score = 100;
    portfolio.forEach((a) => {
      const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
      if (sw.urgency === "CLIFF")        score -= 28;
      else if (sw.urgency === "URGENT")  score -= 18;
      else if (sw.urgency === "WINDOW")  score -= 5;
      else                               score += 3;
    });
    score = Math.min(100, Math.max(0, score));
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
    const color = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
    const label = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Fair" : score >= 45 ? "At risk" : "Critical";
    return { grade, score, color, label };
  }, [portfolio]);

  const totalAtRisk  = portfolio.reduce((s, a) => s + a.depreciationCliff.projectedDrop / 100, 0);
  const totalValue   = portfolio.reduce((s, a) => s + a.currentValue / 100, 0);
  const riskPct      = totalValue > 0 ? Math.min(100, Math.round((totalAtRisk / totalValue) * 100)) : 0;
  const windowCount  = portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return sw.urgency === "WINDOW" || sw.urgency === "URGENT";
  }).length;
  const actionPct    = portfolio.length > 0 ? Math.round((windowCount / portfolio.length) * 100) : 0;

  const SIZE = 260; const CX = 130; const CY = 130; const SW = 16;
  const rings = [
    { label: "Portfolio Health",  desc: "Overall score based on urgency mix",  value: healthScore.score, color: "#2563EB", track: "#DBEAFE", radius: 100, detail: `${healthScore.grade} — ${healthScore.label}` },
    { label: "Capital at Risk",   desc: "At-risk value vs total portfolio",     value: 100 - riskPct,     color: "#10B981", track: "#D1FAE5", radius: 78,  detail: `${100 - riskPct}% protected` },
    { label: "Action Required",   desc: "Assets needing attention now",         value: 100 - actionPct,   color: "#F59E0B", track: "#FEF3C7", radius: 56,  detail: `${windowCount} of ${portfolio.length} need action` },
  ];

  const breakdownItems = portfolio.map((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    const score = sw.urgency === "CLIFF" ? 10 : sw.urgency === "URGENT" ? 35 : sw.urgency === "WINDOW" ? 65 : 90;
    const color = sw.urgency === "CLIFF" ? "#EF4444" : sw.urgency === "URGENT" ? "#F97316" : sw.urgency === "WINDOW" ? "#10B981" : "#2563EB";
    return { ...a, score, color, sw };
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-blue-600 mb-1">Portfolio Rings</p>
          <h1 className="text-3xl font-black text-gray-900">Health Scorecard</h1>
          <p className="text-gray-500 mt-1">Concentric rings map your portfolio health, capital risk, and urgency status.</p>
        </div>

        {/* Main ring display */}
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm items-center">
          {isLoading ? (
            <div style={{ width: SIZE, height: SIZE }} className="rounded-full bg-gray-100 animate-pulse" />
          ) : (
            <div className="flex items-center justify-center">
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {rings.map((ring) => {
                  const circ   = 2 * Math.PI * ring.radius;
                  const filled = Math.max(0, (ring.value / 100) * circ);
                  return (
                    <g key={ring.label}>
                      <circle cx={CX} cy={CY} r={ring.radius} fill="none" stroke={ring.track} strokeWidth={SW} />
                      <circle cx={CX} cy={CY} r={ring.radius} fill="none" stroke={ring.color}
                        strokeWidth={SW} strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ}`}
                        transform={`rotate(-90 ${CX} ${CY})`}
                        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
                    </g>
                  );
                })}
                <text x={CX} y={CY - 14} textAnchor="middle" fontSize="44" fontWeight="900" fill="#1F2937" fontFamily="'Poppins', sans-serif">
                  {healthScore.grade}
                </text>
                <text x={CX} y={CY + 12} textAnchor="middle" fontSize="12" fill="#9CA3AF" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.8">
                  {healthScore.label.toUpperCase()}
                </text>
                <text x={CX} y={CY + 30} textAnchor="middle" fontSize="10" fill="#D1D5DB" fontFamily="Inter, sans-serif">
                  {healthScore.score}/100
                </text>
              </svg>
            </div>
          )}

          <div className="space-y-6">
            {rings.map((ring, i) => (
              <motion.div key={ring.label}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ring.color }} />
                    <span className="text-sm font-semibold text-gray-900">{ring.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: ring.color }}>{ring.detail}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: ring.track }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${ring.value}%` }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: i * 0.1 }}
                    style={{ backgroundColor: ring.color }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{ring.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Per-asset health bars */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Per-asset health breakdown
          </h2>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {breakdownItems.map((a, idx) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-semibold text-gray-700 w-40 truncate shrink-0">{a.model}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${a.score}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: idx * 0.05 }}
                        style={{ backgroundColor: a.color }} />
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: a.color }}>
                      {a.sw.urgency === "CLIFF" ? "Closed" : a.sw.urgency === "URGENT" ? "Urgent" : a.sw.urgency === "WINDOW" ? "Open" : "Planned"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 w-16 text-right">{fmt(a.currentValue / 100)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: "Total portfolio value", value: fmt(totalValue),   color: "#2563EB", bg: "#EFF6FF" },
            { icon: Shield,     label: "Total at risk",         value: fmt(totalAtRisk),  color: "#EF4444", bg: "#FEF2F2" },
            { icon: Zap,        label: "Assets need action",    value: `${windowCount}`,  color: "#F59E0B", bg: "#FFFBEB" },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
