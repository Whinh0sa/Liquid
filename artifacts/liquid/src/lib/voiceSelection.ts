// ── Voice selection for Spatial Scan results (DIR-004) ───────────────────────
// Meta Voice multimodal: spoken (or typed-as-simulated) commands select items
// in a scan result set. Parsing lives here so components stay presentational.

import type { ScanUrgency } from "@/components/SpatialCanvas";

export interface VoiceSelectableAsset {
  id: string;
  category: "TECH" | "FASHION";
  estimatedValueDollars: number;
  urgency: ScanUrgency;
}

export type VoiceAction = "select" | "clear" | "select-all" | "deselect";

export interface VoiceCommandResult {
  action: VoiceAction;
  /** Predicate over assets — present for "select". */
  filterFn?: (asset: VoiceSelectableAsset) => boolean;
  /** Human label for the matched criterion, e.g. "over $500". */
  criterion: string;
  /** Resulting selection count — drives the "Voice: X assets selected" toast. */
  selectedCount: number;
}

const idsWhere = (assets: VoiceSelectableAsset[], fn: (a: VoiceSelectableAsset) => boolean): Set<string> =>
  new Set(assets.filter(fn).map((a) => a.id));

/**
 * Parse a transcript into a selection mutation. Priority: clear > select-all >
 * amount > urgency > category — the most specific spoken criterion wins.
 */
export function parseVoiceCommand(
  transcript: string,
  detectedAssets: VoiceSelectableAsset[],
  currentSelectedIds: ReadonlySet<string> = new Set(),
): VoiceCommandResult {
  const text = transcript.toLowerCase().trim();
  const all = new Set(detectedAssets.map((a) => a.id));
  const result = (action: VoiceAction, ids: Set<string>, criterion: string, filterFn?: (a: VoiceSelectableAsset) => boolean): VoiceCommandResult =>
    ({ action, filterFn, criterion, selectedCount: ids.size });

  if (/\b(clear|reset|deselect all|unselect|none)\b/.test(text)) {
    return result("clear", new Set(), "selection cleared");
  }
  if (/\b(select all|everything|all items|all of them)\b/.test(text)) {
    return result("select-all", all, "all items", (a) => all.has(a.id));
  }

  const amountMatch = /(?:over|above|greater than|more than|>)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)/.exec(text)
    ?? /\$\s*(\d[\d,]*(?:\.\d+)?)\s*(?:and up|or more|\+)/.exec(text);
  if (amountMatch) {
    const threshold = Number(amountMatch[1].replace(/,/g, ""));
    if (Number.isFinite(threshold)) {
      const fn = (a: VoiceSelectableAsset): boolean => a.estimatedValueDollars > threshold;
      return result("select", idsWhere(detectedAssets, fn), `over $${threshold.toLocaleString("en-US")}`, fn);
    }
  }

  if (/\b(urgent|urgency|high|critical)\b/.test(text) || (/\b(priority|risk)\b/.test(text) && !/\blow\b/.test(text))) {
    const fn = (a: VoiceSelectableAsset): boolean => a.urgency === "High" || a.urgency === "Critical";
    return result("select", idsWhere(detectedAssets, fn), "high urgency", fn);
  }
  if (/\blow\b/.test(text) && /urgenc|priority|risk/.test(text)) {
    const fn = (a: VoiceSelectableAsset): boolean => a.urgency === "Low";
    return result("select", idsWhere(detectedAssets, fn), "low urgency", fn);
  }
  if (/\b(tech|technology|electronics?|gadgets?|hardware)\b/.test(text)) {
    const fn = (a: VoiceSelectableAsset): boolean => a.category === "TECH";
    return result("select", idsWhere(detectedAssets, fn), "tech", fn);
  }
  if (/\b(fashion|clothes|clothing|apparel|sneakers?|wearables?)\b/.test(text)) {
    const fn = (a: VoiceSelectableAsset): boolean => a.category === "FASHION";
    return result("select", idsWhere(detectedAssets, fn), "fashion", fn);
  }
  if (/\b(deselect|remove|unselect)\b/.test(text)) {
    return result("deselect", new Set(currentSelectedIds), "deselected");
  }
  // Unrecognised — keep the current selection untouched.
  return result("deselect", new Set(currentSelectedIds), "not recognised");
}

/** Minimal Web Speech API surface (not in TS DOM lib) — local, no `any`. */
export interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
