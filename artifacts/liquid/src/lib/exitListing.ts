// ── Exit Listing — shared types + per-platform formatting (DIR-004) ──────────
// Mirrors artifacts/api-server/src/services/metaAi.ts `ExitListing`.
// All platform copy derivation lives here so ExitListingModal stays presentational.

import { formatCurrency } from "./currency";

export type ListingPlatform = "eBay" | "Swappa" | "Marketplace";
export type ListingSource = "meta-model" | "mock";

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

export interface ExitListingResponse {
  assetId?: string;
  source: ListingSource;
  listing: ExitListing;
}

export const LISTING_PLATFORMS: ListingPlatform[] = ["Swappa", "eBay", "Marketplace"];

export const SWAPPA_CHECKLIST: string[] = [
  "Verify IMEI/serial not blacklisted",
  "Include charger/cable",
  "Factory reset + remove Find My",
];

export const MARKETPLACE_MEETUP_CHECKLIST: string[] = [
  "Meet in a public place (bank / police safe-trade zone)",
  "Cash or instant transfer — test the device together",
  "Bring a friend for higher-value items",
];

export const MARKETPLACE_MAX_CHARS = 500;

export function recommendationFor(
  listing: ExitListing,
  platform: ListingPlatform,
): PlatformRecommendation | undefined {
  return listing.platformRecommendations.find((r) => r.platform === platform);
}

/** Keyword tokens for eBay search optimisation — derived from title + make. */
export function extractKeywords(title: string, make?: string): string[] {
  const stop = new Set(["the", "a", "an", "and", "or", "for", "with", "—", "-", "to", "sell", "priced"]);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string): void => {
    const token = raw.replace(/[^a-zA-Z0-9+.-]/g, "").trim();
    const key = token.toLowerCase();
    if (!token || stop.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(token);
  };
  if (make) make.split(/\s+/).forEach(push);
  title.split(/\s+/).forEach(push);
  return out.slice(0, 12);
}

/** Short, conversational Marketplace copy — hard-capped below 500 chars. */
export function toMarketplaceDescription(listing: ExitListing, assetModel: string): string {
  const firstSentence = listing.description.split(/(?<=[.!?])\s+/)[0] ?? listing.description;
  const conversational = `Hi! Selling my ${assetModel} — ${firstSentence.charAt(0).toLowerCase()}${firstSentence.slice(1)}`;
  const text = `${conversational} Works great, priced fairly for a quick sale. Happy to answer questions — message me!`;
  return text.length <= MARKETPLACE_MAX_CHARS ? text : `${text.slice(0, MARKETPLACE_MAX_CHARS - 1).trimEnd()}…`;
}

export function shippingRecommendation(suggestedPrice: number): string {
  return suggestedPrice > 500
    ? "Small Parcel · USPS Ground Advantage · Add insurance (value over $500) + signature confirmation"
    : "Small Parcel · USPS Ground Advantage · Tracking included, insurance optional";
}

// ── Plain-text payloads behind the 1-click copy buttons ───────────────────────
export function buildCopyText(
  platform: ListingPlatform,
  listing: ExitListing,
  assetModel: string,
  conditionLabel?: string,
): string {
  const rec = recommendationFor(listing, platform);
  const priceLine = rec
    ? `List: ${formatCurrency(rec.suggestedPrice)} · You net ${formatCurrency(rec.netPayout)}`
    : "";
  const bullets = listing.bulletPoints.map((b) => `• ${b}`).join("\n");

  if (platform === "Swappa") {
    return [
      listing.title, priceLine, "", bullets, "",
      "Before you list:",
      ...SWAPPA_CHECKLIST.map((c) => `☐ ${c}`),
    ].filter(Boolean).join("\n");
  }
  if (platform === "eBay") {
    return [
      listing.title, priceLine,
      conditionLabel ? `Condition grade: ${conditionLabel} — disclosed honestly, see photos` : "",
      "", listing.description, "", bullets, "",
      `Keywords: ${extractKeywords(listing.title).join(" ")}`,
      `Shipping: ${shippingRecommendation(rec?.suggestedPrice ?? 0)}`,
    ].filter(Boolean).join("\n");
  }
  return [
    toMarketplaceDescription(listing, assetModel), priceLine, "", bullets, "",
    "Safe meetup:",
    ...MARKETPLACE_MEETUP_CHECKLIST.map((c) => `☐ ${c}`),
  ].filter(Boolean).join("\n");
}

// ── Deterministic client-side mock (mirrors server createMockExitListing) ────
// Used only if the API call fails, so the demo never dead-ends.
export function createMockExitListing(input: {
  assetModel: string;
  category?: string;
  conditionLabel?: string;
  currentValueDollars?: number;
}): ExitListingResponse {
  const price = Math.round((input.currentValueDollars ?? 0) * 100) / 100;
  const condition = input.conditionLabel ?? "Good";
  const platformRecommendations: PlatformRecommendation[] = [
    { platform: "eBay", suggestedPrice: price, netPayout: Math.round(price * 0.87 * 100) / 100 },
  ];
  if ((input.category ?? "TECH").toUpperCase().includes("TECH")) {
    platformRecommendations.push({ platform: "Swappa", suggestedPrice: price, netPayout: Math.round(price * 0.9 * 100) / 100 });
  }
  platformRecommendations.push({ platform: "Marketplace", suggestedPrice: price, netPayout: Math.round(price * 0.98 * 100) / 100 });
  return {
    source: "mock",
    listing: {
      title: `${input.assetModel} — ${condition} — Priced to Sell`,
      platformRecommendations,
      description: `${input.assetModel} in ${condition.toLowerCase()} condition. Fully tested and working. Priced from live secondary-market floors — list now to sell ahead of the next depreciation cliff. Ships fast or local pickup available.`,
      bulletPoints: [
        `${condition} cosmetic condition — see photos`,
        "Fully tested and factory reset",
        "Priced to sell before the next value drop",
        "Fast dispatch / local pickup available",
      ],
    },
  };
}

