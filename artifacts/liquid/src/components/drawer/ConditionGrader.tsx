import { Activity } from "lucide-react";

export const CONDITIONS = {
  mint: { label: "Mint", sub: "Like new — original box, no marks", multiplier: 1.0, color: "#10B981", bg: "#F0FDF4", border: "#6EE7B7" },
  good: { label: "Good", sub: "Minor wear — fully functional", multiplier: 0.92, color: "#9126EF", bg: "rgba(145,38,239,0.06)", border: "rgba(145,38,239,0.2)" },
  fair: { label: "Fair", sub: "Visible scratches — works perfectly", multiplier: 0.78, color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  poor: { label: "Poor", sub: "Heavy wear or cosmetic damage", multiplier: 0.6, color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
} as const;

export type ConditionKey = keyof typeof CONDITIONS;

interface ConditionGraderProps {
  currentValue: number;
  condition: ConditionKey;
  setCondition: (c: ConditionKey) => void;
}

export function ConditionGrader({
  currentValue,
  condition,
  setCondition,
}: ConditionGraderProps) {
  const f = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const conf = CONDITIONS[condition];
  const adjusted = currentValue * conf.multiplier;
  const discount = currentValue - adjusted;

  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm" style={{ backgroundColor: "#FAFAFA" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          Condition Grader
        </h3>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}
        >
          {conf.label} · {(conf.multiplier * 100).toFixed(0)}%
        </span>
      </div>

      {/* 4-button selector */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["mint", "good", "fair", "poor"] as ConditionKey[]).map((key) => {
          const c = CONDITIONS[key];
          const selected = condition === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCondition(key)}
              className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border-2 transition-all"
              style={{
                borderColor: selected ? c.color : "#E5E7EB",
                backgroundColor: selected ? c.bg : "#FFFFFF",
              }}
            >
              <span className="text-xs font-bold" style={{ color: selected ? c.color : "#6B7280" }}>
                {c.label}
              </span>
              <span className="text-[9px] font-medium" style={{ color: selected ? c.color : "#9CA3AF" }}>
                {(c.multiplier * 100).toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 italic mb-3">{conf.sub}</p>

      {/* Adjusted value box */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl border"
        style={{ backgroundColor: conf.bg, borderColor: conf.border }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: conf.color }}>Condition-adjusted value</p>
          {condition !== "mint" && discount > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">−{f(discount)} from wear &amp; condition</p>
          )}
        </div>
        <p className="font-poppins font-bold text-lg" style={{ color: conf.color }}>{f(adjusted)}</p>
      </div>
    </div>
  );
}
