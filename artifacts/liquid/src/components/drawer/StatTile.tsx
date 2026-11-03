import type { ReactNode } from "react";

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}

export function StatTile({
  icon,
  label,
  value,
  sub,
  valueColor = "#1F2937",
}: StatTileProps) {
  return (
    <div className="bg-gray-50 dark:bg-[#1A1F2E] rounded-xl p-3.5 border border-gray-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 mb-2">{icon}</div>
      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-100" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}
