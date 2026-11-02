// ─── SpatialScanModal — AI Spatial Hardware Scanner ─────────────────────────────
//
// Allows users to take or upload a workspace photo, runs Muse Spark / SAM
// visual analysis to detect physical assets, compute depreciation vectors,
// filter via speech or tactile controls, and batch-commit to the portfolio.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPortfolioQueryKey, customFetch } from "@workspace/api-client-react";
import { formatCurrency, formatCurrencyWhole } from "@/lib/currency";
import {
  Camera,
  Upload,
  X,
  ScanLine,
  Flame,
  PackageCheck,
  Check,
  DollarSign,
  TrendingDown,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Mic,
  MicOff,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SpatialCanvas, { type CanvasBox, type ScanUrgency, type SpatialBox } from "./SpatialCanvas";
import { parseVoiceCommand, getSpeechRecognitionCtor } from "@/lib/voiceSelection";
import type { VoiceSelectableAsset } from "@/lib/voiceSelection";

type ScanState = "idle" | "preview" | "scanning" | "results" | "committing" | "committed";

interface DetectedAsset {
  id?: string;
  name: string;
  make?: string;
  model?: string;
  category: "TECH" | "FASHION";
  condition: string;
  estimatedValueDollars: number;
  depreciationCliffDays: number;
  cliffReason?: string;
  urgency: ScanUrgency;
  sellRecommendation?: string;
  confidence?: number;
  box?: SpatialBox;
}

interface ScanResponse {
  source: "meta-model" | "mock";
  detectedAssets: DetectedAsset[];
  portfolioSummary: {
    totalDetectedValue: number;
    immediateActionCount: number;
    scanNotes?: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCommitted?: (count: number) => void;
}

const COND_MULT: Record<string, number> = {
  Mint: 1.1,
  "Like New": 1.08,
  Excellent: 1.05,
  Good: 1,
  Fair: 0.85,
  Poor: 0.65,
};

function conditionFactor(c: string): number {
  if (COND_MULT[c.trim()] !== undefined) return COND_MULT[c.trim()];
  const low = c.toLowerCase();
  for (const [k, v] of Object.entries(COND_MULT)) {
    if (low.includes(k.toLowerCase())) return v;
  }
  return 1;
}

function platformNet(price: number, platform: "eBay" | "Swappa" | "Marketplace"): number {
  const rate = platform === "eBay" ? 0.87 : platform === "Swappa" ? 0.9 : 0.98;
  return Math.round(price * rate * 100) / 100;
}

function makeApiBase(): string {
  const b = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
  return b;
}

function makeCanvasBoxes(
  detected: DetectedAsset[],
  selected: Set<string>,
  focusedId: string | null,
): CanvasBox[] {
  const fallback: SpatialBox[] = [
    { ymin: 8, xmin: 8, ymax: 56, xmax: 58 },
    { ymin: 10, xmin: 64, ymax: 34, xmax: 90 },
    { ymin: 62, xmin: 6, ymax: 90, xmax: 56 },
    { ymin: 40, xmin: 64, ymax: 88, xmax: 94 },
  ];

  return detected.map((a: DetectedAsset, idx: number): CanvasBox => {
    const id = a.id ?? `detected-${idx}`;
    return {
      id,
      label: (a.make ?? a.name.split(" ")[0]).slice(0, 10) || `ITEM ${idx + 1}`,
      box: a.box ?? fallback[idx % fallback.length],
      urgency: a.urgency,
      selected: selected.has(id),
      highlighted: focusedId === id,
    };
  });
}

function TerminalHeader({
  dailyBurn,
  selectedTotal,
  selectedCount,
  totalDetected,
  scanNotes,
  source,
}: {
  dailyBurn: number;
  selectedTotal: number;
  selectedCount: number;
  totalDetected: number;
  scanNotes?: string;
  source?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-3">
      <div className="rounded-3xl border border-gray-900 bg-gray-950 text-white p-4 sm:p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08)_inset,0_0_30px_rgba(145,38,239,0.12)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.24em] text-emerald-300">
            LIQUID TERMINAL // SCAN {String(source ?? "mock").toUpperCase()}
          </span>
          <span className="font-mono text-[9px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
            {totalDetected} SEGMENTS
          </span>
        </div>

        <div className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/30 grid place-items-center">
            <Flame className="w-4 h-4 text-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] text-gray-400 uppercase">
              Cost of Inaction — Daily Burn
            </p>
            <p className="font-poppins font-bold text-lg sm:text-xl text-amber-300">
              Holding this hardware burns {formatCurrency(dailyBurn)}/day in passive depreciation.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center gap-2 font-mono text-[10px] leading-[1.4] text-gray-300">
          <ScanLine className="w-3.5 h-3.5 text-purple-300 shrink-0" />
          {scanNotes ?? "Sectors locked. Depreciation vectors calculated. Awaiting commit."}
        </div>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-black tracking-[0.14em] uppercase text-amber-800">
            Dead Capital Unlocked
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-poppins font-black text-3xl text-gray-900">
            {formatCurrencyWhole(selectedTotal)}
          </span>
          <span className="text-xs font-bold text-amber-600">
            {selectedCount}/{totalDetected} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-gray-500">
          <span className="px-2 py-1 rounded-full bg-white border border-gray-200">eBay net 87%</span>
          <span className="px-2 py-1 rounded-full bg-white border border-gray-200">Swappa 90% tech</span>
          <span className="px-2 py-1 rounded-full bg-white border border-gray-200">Marketplace 98%</span>
        </div>
      </div>
    </div>
  );
}

function HudCard({
  asset,
  idx,
  selected,
  focused,
  onToggle,
  onHover,
  cardRef,
}: {
  asset: DetectedAsset;
  idx: number;
  selected: boolean;
  focused: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  const mult = conditionFactor(asset.condition);
  const idLabel = `HW-${String(idx + 1).padStart(2, "0")}`;
  const urgentColor =
    asset.urgency === "Critical"
      ? "#EF4444"
      : asset.urgency === "High"
        ? "#F97316"
        : asset.urgency === "Medium"
          ? "#F59E0B"
          : "#9126EF";
  const price = asset.estimatedValueDollars;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(asset.id ?? `detected-${idx}`)}
      onMouseLeave={() => onHover(null)}
      className={[
        "group rounded-3xl border bg-white p-4 shadow-sm transition-all",
        focused
          ? "border-purple-300 shadow-[0_0_0_3px_rgba(145,38,239,0.12)]"
          : "border-gray-100 hover:border-gray-200",
        selected ? "bg-purple-50/40" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`Select ${asset.name}`}
            onClick={onToggle}
            className={[
              "h-5 w-5 rounded-md border grid place-items-center transition-colors",
              selected
                ? "bg-purple-600 border-purple-600 text-white"
                : "border-gray-200 bg-white hover:border-gray-300",
            ].join(" ")}
          >
            {selected && <Check className="w-3 h-3" />}
          </button>
          <span className="font-mono text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-gray-900 text-white">
            {idLabel}
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
            style={{ color: urgentColor, borderColor: urgentColor, background: `${urgentColor}15` }}
          >
            {asset.urgency}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">{asset.category}</span>
      </div>

      <p className="mt-2 font-semibold text-sm text-gray-900 leading-tight truncate">{asset.name}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-gray-200 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          {asset.depreciationCliffDays}d cliff
        </span>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
          cond {asset.condition} x{mult.toFixed(2)}
        </span>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
          cliff
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-poppins font-bold text-lg text-gray-900">
          {formatCurrencyWhole(price)} <span className="text-[11px] font-medium text-gray-400">est</span>
        </span>
        <span className="text-[10px] text-gray-400">
          conf {Math.round((asset.confidence ?? 0.8) * 100)}%
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-gray-900 text-white">
          eBay {formatCurrencyWhole(platformNet(price, "eBay"))}
        </span>
        {asset.category === "TECH" && (
          <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-white border border-gray-200">
            Swappa {formatCurrencyWhole(platformNet(price, "Swappa"))}
          </span>
        )}
        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
          Mkt {formatCurrencyWhole(platformNet(price, "Marketplace"))}
        </span>
      </div>

      {asset.cliffReason && (
        <p className="mt-2 text-[11px] leading-[1.4] text-gray-500 line-clamp-2">
          ↳ {asset.cliffReason}
        </p>
      )}
    </div>
  );
}

export default function SpatialScanModal({ open, onOpenChange, onCommitted }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [state, setState] = useState<ScanState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [base64, setBase64] = useState("");
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceSimInput, setVoiceSimInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const speechRecRef = useRef<any>(null);

  const apiBase = useMemo(() => makeApiBase(), []);

  const reset = useCallback((): void => {
    setState("idle");
    setPreviewSrc(null);
    setMimeType("image/jpeg");
    setBase64("");
    setScanResult(null);
    setSelectedIds(new Set());
    setFocusedId(null);
    setVoiceListening(false);
    setVoiceTranscript("");
    setVoiceSimInput("");
  }, []);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(reset, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, reset]);

  const canvasBoxes = useMemo((): CanvasBox[] => {
    if (!scanResult) return [];
    return makeCanvasBoxes(
      scanResult.detectedAssets.map((a: DetectedAsset, i: number) => ({
        ...a,
        id: a.id ?? `detected-${i}`,
      })),
      selectedIds,
      focusedId,
    );
  }, [scanResult, selectedIds, focusedId]);

  const { dailyBurn, selectedTotal } = useMemo(() => {
    if (!scanResult) return { dailyBurn: 0, selectedTotal: 0 };
    let burn = 0;
    scanResult.detectedAssets.forEach((a: DetectedAsset) => {
      if (a.depreciationCliffDays > 0) {
        burn += (a.estimatedValueDollars * 0.08) / a.depreciationCliffDays;
      }
    });

    let sel = 0;
    scanResult.detectedAssets.forEach((a: DetectedAsset, i: number) => {
      const id = a.id ?? `detected-${i}`;
      if (selectedIds.has(id)) {
        sel += a.estimatedValueDollars;
      }
    });

    return { dailyBurn: Math.round(burn * 100) / 100, selectedTotal: sel };
  }, [scanResult, selectedIds]);

  const applyVoiceTranscript = useCallback(
    (transcript: string): void => {
      if (!scanResult) return;
      const selectable: VoiceSelectableAsset[] = scanResult.detectedAssets.map(
        (a: DetectedAsset, i: number) => ({
          id: a.id ?? `detected-${i}`,
          category: a.category,
          estimatedValueDollars: a.estimatedValueDollars,
          urgency: a.urgency,
        }),
      );

      const result = parseVoiceCommand(transcript, selectable, selectedIds);
      setVoiceTranscript(transcript);

      if (result.action === "clear") {
        setSelectedIds(new Set());
        toast({ title: `Voice: ${result.criterion}`, description: "0 selected" });
      } else if (result.action === "select-all") {
        setSelectedIds(new Set(selectable.map((x) => x.id)));
        toast({ title: `Voice: ${result.criterion}`, description: `${result.selectedCount} assets selected` });
      } else if (result.action === "select" && result.filterFn) {
        const fn = result.filterFn as (a: VoiceSelectableAsset) => boolean;
        const ids = selectable.filter(fn).map((a) => a.id);
        setSelectedIds(new Set(ids));
        toast({ title: `Voice: ${result.criterion}`, description: `${ids.length} assets selected` });
      } else {
        toast({
          title: `Voice: "${transcript.slice(0, 40)}"`,
          description:
            result.criterion === "not recognised"
              ? "Try: high urgency, select all, over $500, clear, tech, fashion"
              : result.criterion,
        });
      }
    },
    [scanResult, selectedIds, toast],
  );

  const toggleVoiceListen = useCallback((): void => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      const t = voiceSimInput.trim();
      if (t) {
        applyVoiceTranscript(t);
        setVoiceSimInput("");
      } else {
        toast({
          title: "Voice input unavailable",
          description: "Type a command like 'Select high urgency items' or 'Over $500' in the input.",
        });
      }
      return;
    }

    if (voiceListening) {
      speechRecRef.current?.stop?.();
      setVoiceListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const tr = e.results[0]?.[0]?.transcript ?? "";
      applyVoiceTranscript(tr);
    };
    rec.onerror = () => setVoiceListening(false);
    rec.onend = () => setVoiceListening(false);
    speechRecRef.current = rec;

    try {
      rec.start();
      setVoiceListening(true);
      setVoiceTranscript("Listening…");
    } catch {
      setVoiceListening(false);
    }
  }, [voiceListening, voiceSimInput, applyVoiceTranscript, toast]);

  const handleFile = useCallback(
    (file: File): void => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Only images allowed", description: "Upload a desk or room photo." });
        return;
      }

      const reader = new FileReader();
      reader.onload = (): void => {
        const dataUrl = reader.result as string;
        const comma = dataUrl.indexOf(",");
        const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const mime = file.type || (/data:([^;]+);/.exec(dataUrl)?.[1]) || "image/jpeg";
        setPreviewSrc(dataUrl);
        setMimeType(mime);
        setBase64(b64);
        setState("preview");
      };
      reader.readAsDataURL(file);
    },
    [toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const doScan = useCallback(async (): Promise<void> => {
    if (!base64) return;
    setState("scanning");

    try {
      const url = `${apiBase}/api/ai/scan`;
      const res = await customFetch<ScanResponse>(url, {
        method: "POST",
        body: JSON.stringify({ image: base64, mimeType }),
      } as unknown as RequestInit);

      const withIds: ScanResponse = {
        ...res,
        detectedAssets: res.detectedAssets.map((a: DetectedAsset, i: number): DetectedAsset => ({
          ...a,
          id: a.id ?? `detected-${i}`,
        })),
      };

      setScanResult(withIds);
      setSelectedIds(new Set(withIds.detectedAssets.map((a: DetectedAsset, i: number) => a.id ?? `detected-${i}`)));
      setState("results");
      toast({
        title: `Detected ${withIds.detectedAssets.length} asset(s)`,
        description: withIds.portfolioSummary.scanNotes?.slice(0, 120) ?? `${withIds.source} scan`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Scan failed", description: msg || "Could not scan." });
      setState("preview");
    }
  }, [apiBase, base64, mimeType, toast]);

  const doCommit = useCallback(async (): Promise<void> => {
    if (!scanResult) return;
    const selected = scanResult.detectedAssets.filter((a: DetectedAsset, i: number) =>
      selectedIds.has(a.id ?? `detected-${i}`),
    );

    if (selected.length === 0) {
      toast({ title: "Select at least one asset" });
      return;
    }

    setState("committing");
    try {
      const body = {
        assets: selected.map((a: DetectedAsset) => ({
          name: a.name,
          make: a.make,
          model: a.model,
          category: a.category,
          condition: a.condition,
          estimatedValueDollars: a.estimatedValueDollars,
          depreciationCliffDays: a.depreciationCliffDays,
          cliffReason: a.cliffReason,
        })),
      };

      const res = await customFetch<{ success: boolean; count: number }>(
        `${apiBase}/api/ai/import-batch`,
        { method: "POST", body: JSON.stringify(body) } as unknown as RequestInit,
      );

      await queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
      setState("committed");
      toast({ title: `${res.count} asset(s) committed`, description: "Portfolio updated." });
      onCommitted?.(res.count);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Import failed", description: msg || "Could not commit." });
      setState("results");
    }
  }, [apiBase, scanResult, selectedIds, queryClient, toast, onCommitted, onOpenChange]);

  const toggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const handleHover = useCallback((id: string | null): void => {
    setFocusedId(id);
    if (id) {
      const el = cardRefs.current.get(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1120px,96vw)] w-[96vw] max-h-[92vh] overflow-hidden p-0 bg-[#F8F9FA] border-gray-200 flex flex-col sm:rounded-3xl">
        <DialogTitle className="sr-only">Spatial Scan</DialogTitle>

        {/* Modal Top Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white grid place-items-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black tracking-[0.2em] uppercase text-purple-600">
                LIQUID 2.0 // SPATIAL TERMINAL
              </p>
              <p className="text-sm font-bold text-gray-900">Scan a space. Unlock dead capital.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state === "preview" && (
              <button
                type="button"
                onClick={() => void doScan()}
                className="h-9 px-4 rounded-full bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Scan with Liquid
              </button>
            )}
            {state !== "idle" && (
              <button
                type="button"
                aria-label="Reset scanner"
                onClick={() => reset()}
                className="h-9 w-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-5 sm:p-8 space-y-6"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={[
                    "rounded-3xl border-2 border-dashed bg-white p-8 sm:p-12 text-center min-h-[280px] flex flex-col items-center justify-center gap-4 transition-colors",
                    dragOver ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white grid place-items-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Drop a desk or room photo here</p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse — runs automated valuation model on recognized items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                    >
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-10 px-4 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Camera
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-gray-500">
                  <div className="rounded-xl bg-white border border-gray-100 p-3 flex gap-2">
                    <ImageIcon className="w-4 h-4 shrink-0 text-gray-400" />
                    Spatial segmentation identifies makes, models, and condition grades automatically.
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 p-3 flex gap-2">
                    <TrendingDown className="w-4 h-4 shrink-0 text-amber-500" />
                    Calculates holding cost and daily burn rate against secondary market floors.
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 p-3 flex gap-2">
                    <PackageCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    Select segments and 1-click batch import directly to your authenticated portfolio.
                  </div>
                </div>
              </motion.div>
            )}

            {state === "preview" && previewSrc && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 sm:p-6 space-y-4"
              >
                <SpatialCanvas
                  src={previewSrc}
                  boxes={[]}
                  isScanning={false}
                  telemetryLines={["STANDBY — READY TO SCAN", "AWAITING /api/ai/scan"]}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="h-10 px-4 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => void doScan()}
                    className="h-10 px-5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
                  >
                    Scan With Liquid
                  </button>
                </div>
              </motion.div>
            )}

            {state === "scanning" && previewSrc && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 sm:p-6"
              >
                <SpatialCanvas
                  src={previewSrc}
                  boxes={[]}
                  isScanning
                  telemetryLines={[
                    "CALCULATING DEPRECIATION VECTORS...",
                    "SEGMENTING HARDWARE ASSETS...",
                    "REFERENCING SECONDARY MARKET FLOORS...",
                    "MODELING CLIFF PROBABILITY...",
                  ]}
                />
              </motion.div>
            )}

            {(state === "results" || state === "committing" || state === "committed") &&
              scanResult &&
              previewSrc && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 sm:p-6 space-y-4"
                >
                  <TerminalHeader
                    dailyBurn={dailyBurn}
                    selectedTotal={selectedTotal}
                    selectedCount={selectedIds.size}
                    totalDetected={scanResult.detectedAssets.length}
                    scanNotes={scanResult.portfolioSummary.scanNotes}
                    source={scanResult.source}
                  />

                  {/* Voice / Tactile Search Command Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2">
                    <button
                      type="button"
                      data-testid="btn-voice-mic"
                      onClick={toggleVoiceListen}
                      className={[
                        "h-10 w-10 rounded-xl grid place-items-center border transition-colors shrink-0",
                        voiceListening
                          ? "bg-red-500 border-red-500 text-white animate-pulse"
                          : "bg-gray-900 border-gray-900 text-white hover:bg-black",
                      ].join(" ")}
                      aria-label={voiceListening ? "Stop listening" : "Voice filter"}
                    >
                      {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                      data-testid="input-voice-sim"
                      value={voiceSimInput}
                      onChange={(e) => setVoiceSimInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyVoiceTranscript(voiceSimInput);
                          setVoiceSimInput("");
                        }
                      }}
                      placeholder={
                        voiceListening
                          ? voiceTranscript || "Listening…"
                          : "Voice: e.g. Select high urgency items · Over $500 · Clear selection"
                      }
                      className="flex-1 h-10 px-3 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:border-gray-300 placeholder:text-gray-400"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (voiceSimInput.trim()) {
                          applyVoiceTranscript(voiceSimInput);
                          setVoiceSimInput("");
                        } else {
                          toggleVoiceListen();
                        }
                      }}
                      className="h-10 px-3 rounded-xl bg-white border border-gray-200 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Apply
                    </button>
                  </div>

                  {voiceTranscript && (
                    <p className="font-mono text-[10px] text-purple-600 px-1">
                      Last voice transcript: “{voiceTranscript.slice(0, 80)}”
                    </p>
                  )}

                  <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
                    <SpatialCanvas
                      src={previewSrc}
                      boxes={canvasBoxes}
                      focusedId={focusedId}
                      onHover={setFocusedId}
                      onSelect={toggleSelect}
                      isScanning={state === "committing"}
                      telemetryLines={
                        state === "committing"
                          ? ["COMMITTING TO PORTFOLIO...", "INSERTING ASSETS (CENTS-MAPPED)..."]
                          : undefined
                      }
                    />

                    <div className="max-h-[min(560px,60vh)] overflow-auto rounded-3xl border border-gray-100 bg-white/50 p-2 space-y-2">
                      {scanResult.detectedAssets.map((a: DetectedAsset, idx: number) => {
                        const id = a.id ?? `detected-${idx}`;
                        return (
                          <HudCard
                            key={id}
                            asset={{ ...a, id }}
                            idx={idx}
                            selected={selectedIds.has(id)}
                            focused={focusedId === id}
                            onToggle={() => toggleSelect(id)}
                            onHover={handleHover}
                            cardRef={(el) => {
                              if (el) cardRefs.current.set(id, el);
                              else cardRefs.current.delete(id);
                            }}
                          />
                        );
                      })}

                      {scanResult.detectedAssets.length === 0 && (
                        <div className="p-8 text-center">
                          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                          <p className="mt-2 text-sm font-semibold text-gray-700">
                            No resaleable assets detected.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {scanResult.portfolioSummary.scanNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => reset()}
                      className="h-11 px-4 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      New Scan
                    </button>
                    <button
                      type="button"
                      disabled={selectedIds.size === 0 || state !== "results"}
                      onClick={() => void doCommit()}
                      className="h-11 px-6 rounded-xl bg-gray-900 text-white text-sm font-black tracking-wide disabled:opacity-40 hover:bg-black inline-flex items-center gap-2 justify-center min-w-[180px] transition-colors"
                    >
                      {state === "committing"
                        ? "Committing…"
                        : state === "committed"
                          ? "Committed"
                          : `Commit ${selectedIds.size} to Portfolio`}
                    </button>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
