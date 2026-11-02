import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export interface SpatialBox { ymin: number; xmin: number; ymax: number; xmax: number; }
export type ScanUrgency = "Low" | "Medium" | "High" | "Critical";
export interface CanvasBox {
  id: string; label: string; box: SpatialBox; urgency: ScanUrgency; selected?: boolean; highlighted?: boolean;
}
interface Props {
  src: string; boxes: CanvasBox[]; isScanning?: boolean; focusedId?: string | null;
  onHover?: (id: string | null) => void; onSelect?: (id: string) => void; className?: string; telemetryLines?: string[];
}
const COLOR: Record<ScanUrgency, { border: string; glow: string; bg: string }> = {
  Low: { border: "#9126EF", glow: "rgba(145,38,239,0.55)", bg: "rgba(145,38,239,0.12)" },
  Medium: { border: "#F59E0B", glow: "rgba(245,158,11,0.55)", bg: "rgba(245,158,11,0.14)" },
  High: { border: "#F97316", glow: "rgba(249,115,22,0.55)", bg: "rgba(249,115,22,0.16)" },
  Critical: { border: "#EF4444", glow: "rgba(239,68,68,0.62)", bg: "rgba(239,68,68,0.18)" },
};
function Corners({ c }: { c: string }) {
  const s = 10;
  return (<>
    <span className="absolute top-0 left-0" style={{ width: s, height: s, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
    <span className="absolute top-0 right-0" style={{ width: s, height: s, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
    <span className="absolute bottom-0 left-0" style={{ width: s, height: s, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` }} />
    <span className="absolute bottom-0 right-0" style={{ width: s, height: s, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` }} />
  </>);
}

export default function SpatialCanvas({ src, boxes, isScanning = false, focusedId, onHover, onSelect, className, telemetryLines }: Props) {
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);
  return (
    <div className={["relative w-full overflow-hidden rounded-3xl border bg-black border-gray-900 aspect-[4/3] sm:aspect-[16/10]", className ?? ""].join(" ")}>
      <img src={src} alt="Spatial scan input" className="absolute inset-0 h-full w-full object-contain" onLoad={() => setLoaded(true)} draggable={false} />
      <AnimatePresence>{!loaded && !isScanning && <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center"><span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Loading frame…</span></motion.div>}</AnimatePresence>
      <AnimatePresence>
        {isScanning && (
          <>
            <motion.div className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent 0%, #9126EF 15%, #10B981 50%, #9126EF 85%, transparent 100%)", boxShadow: "0 0 18px rgba(145,38,239,0.85)" }} initial={{ top: "0%" }} animate={reduce ? { top: "50%" } : { top: ["0%", "100%", "0%"] }} transition={reduce ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.04] to-transparent pointer-events-none animate-pulse" />
            <div className="absolute inset-0 grid place-items-center pointer-events-none"><motion.div className="rounded-full border border-purple-400/30" initial={{ width: 40, height: 40, opacity: 0.2 }} animate={reduce ? { opacity: 0.3 } : { width: [40, 320, 40], height: [40, 320, 40], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} /></div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isScanning && telemetryLines && (<motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-3 left-3 z-20 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 px-3 py-2 font-mono text-[9px] leading-[1.35] tracking-[0.12em] text-emerald-300">{telemetryLines.map((line, i) => (<motion.div key={line + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}><span className="text-purple-300 mr-1.5">▸</span>{line}</motion.div>))}</motion.div>)}
      </AnimatePresence>
      <div className="absolute inset-0">
        {boxes.map((b) => {
          const col = COLOR[b.urgency] ?? COLOR.Low;
          const focused = focusedId === b.id || b.highlighted;
          const sel = b.selected;
          const l = b.box.xmin; const t = b.box.ymin; const w = Math.max(2, b.box.xmax - b.box.xmin); const h = Math.max(2, b.box.ymax - b.box.ymin);
          return (
            <motion.button key={b.id} type="button" aria-label={`${b.label} ${b.urgency}`} onMouseEnter={() => onHover?.(b.id)} onMouseLeave={() => onHover?.(null)} onFocus={() => onHover?.(b.id)} onBlur={() => onHover?.(null)} onClick={() => onSelect?.(b.id)} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: focused ? 1.02 : 1 }} whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 28 }} className="absolute group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-[6px]" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, border: `1.5px solid ${col.border}`, background: sel ? col.bg : focused ? "rgba(255,255,255,0.06)" : "transparent", boxShadow: focused || sel ? `0 0 0 1px ${col.border}, 0 0 14px ${col.glow}, inset 0 0 12px ${col.bg}` : `0 0 10px ${col.glow}`, zIndex: focused ? 12 : sel ? 10 : 6 }}>
              <Corners c={col.border} />
              <span className="absolute -top-2 -left-2 rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow-sm" style={{ background: col.border }}>{b.label.slice(0, 8).toUpperCase() || "ASSET"}</span>
              {sel && <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-purple-600 text-white grid place-items-center text-[10px] font-bold shadow">✓</span>}
              {focused && !reduce && <motion.span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full" style={{ background: col.border }} animate={{ scale: [1, 1.8, 1], opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />}
            </motion.button>
          );
        })}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none flex items-end px-3 pb-2"><span className="font-mono text-[9px] tracking-[0.18em] text-white/60">LIQUID // SPATIAL TERMINAL {boxes.length ? `• ${boxes.length} SEGMENTS` : "• AWAITING SCAN"} • SAM 3.1 • SPARK 1.3</span></div>
    </div>
  );
}
