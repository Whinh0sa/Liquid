import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { useGetPortfolio, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import { computeSellWindow } from "@/lib/sellWindow";
import { formatCurrencyWhole } from "@/lib/currency";
import { URGENCY_PILL } from "@/lib/urgency";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { data } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });
  const portfolio = data?.portfolio ?? [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Derive actionable alerts
  const notifications = useMemo(() => {
    return portfolio
      .map((a) => {
        const sw = computeSellWindow(
          a.depreciationCliff.daysAway,
          a.depreciationCliff.projectedDrop / 100,
        );
        const drop = a.depreciationCliff.projectedDrop / 100;
        return { ...a, sw, drop };
      })
      .filter((a) => a.sw.urgency === "WINDOW" || a.sw.urgency === "URGENT" || a.sw.urgency === "CLIFF")
      .sort((a, b) => a.depreciationCliff.daysAway - b.depreciationCliff.daysAway);
  }, [portfolio]);

  const hasUnread = notifications.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Notification center"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#7C3AED]" />
                <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-slate-900">
                  Signals &amp; Alerts
                </h3>
                {notifications.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                    {notifications.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-800">All Systems Nominal</p>
                  <p className="text-[11px] text-slate-400">
                    No urgent cliffs or price floor breaches active across your tracked assets.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const pill = URGENCY_PILL[n.sw.urgency];
                  const isUrgent = n.sw.urgency === "CLIFF" || n.sw.urgency === "URGENT";

                  return (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isUrgent
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {n.model}
                          </p>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                            style={{
                              backgroundColor: pill.bg,
                              color: pill.text,
                              border: `1px solid ${pill.border}`,
                            }}
                          >
                            {pill.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {n.depreciationCliff.reason}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                          <span>Cliff in {n.depreciationCliff.daysAway}d</span>
                          <span className="font-mono font-semibold text-red-600">
                            −{formatCurrencyWhole(n.drop)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="w-full text-center text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] flex items-center justify-center gap-1.5 py-1"
              >
                <span>Open Full Signals Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
