// ─── Meta AI (Meta Model) Service ─────────────────────────────────────────────
// Wraps Meta Model (muse-spark-1.3) via the OpenAI-compatible SDK for:
//   • analyzePhysicalAssets — scan a photo, detect resaleable physical assets
//   • generateExitListing   — draft a resale listing + platform payout options
// Design rules (DIR-002):
//   • Lazy singleton — client only constructed when META_MODEL_API_KEY exists.
//   • Dollars on the wire here; *_Cents / DB storage always integer cents.
//   • NEVER throws — any live failure falls back to the deterministic mock.

import OpenAI from "openai";
import { logger } from "../lib/logger.js";

export const META_MODEL = "muse-spark-1.3";
export const META_BASE_URL = "https://api.meta.ai/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export type Urgency = "Low" | "Medium" | "High" | "Critical";
export type DetectedAssetCategory = "TECH" | "FASHION";

/** DIR-003: spatial bounding box in 0–100 percent space relative to the source photo. */
export interface SpatialBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedAsset {
  name: string;
  make?: string;
  model?: string;
  storageCapacity?: string;
  category: DetectedAssetCategory;
  condition: string;
  estimatedValueDollars: number;
  estimatedValueCents: number;
  /** DIR-002 compat: estimatedValue in dollars. */
  estimatedValue: number;
  depreciationCliffDays: number;
  cliffReason: string;
  urgency: Urgency;
  sellRecommendation: string;
  confidence: number;
  /**
   * DIR-003: where the item sits in the photo (0–100 space).
   * Optional in this pass — live models may omit it; the frontend then
   * falls back to a deterministic grid placement. Required-ness lands
   * in a later pass once false-negative flows are handled.
   */
  box?: SpatialBox;
}

export interface ScanAnalysis {
  detectedAssets: DetectedAsset[];
  portfolioSummary: {
    totalDetectedValue: number;
    immediateActionCount: number;
    scanNotes: string;
  };
}

export type ListingPlatform = "eBay" | "Swappa" | "Marketplace";
export interface PlatformRecommendation {
  platform: ListingPlatform;
  suggestedPrice: number;
  netPayout: number;
}
export interface ExitListing {
  title: string;
  platformRecommendations: PlatformRecommendation[];
  description: string;
  bulletPoints: string[];
}
export type AiSource = "meta-model" | "mock";
export interface ExitListingInput {
  name: string;
  category: string;
  condition: string;
  estimatedValueDollars: number;
}

let client: OpenAI | null | undefined;

function getClient(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.META_MODEL_API_KEY;
  if (!apiKey) {
    client = null;
    return client;
  }
  try {
    client = new OpenAI({ baseURL: META_BASE_URL, apiKey });
  } catch (err) {
    logger.warn({ err }, "Failed to construct Meta Model client; using mock AI");
    client = null;
  }
  return client;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function toStringOr(value: unknown, fallback: string): string {
  return toOptionalString(value) ?? fallback;
}
function clampConfidence(value: unknown, fallback = 0.5): number {
  let n = toFiniteNumber(value, fallback);
  if (n > 1 && n <= 100) n = n / 100;
  return Math.min(1, Math.max(0, n));
}
function normalizeUrgency(value: unknown, cliffDays: number): Urgency {
  if (value === "Low" || value === "Medium" || value === "High" || value === "Critical") return value;
  if (cliffDays <= 7) return "Critical";
  if (cliffDays <= 21) return "High";
  if (cliffDays <= 45) return "Medium";
  return "Low";
}
/**
 * DIR-003: normalize a model-supplied bounding box.
 * Returns undefined when the box is missing or malformed — never invents
 * coordinates. Valid boxes are clamped into the 0–100 frame (keeping every
 * edge >=2% inside the photo), inverted axes are swapped, and degenerate
 * (<2% wide/tall) results are rejected so the UI never renders a sliver.
 */
function validateBox(value: unknown): SpatialBox | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const coords = [raw.ymin, raw.xmin, raw.ymax, raw.xmax].map((v) =>
    typeof v === "number" ? v : Number(v),
  );
  if (coords.some((n) => !Number.isFinite(n))) return undefined;
  const clamp = (n: number) => Math.min(98, Math.max(2, n));
  let [ymin, xmin, ymax, xmax] = coords.map(clamp);
  if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
  if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
  if (xmax - xmin < 2 || ymax - ymin < 2) return undefined;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return { ymin: round2(ymin), xmin: round2(xmin), ymax: round2(ymax), xmax: round2(xmax) };
}

