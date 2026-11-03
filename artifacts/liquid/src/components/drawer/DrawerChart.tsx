import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { formatCurrency } from "@/lib/currency";
import type { ChartPoint } from "@/lib/sellWindow";

export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const isCliff = typeof label === "string" && label.includes("cliff");
  const isWindow = typeof label === "string" && label.includes("★");
  return (
    <div className="bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 shadow-lg min-w-[130px]">
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
        {isCliff ? "⚠️ Cliff Event" : isWindow ? "⭐ Ideal sell-by" : label}
      </p>
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
        {formatCurrency(payload[0].value)}
      </p>
      {isCliff && <p className="text-[10px] text-red-500 mt-1">Value drops sharply here</p>}
      {isWindow && <p className="text-[10px] text-emerald-600 mt-1">Best price-to-risk balance</p>}
    </div>
  );
}

interface DrawerChartProps {
  chartData: ChartPoint[];
  windowStartLabel: string | null;
  windowEndLabel: string | null;
  cliffLabel: string;
}

export function DrawerChart({
  chartData,
  windowStartLabel,
  windowEndLabel,
  cliffLabel,
}: DrawerChartProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Price Trajectory</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-400 inline-block rounded" />
            Actual
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-0.5 bg-orange-300 inline-block rounded"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,#f97316 0,#f97316 3px,transparent 3px,transparent 6px)",
                height: 1,
              }}
            />
            Projected
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-2 rounded-sm inline-block"
              style={{ backgroundColor: "rgba(16,185,129,0.15)" }}
            />
            Sell window
          </span>
        </div>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />

            {/* Sell window highlight — green band */}
            {windowStartLabel && windowEndLabel && (
              <ReferenceArea
                x1={windowStartLabel}
                x2={windowEndLabel}
                fill="rgba(16,185,129,0.12)"
                stroke="rgba(16,185,129,0.4)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: "Sell window",
                  position: "insideTop",
                  fill: "#10B981",
                  fontSize: 9,
                  fontFamily: "Inter",
                  fontWeight: 600,
                }}
              />
            )}
            {/* If window is open now, shade Today → windowEnd */}
            {!windowStartLabel && windowEndLabel && (
              <ReferenceArea
                x1="Today"
                x2={windowEndLabel}
                fill="rgba(16,185,129,0.12)"
                stroke="rgba(16,185,129,0.4)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* Cliff reference line */}
            <ReferenceLine
              x={cliffLabel}
              stroke="rgba(239,68,68,0.6)"
              strokeDasharray="4 3"
              label={{
                value: "⚠ Cliff",
                position: "top",
                fill: "#EF4444",
                fontSize: 9,
                fontFamily: "Montserrat",
                fontWeight: 700,
              }}
            />

            {/* Today divider */}
            <ReferenceLine
              x="Today"
              stroke="rgba(37,99,235,0.3)"
              strokeDasharray="2 3"
              label={{
                value: "Now",
                position: "top",
                fill: "#2563EB",
                fontSize: 9,
                fontFamily: "Inter",
              }}
            />

            <XAxis
              dataKey="label"
              tick={{ fill: "#9CA3AF", fontSize: 9, fontFamily: "Inter" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={36}
              tickFormatter={(v: string) => v.replace(" cliff", "").replace(" ★", "★")}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "Inter" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
              width={46}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Historical line — solid red */}
            <Line
              data={chartData.filter((p) => !p.projected)}
              dataKey="price"
              stroke="#F87171"
              strokeWidth={2}
              dot={{ r: 3, fill: "#EF4444", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#DC2626" }}
              name="Historical"
              isAnimationActive={false}
            />

            {/* Projected line — dashed orange */}
            <Line
              data={chartData.filter((p) => p.projected || p.label === "Today")}
              dataKey="price"
              stroke="#FB923C"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "#F97316", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#EA580C" }}
              name="Projected"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
