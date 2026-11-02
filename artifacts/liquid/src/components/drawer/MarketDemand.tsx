import { Users } from "lucide-react";

interface MarketDemandProps {
  category: string;
  daysAway: number;
}

export function MarketDemand({ category, daysAway }: MarketDemandProps) {
  const BASE: Record<string, number> = { Hardware: 7, Optics: 6, Audio: 5 };
  let score = BASE[category] ?? 6;
  if (daysAway <= 7) score += 2;
  else if (daysAway <= 14) score += 1;
  else if (daysAway >= 60) score -= 2;
  score = Math.min(10, Math.max(1, score));

  const level = score >= 8 ? "High" : score >= 5 ? "Moderate" : "Low";
  const color = score >= 8 ? "#10B981" : score >= 5 ? "#F59E0B" : "#EF4444";
  const bgPill = score >= 8 ? "#D1FAE5" : score >= 5 ? "#FEF3C7" : "#FEE2E2";
  const buyers = score >= 8 ? "100–180" : score >= 5 ? "40–80" : "10–30";
  const trend =
    daysAway <= 14
      ? "↑ Rising — cliff creates buyer urgency"
      : daysAway >= 60
        ? "→ Stable"
        : "→ Steady interest";

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          Market Demand
        </h3>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ color, backgroundColor: bgPill }}
        >
          {level}
        </span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${score * 10}%`, backgroundColor: color, transition: "width 0.8s ease" }}
        />
      </div>
      <p className="text-[11px] text-gray-500 font-medium">{trend}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        ~{buyers} active buyers estimated for this category today
      </p>
    </div>
  );
}