function parseJsonObject(content: string): Record<string, unknown> {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Meta Model response did not contain a JSON object");
  }
  const parsed: unknown = JSON.parse(content.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Meta Model response JSON was not an object");
  }
  return parsed as Record<string, unknown>;
}
function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return run(controller.signal).finally(() => clearTimeout(timer));
}

function buildDetectedAsset(raw: Record<string, unknown>): DetectedAsset {
  const name = toStringOr(raw.name, "Unknown item");
  const estimatedValueDollars = Math.max(
    0,
    roundMoney(toFiniteNumber(raw.estimatedValue ?? raw.estimatedValueDollars, 0)),
  );
  const depreciationCliffDays = Math.max(0, Math.round(toFiniteNumber(raw.depreciationCliffDays, 90)));
  const category: DetectedAssetCategory = raw.category === "FASHION" ? "FASHION" : "TECH";
  return {
    name,
    make: toOptionalString(raw.make),
    model: toOptionalString(raw.model) ?? name,
    storageCapacity: toOptionalString(raw.storageCapacity),
    category,
    condition: toStringOr(raw.condition, "Good"),
    estimatedValueDollars,
    estimatedValueCents: Math.round(estimatedValueDollars * 100),
    estimatedValue: estimatedValueDollars,
    depreciationCliffDays,
    cliffReason: toStringOr(raw.cliffReason, "Upcoming product refresh cycle"),
    urgency: normalizeUrgency(raw.urgency, depreciationCliffDays),
    sellRecommendation: toStringOr(raw.sellRecommendation, "List on the highest-net platform first."),
    confidence: clampConfidence(raw.confidence),
    // DIR-003: only attach a box the model actually supplied; missing → undefined.
    box: validateBox(raw.box),
  };
}

function normalizeScanAnalysis(parsed: Record<string, unknown>): ScanAnalysis {
  const rawAssets = Array.isArray(parsed.detectedAssets) ? parsed.detectedAssets : [];
  const detectedAssets = rawAssets
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map(buildDetectedAsset);
  const summary =
    parsed.portfolioSummary && typeof parsed.portfolioSummary === "object"
      ? (parsed.portfolioSummary as Record<string, unknown>)
      : {};
  return {
    detectedAssets,
    portfolioSummary: {
      totalDetectedValue: roundMoney(
        toFiniteNumber(
          summary.totalDetectedValue,
          detectedAssets.reduce((s, a) => s + a.estimatedValueDollars, 0),
        ),
      ),
      immediateActionCount: detectedAssets.filter(
        (a) => a.urgency === "High" || a.urgency === "Critical",
      ).length,
      scanNotes: toStringOr(summary.scanNotes, `${detectedAssets.length} item(s) detected in scan.`),
    },
  };
}

// ─── Mock fallback (exact DIR-002 assets) ─────────────────────────────────────

// DIR-003: deterministic, non-overlapping desk-layout boxes (0–100 space).
// Every edge sits >=2% inside the frame so they render cleanly on any desk photo.
const MOCK_BOXES: Record<string, SpatialBox> = {
  macbook: { ymin: 8, xmin: 8, ymax: 56, xmax: 58 },
  sony: { ymin: 10, xmin: 64, ymax: 34, xmax: 90 },
  keychron: { ymin: 62, xmin: 6, ymax: 90, xmax: 56 },
  lgMonitor: { ymin: 40, xmin: 64, ymax: 88, xmax: 94 },
};

