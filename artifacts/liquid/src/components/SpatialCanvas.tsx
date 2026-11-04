import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
export type ScanUrgency = "Low" | "Medium" | "High" | "Critical";

export interface SpatialBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface CanvasBox {
  id: string;
  label: string;
  box: SpatialBox;
  urgency: ScanUrgency;
  selected?: boolean;
  highlighted?: boolean;
}

interface Props {
  src: string;
  boxes: CanvasBox[];
  isScanning?: boolean;
  focusedId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  className?: string;
  telemetryLines?: string[];
}

const COLOR: Record<ScanUrgency, { border: string; bg: string }> = {
  Low: { border: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  Medium: { border: "#D97706", bg: "rgba(217,119,6,0.08)" },
  High: { border: "#EA580C", bg: "rgba(234,88,12,0.08)" },
  Critical: { border: "#DC2626", bg: "rgba(220,38,38,0.10)" },
};

function Corners({ c }: { c: string }) {
  const s = 8;
  return (
    <>
      <span className="absolute top-0 left-0" style={{ width: s, height: s, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
      <span className="absolute top-0 right-0" style={{ width: s, height: s, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
      <span className="absolute bottom-0 left-0" style={{ width: s, height: s, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
      <span className="absolute bottom-0 right-0" style={{ width: s, height: s, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
    </>
  );
}

export default function SpatialCanvas({ src, boxes, isScanning = false, focusedId, onHover, onSelect, className, telemetryLines }: Props) {
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);

  return (
    <div className={["relative w-full overflow-hidden rounded-2xl border bg-black border-slate-800 aspect-[4/3] sm:aspect-[16/10]", className ?? ""].join(" ")}>
      <img src={src} alt="Spatial scan input" className="absolute inset-0 h-full w-full object-contain" onLoad={() => setLoaded(true)} draggable={false} />
      <AnimatePresence>
        {!loaded && !isScanning && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Loading frame…</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isScanning && (
          <>
            <motion.div
              className="absolute left-0 right-0 h-[1.5px] z-20 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, #7C3AED 20%, #10B981 50%, #7C3AED 80%, transparent 100%)" }}
              initial={{ top: "0%" }}
              animate={reduce ? { top: "50%" } : { top: ["0%", "100%", "0%"] }}
              transition={reduce ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isScanning && telemetryLines && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-3 left-3 z-20 rounded-xl bg-slate-950/85 border border-slate-800 px-3 py-2 font-mono text-[9px] leading-[1.35] tracking-[0.12em] text-emerald-400 shadow-sm">
            {telemetryLines.map((line, i) => (
              <motion.div key={line + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
                <span className="text-purple-400 mr-1.5">▸</span>{line}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0">
        {boxes.map((b) => {
          const col = COLOR[b.urgency] ?? COLOR.Low;
          const focused = focusedId === b.id || b.highlighted;
          const sel = b.selected;
          const l = b.box.xmin;
          const t = b.box.ymin;
          const w = Math.max(2, b.box.xmax - b.box.xmin);
          const h = Math.max(2, b.box.ymax - b.box.ymin);
          return (
            <motion.button
              key={b.id}
              type="button"
              aria-label={`${b.label} ${b.urgency}`}
              onMouseEnter={() => onHover?.(b.id)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(b.id)}
              onBlur={() => onHover?.(null)}
              onClick={() => onSelect?.(b.id)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: focused ? 1.01 : 1 }}
              whileHover={reduce ? undefined : { scale: 1.01 }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className="absolute group text-left focus:outline-none rounded-[4px]"
              style={{
                left: `${l}%`,
                top: `${t}%`,
                width: `${w}%`,
                height: `${h}%`,
                border: `1.5px solid ${col.border}`,
                background: sel ? col.bg : focused ? "rgba(255,255,255,0.05)" : "transparent",
                zIndex: focused ? 12 : sel ? 10 : 6,
              }}
            >
              <Corners c={col.border} />
              <span className="absolute -top-2 -left-2 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-xs" style={{ background: col.border }}>
                {b.label.slice(0, 8).toUpperCase() || "ASSET"}
              </span>
              {sel && (
                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-purple-600 text-white grid place-items-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end px-3 pb-1.5">
        <span className="font-mono text-[9px] tracking-[0.16em] text-white/50">
          LIQUID // SPATIAL SCANNER {boxes.length ? `• ${boxes.length} DETECTED` : "• READY"} • SAM 3.1 • SPARK 1.3
        </span>
      </div>
    </div>
  );
}
