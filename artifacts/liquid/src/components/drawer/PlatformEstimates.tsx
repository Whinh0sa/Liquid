import { ShoppingCart } from "lucide-react";
import type { UrgencyLevel } from "@/lib/sellWindow";

export const PLATFORMS_DATA = [
  { code: "FB", name: "Facebook Marketplace", fee: 0.02, tag: "No listing fee", speed: "3–7 days" },
  { code: "SW", name: "Swappa", fee: 0.03, tag: "Electronics only", speed: "1–3 days" },
  { code: "eB", name: "eBay", fee: 0.1325, tag: "Widest buyer reach", speed: "3–10 days" },
  { code: "BM", name: "Back Market", fee: 0.20, tag: "Certified refurb", speed: "5–14 days" },
];

interface PlatformEstimatesProps {
  currentValue: number;
  conditionMultiplier: number;
  urgency: UrgencyLevel;
}

export function PlatformEstimates({
  currentValue,
  conditionMultiplier,
  urgency,
}: PlatformEstimatesProps) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const adjusted = currentValue * conditionMultiplier;
  const ranked = [...PLATFORMS_DATA]
    .map((p) => ({ ...p, net: adjusted * (1 - p.fee) }))
    .sort((a, b) => b.net - a.net);

  const fastCode = urgency === "WINDOW" || urgency === "URGENT" ? "SW" : null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-amber-500" />
        Where to Sell
      </h3>
      <div className="space-y-2">
        {ranked.map((p, i) => {
          const isTop = i === 0;
          const isFast = p.code === fastCode;
          return (
            <div
              key={p.code}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
              style={{
                backgroundColor: isTop ? "#F0FDF4" : "#FAFAFA",
                borderColor: isTop ? "#A7F3D0" : "#F3F4F6",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                style={{ backgroundColor: isTop ? "#10B981" : "#9CA3AF" }}
              >
                {p.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                  {isTop && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Best $
                    </span>
                  )}
                  {isFast && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      Fastest
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {p.tag} · {p.speed}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: isTop ? "#059669" : "#1F2937" }}>
                  {f(p.net)}
                </p>
                <p className="text-[10px] text-gray-400">{((1 - p.fee) * 100).toFixed(0)}% net</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