function createMockScanAnalysis(): ScanAnalysis {
  const detectedAssets: DetectedAsset[] = [
    {
      name: "MacBook Pro 14 M1 Pro",
      make: "Apple",
      model: "MacBook Pro 14 M1 Pro",
      storageCapacity: "512GB",
      category: "TECH",
      condition: "Good",
      estimatedValueDollars: 920,
      estimatedValueCents: 92000,
      estimatedValue: 920,
      depreciationCliffDays: 21,
      cliffReason: "Next MacBook Pro generation expected to pressure M1 Pro resale prices.",
      urgency: "High",
      sellRecommendation: "List within the next 2 weeks to sell ahead of the depreciation cliff.",
      confidence: 0.92,
      box: MOCK_BOXES.macbook,
    },
    {
      name: "Sony WH-1000XM4",
      make: "Sony",
      model: "WH-1000XM4",
      category: "TECH",
      condition: "Good",
      estimatedValueDollars: 165,
      estimatedValueCents: 16500,
      estimatedValue: 165,
      depreciationCliffDays: 45,
      cliffReason: "Newer WH-1000X generation discounts are steadily eroding XM4 resale value.",
      urgency: "Medium",
      sellRecommendation: "List within the next month; bundle the case and cable for a faster sale.",
      confidence: 0.88,
      box: MOCK_BOXES.sony,
    },
    {
      name: "Keychron Q1 Pro",
      make: "Keychron",
      model: "Q1 Pro",
      category: "TECH",
      condition: "Like New",
      estimatedValueDollars: 120,
      estimatedValueCents: 12000,
      estimatedValue: 120,
      depreciationCliffDays: 110,
      cliffReason: "No imminent replacement expected; value decline is gradual.",
      urgency: "Low",
      sellRecommendation: "Safe to hold — monitor prices and sell when convenient.",
      confidence: 0.85,
      box: MOCK_BOXES.keychron,
    },
    {
      name: "LG 27UK850 4K Monitor",
      make: "LG",
      model: "27UK850",
      category: "TECH",
      condition: "Good",
      estimatedValueDollars: 210,
      estimatedValueCents: 21000,
      estimatedValue: 210,
      depreciationCliffDays: 18,
      cliffReason: "New 4K monitor releases and seasonal sales are set to undercut used pricing.",
      urgency: "High",
      sellRecommendation: "List immediately — local pickup avoids freight damage and fees.",
      confidence: 0.86,
      box: MOCK_BOXES.lgMonitor,
    },
  ];
  return {
    detectedAssets,
    portfolioSummary: {
      totalDetectedValue: 1415,
      immediateActionCount: 2,
      scanNotes: "Demo scan (mock fallback): 4 resaleable items detected on the desk.",
    },
  };
}


// ─── analyzePhysicalAssets ────────────────────────────────────────────────────

export async function analyzePhysicalAssets(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<{ analysis: ScanAnalysis; source: AiSource }> {
  const ai = getClient();
  if (!ai) {
    return { analysis: createMockScanAnalysis(), source: "mock" };
  }
  const rawBase64 = imageBase64.includes(",")
    ? imageBase64.slice(imageBase64.indexOf(",") + 1)
    : imageBase64;
  try {
    const completion = await withTimeout((signal) =>
      ai.chat.completions.create(
        {
          model: META_MODEL,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You are Liquid 2.0's spatial asset scanner. Inspect the photo and identify every resaleable physical item.",
                "Return STRICT JSON only — no markdown, no prose outside the JSON object.",
                'Schema: {"detectedAssets":[{"name":string,"make":string,"model":string,"category":"TECH"|"FASHION","condition":string,"estimatedValue":number (current resale value in USD dollars),"depreciationCliffDays":number (days until a sharp resale-price drop),"cliffReason":string,"urgency":"Low"|"Medium"|"High"|"Critical","sellRecommendation":string,"confidence":number (0..1),"box":{"ymin":number,"xmin":number,"ymax":number,"xmax":number} (bounding box of the item in the photo, each coordinate 0-100 percent of image height/width)}],"portfolioSummary":{"totalDetectedValue":number (sum of estimatedValue, dollars),"immediateActionCount":number (count of High/Critical),"scanNotes":string}}',
                "category must be TECH or FASHION only. Estimate values from visible make/model/condition. If nothing resaleable is visible, return an empty detectedAssets array with a scanNotes explanation.",
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Scan this photo for resaleable physical assets and return the JSON described in the system prompt." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${rawBase64}` } },
              ],
            },
          ],
        },
        { signal },
      ),
    );
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Meta Model returned an empty scan response");
    const parsed = parseJsonObject(content);
    if (Array.isArray(parsed.detectedAssets) && parsed.detectedAssets.length === 0) {
      const summary =
        parsed.portfolioSummary && typeof parsed.portfolioSummary === "object"
          ? (parsed.portfolioSummary as Record<string, unknown>)
          : {};
      return {
        analysis: {
          detectedAssets: [],
          portfolioSummary: {
            totalDetectedValue: 0,
            immediateActionCount: 0,
            scanNotes: toStringOr(summary.scanNotes, "No resaleable assets detected."),
          },
        },
        source: "meta-model",
      };
    }
    return { analysis: normalizeScanAnalysis(parsed), source: "meta-model" };
  } catch (err) {
    logger.warn({ err }, "Meta Model scan failed; falling back to mock analysis");
    return { analysis: createMockScanAnalysis(), source: "mock" };
  }
}

