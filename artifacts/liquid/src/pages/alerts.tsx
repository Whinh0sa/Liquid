import { formatCurrencyNoDecimals } from "../lib/format";
import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  Clock,
  Zap,
  CheckCircle,
  Shield,
  TriangleAlert,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { computeSellWindow } from "@/lib/sellWindow";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return formatCurrencyNoDecimals(n);
}

// ─── Severity config derived from urgency ────────────────────────────────────
const SEVERITY = {
  CLIFF: {
    label: "critical",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    border: "border-red-100",
  },
  URGENT: {
    label: "high",
    bg: "bg-orange-50",
    text: "text-orange-700",
    icon: AlertTriangle,
    iconColor: "text-orange-500",
    border: "border-orange-100",
  },
  WINDOW: {
    label: "active",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: Zap,
    iconColor: "text-emerald-500",
    border: "border-emerald-100",
  },
  PLANNED: {
    label: "monitor",
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: CalendarDays,
    iconColor: "text-purple-400",
    border: "border-purple-100",
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Alerts() {
  const { data, isLoading } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });

  const portfolio = data?.portfolio ?? [];

  // Enrich each asset with its computed urgency
  const enriched = useMemo(
    () =>
      portfolio.map((a) => ({
        ...a,
        sw: computeSellWindow(
          a.depreciationCliff.daysAway,
          a.depreciationCliff.projectedDrop / 100,
        ),
      })),
    [portfolio],
  );

  // Separate into actionable (CLIFF + URGENT + WINDOW) and monitoring (PLANNED)
  const actionable = useMemo(
    () => enriched.filter((a) => a.sw.urgency !== "PLANNED"),
    [enriched],
  );
  const monitoring = useMemo(
    () => enriched.filter((a) => a.sw.urgency === "PLANNED"),
    [enriched],
  );

  // Summary stats derived from live data
  const criticalCount = enriched.filter(
    (a) => a.sw.urgency === "CLIFF" || a.sw.urgency === "URGENT",
  ).length;
  const windowCount = enriched.filter((a) => a.sw.urgency === "WINDOW").length;
  const floorCount = portfolio.filter(
    (a) => a.status === "ACTION_REQUIRED",
  ).length;

  const summaryCards = [
    {
      label: "Critical / Urgent",
      value: `${criticalCount}`,
      tone: "red" as const,
      icon: AlertTriangle,
    },
    {
      label: "Sell windows open",
      value: `${windowCount}`,
      tone: "emerald" as const,
      icon: Zap,
    },
    {
      label: "Action required",
      value: `${floorCount}`,
      tone: "amber" as const,
      icon: BellRing,
    },
  ];

  return (
    <AppLayout>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 mb-4 transition-colors"
        >
          ← Back to dashboard
        </Link>
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase mb-1"
          style={{ color: "#9126EF" }}
        >
          Alerts
        </p>
        <h1 className="text-3xl font-black text-gray-900">
          Release signals &amp; price floors
        </h1>
        <p className="text-gray-500 mt-1">
          Live view of your portfolio's urgency status — updated each time the
          page loads.
        </p>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-center gap-4"
          >
            <div
              className={[
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                card.tone === "red"
                  ? "bg-red-50"
                  : card.tone === "emerald"
                    ? "bg-emerald-50"
                    : "bg-amber-50",
              ].join(" ")}
            >
              <card.icon
                className={[
                  "w-5 h-5",
                  card.tone === "red"
                    ? "text-red-500"
                    : card.tone === "emerald"
                      ? "text-emerald-500"
                      : "text-amber-500",
                ].join(" ")}
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p
                className={[
                  "text-2xl font-black",
                  card.tone === "red"
                    ? "text-red-500"
                    : card.tone === "emerald"
                      ? "text-emerald-600"
                      : "text-amber-500",
                ].join(" ")}
              >
                {card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Live asset alerts ────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-500" />
            Active alerts
          </h2>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500">
            {actionable.length} item{actionable.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : actionable.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-semibold text-gray-700">All clear</p>
            <p className="text-xs text-gray-400 max-w-xs">
              No assets are currently in the urgent or sell-window zone. Check
              back when cliffs are closer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {actionable.map((a, i) => {
              const sev = SEVERITY[a.sw.urgency];
              const drop = a.depreciationCliff.projectedDrop / 100;
              const current = a.currentValue / 100;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Severity icon */}
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${sev.bg} ${sev.border}`}
                  >
                    <sev.icon className={`w-4 h-4 ${sev.iconColor}`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {a.model}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {a.depreciationCliff.reason} · cliff in{" "}
                      <span className="font-semibold text-gray-700">
                        {a.depreciationCliff.daysAway}d
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.sw.sellByLabel}
                    </p>
                  </div>

                  {/* Financial impact */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {fmt(current)}
                    </p>
                    <p className="text-xs text-red-500 font-semibold">
                      −{fmt(drop)}
                    </p>
                    <p className="text-[10px] text-gray-400">if cliff hit</p>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/"
                    className="shrink-0 self-center px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors"
                  >
                    View →
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Monitoring (PLANNED assets) ──────────────────────────────────── */}
      {monitoring.length > 0 && (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Monitoring
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500">
              {monitoring.length} item{monitoring.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {monitoring.map((a, i) => {
              const drop = a.depreciationCliff.projectedDrop / 100;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {a.model}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.depreciationCliff.reason} ·{" "}
                      {a.depreciationCliff.daysAway}d away
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">At risk</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {fmt(drop)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Info cards ───────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            Alert logic
          </h2>
          <div className="space-y-2.5 text-sm text-gray-600">
            <p>
              • <strong>Critical / Urgent</strong> — cliff is imminent or the
              sell window has closed.
            </p>
            <p>
              • <strong>Active</strong> — asset is inside its optimal resale
              window right now.
            </p>
            <p>
              • <strong>Monitoring</strong> — cliff is more than 8 days away; no
              action needed yet.
            </p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-3xl p-5 flex gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#9126EF" }}
          >
            <TriangleAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900 mb-1">
              Why this page exists
            </p>
            <p className="text-sm text-purple-700 leading-relaxed">
              Alerts stay separate from the dashboard so the home view stays
              calm while still surfacing urgency. Everything here is computed
              live from your portfolio.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
