import { ShoppingCart } from "lucide-react";
import type { UrgencyLevel } from "@/lib/sellWindow";

export interface PlatformFeeOption {
  code: string;
  name: string;
  fee: number;
  tag: string;
  speed: string;
}

export function getPlatformsForCategory(category?: string): PlatformFeeOption[] {
  const cat = (category ?? "TECH").toUpperCase();
  if (cat === "WATCH") {
    return [
      { code: "C24", name: "Chrono24", fee: 0.065, tag: "Global collectors & escrow", speed: "7–21 days" },
      { code: "eB", name: "eBay Authenticity", fee: 0.125, tag: "Escrow verified physical check", speed: "5–12 days" },
      { code: "DIR", name: "Direct Collector / Forum", fee: 0.0, tag: "Face-to-face wire / meetup", speed: "1–5 days" },
    ];
  }
  if (cat === "SNEAKER") {
    return [
      { code: "SX", name: "StockX", fee: 0.09, tag: "Instant sell / verified deadstock", speed: "2–5 days" },
      { code: "GT", name: "GOAT", fee: 0.095, tag: "Sneakerheads marketplace", speed: "3–7 days" },
      { code: "eB", name: "eBay Sneakers", fee: 0.08, tag: "Zero seller fee over $150", speed: "3–10 days" },
    ];
  }
  // Default Electronics / Tech / Camera / Audio
  return [
    { code: "FB", name: "Facebook Marketplace", fee: 0.0, tag: "Local pickup / 0% fee", speed: "1–4 days" },
    { code: "SW", name: "Swappa", fee: 0.03, tag: "Direct tech buyer payment (3%)", speed: "1–3 days" },
    { code: "eB", name: "eBay Electronics", fee: 0.1325, tag: "Widest global buyer reach (13.25%)", speed: "3–10 days" },
    { code: "BM", name: "Back Market Buyback", fee: 0.20, tag: "Instant trade-in buyback (20%)", speed: "5–10 days" },
  ];
}

interface PlatformEstimatesProps {
  currentValue: number;
  conditionMultiplier: number;
  urgency: UrgencyLevel;
  category?: string;
}

export function PlatformEstimates({
  currentValue,
  conditionMultiplier,
  urgency,
  category,
}: PlatformEstimatesProps) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const adjusted = currentValue * conditionMultiplier;
  const platformList = getPlatformsForCategory(category);

  const ranked = [...platformList]
    .map((p) => ({ ...p, net: adjusted * (1 - p.fee) }))
    .sort((a, b) => b.net - a.net);

  const fastCode = urgency === "WINDOW" || urgency === "URGENT" ? "SW" : null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-amber-500" />
        Where to Sell (Net Payout Simulator)
      </h3>
      <div className="space-y-2">
        {ranked.map((p, i) => {
          const isTop = i === 0;
          const isFast = p.code === fastCode;
          return (
            <div
              key={p.code}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                isTop
                  ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-slate-50 dark:bg-[#1A1F2E] border-slate-100 dark:border-slate-800"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                style={{ backgroundColor: isTop ? "#10B981" : "#64748B" }}
              >
                {p.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{p.name}</span>
                  {isTop && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Best $
                    </span>
                  )}
                  {isFast && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300">
                      Fastest
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-400">
                  {p.tag} · {p.speed}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${isTop ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {f(p.net)}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500">{((1 - p.fee) * 100).toFixed(0)}% net</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
