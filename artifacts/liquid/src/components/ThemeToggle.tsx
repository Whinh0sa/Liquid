// ─── ThemeToggle — Tactile Theme Switcher ────────────────────────────────────
//
// Fluid icon transition between Sun and Moon with accessible ARIA labeling.

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark obsidian mode"}
      className={[
        "relative p-2 rounded-xl transition-all duration-200 border",
        "bg-white/80 hover:bg-slate-100 text-slate-700 border-slate-200/90 shadow-2xs",
        "dark:bg-[#131722] dark:hover:bg-[#1A1F2E] dark:text-slate-200 dark:border-slate-800",
        "focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 active:scale-95",
        className,
      ].join(" ")}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 rotate-0 scale-100" />
        )}
      </div>
    </button>
  );
}