function createMockExitListing(asset: ExitListingInput): ExitListing {
  const price = roundMoney(asset.estimatedValueDollars);
  const platformRecommendations: PlatformRecommendation[] = [
    { platform: "eBay", suggestedPrice: price, netPayout: roundMoney(price * 0.87) },
  ];
  if (asset.category === "TECH") {
    platformRecommendations.push({ platform: "Swappa", suggestedPrice: price, netPayout: roundMoney(price * 0.9) });
  }
  platformRecommendations.push({ platform: "Marketplace", suggestedPrice: price, netPayout: roundMoney(price * 0.98) });
  return {
    title: `${asset.name} — ${asset.condition} — Priced to Sell`,
    platformRecommendations,
    description: `${asset.name} in ${asset.condition.toLowerCase()} condition. Fully tested and working. Priced from live secondary-market floors — list now to sell ahead of the next depreciation cliff. Ships fast or local pickup available.`,
    bulletPoints: [
      `${asset.condition} cosmetic condition — see photos`,
      "Fully tested and factory reset",
      "Priced to sell before the next value drop",
      "Fast dispatch / local pickup available",
    ],
  };
}


// ─── generateExitListing ──────────────────────────────────────────────────────

export async function generateExitListing(
  asset: ExitListingInput,
): Promise<{ listing: ExitListing; source: AiSource }> {
  const ai = getClient();
  if (!ai) {
    return { listing: createMockExitListing(asset), source: "mock" };
  }
  try {
    const completion = await withTimeout((signal) =>
      ai.chat.completions.create(
        {
          model: META_MODEL,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You write resale listings for Liquid 2.0. Return STRICT JSON only — no markdown.",
                'Schema: {"title":string,"platformRecommendations":[{"platform":"eBay"|"Swappa"|"Marketplace","suggestedPrice":number (USD dollars),"netPayout":number (USD dollars after platform fees)}],"description":string,"bulletPoints":[string]}',
                "Include eBay and Marketplace always; include Swappa only for TECH. netPayout must be below suggestedPrice (after fees).",
              ].join("\n"),
            },
            {
              role: "user",
              content: `Create a ready-to-publish listing for: ${asset.name} (category ${asset.category}, condition ${asset.condition}, current resale value $${asset.estimatedValueDollars}).`,
            },
          ],
        },
        { signal },
      ),
    );
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Meta Model returned an empty listing response");
    const parsed = parseJsonObject(content);
    const rawRecs = Array.isArray(parsed.platformRecommendations) ? parsed.platformRecommendations : [];
    const platformRecommendations: PlatformRecommendation[] = rawRecs
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .filter((r) => r.platform === "eBay" || r.platform === "Swappa" || r.platform === "Marketplace")
      .map((r) => ({
        platform: r.platform as ListingPlatform,
        suggestedPrice: roundMoney(toFiniteNumber(r.suggestedPrice, asset.estimatedValueDollars)),
        netPayout: roundMoney(toFiniteNumber(r.netPayout, asset.estimatedValueDollars * 0.87)),
      }));
    const title = toOptionalString(parsed.title);
    const description = toOptionalString(parsed.description);
    const bulletPoints = Array.isArray(parsed.bulletPoints)
      ? parsed.bulletPoints.filter((b): b is string => typeof b === "string" && !!b.trim())
      : [];
    if (!title || !description || platformRecommendations.length === 0) {
      throw new Error("Meta Model listing response was incomplete");
    }
    return {
      listing: {
        title,
        platformRecommendations,
        description,
        bulletPoints: bulletPoints.length ? bulletPoints : createMockExitListing(asset).bulletPoints,
      },
      source: "meta-model",
    };
  } catch (err) {
    logger.warn({ err }, "Meta Model listing failed; falling back to mock listing");
    return { listing: createMockExitListing(asset), source: "mock" };
  }
}

