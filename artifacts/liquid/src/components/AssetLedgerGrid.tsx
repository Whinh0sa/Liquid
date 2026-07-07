// ─── AssetLedgerGrid ──────────────────────────────────────────────────────────
//
// The full asset ledger: view-type toggle (tiles / list) + the grid of
// <AssetCard> items and their loading skeletons.

import { LayoutGrid, List } from "lucide-react";
import AssetCard from "@/components/AssetCard";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DepreciationCliff {
  daysAway: number;
  projectedDrop: number;
  reason: string;
}

export interface LedgerAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: DepreciationCliff;
  status: string;
}

interface SoldRecord {
  saleValue: number;
  dropAvoided: number;
  soldAt: number;
}

interface AssetLedgerGridProps {
  isLoading: boolean;
  portfolio: LedgerAsset[];
  viewType: "tiles" | "list";
  onViewChange: (v: "tiles" | "list") => void;
  sellingIds: Set<string>;
  soldRecords: Map<string, SoldRecord>;
  priceAlerts: Map<string, number>;
  onSell: (id: string) => void;
  onOpen: (asset: LedgerAsset) => void;
  onSetAlert: (id: string, price: number | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AssetLedgerGrid({
  isLoading,
  portfolio,
  viewType,
  onViewChange,
  sellingIds,
  soldRecords,
  priceAlerts,
  onSell,
  onOpen,
  onSetAlert,
}: AssetLedgerGridProps) {
  return (
    <section>
      {/* ── Header + view toggle ──────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Your Items</h2>
          <span className="text-sm text-gray-400">{portfolio.length} items tracked</span>
        </div>

        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 self-start">
          <button
            type="button"
            onClick={() => onViewChange("tiles")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewType === "tiles" ? "bg-amber-50 text-amber-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tiles
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewType === "list" ? "bg-amber-50 text-amber-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* ── Grid / list ───────────────────────────────────────────── */}
      <div
        className={
          viewType === "tiles"
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            : "grid grid-cols-1 gap-3"
        }
      >
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`bg-white rounded-3xl border border-gray-100 p-5 animate-pulse ${
                  viewType === "list" ? "flex items-center gap-4" : ""
                }`}
              >
                {viewType === "list" && (
                  <div className="h-16 w-16 bg-gray-100 rounded-2xl shrink-0" />
                )}
                <div className={viewType === "list" ? "flex-1" : ""}>
                  <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
                  <div className="h-6 bg-gray-100 rounded w-2/3 mb-4" />
                  <div className="h-8 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))
          : portfolio.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelling={sellingIds.has(asset.id)}
                soldRecord={soldRecords.get(asset.id)}
                alertPrice={priceAlerts.get(asset.id)}
                onSell={onSell}
                onOpen={onOpen}
                onSetAlert={onSetAlert}
                viewType={viewType}
              />
            ))}
      </div>
    </section>
  );
}
