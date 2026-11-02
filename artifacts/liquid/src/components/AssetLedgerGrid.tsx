// ─── AssetLedgerGrid — Workstation Ledger Component ──────────────────────────
//
// The central asset workspace:
//   • Filter tabs: All, Sell Window, Urgent Cliffs, Exited
//   • Real-time search & category filter
//   • High-density view switcher: Grid (Card tiles) vs. Dense Table (Ledger rows)
//   • Streamlined color tokens adhering to the 3-tier semantic model

import { useState, useMemo } from "react";
import { LayoutGrid, List, Search, Filter, Clock, AlertTriangle, CheckCircle, Package } from "lucide-react";
import AssetCard from "@/components/AssetCard";
import { computeSellWindow } from "@/lib/sellWindow";
import { formatCurrency as fmt } from "@/lib/currency";
import { URGENCY_PILL } from "@/lib/urgency";

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

type FilterTab = "all" | "window" | "urgent" | "exited";

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
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    portfolio.forEach((a) => set.add(a.category));
    return ["ALL", ...Array.from(set)];
  }, [portfolio]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let windowCount = 0;
    let urgentCount = 0;
    let exitedCount = 0;

    portfolio.forEach((a) => {
      const isExited = a.status === "LIQUIDATE" || a.status === "IN_TRANSIT" || soldRecords.has(a.id);
      if (isExited) {
        exitedCount++;
      } else {
        const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
        if (sw.urgency === "WINDOW") windowCount++;
        if (sw.urgency === "URGENT" || a.depreciationCliff.daysAway <= 14) urgentCount++;
      }
    });

    return {
      all: portfolio.length,
      window: windowCount,
      urgent: urgentCount,
      exited: exitedCount,
    };
  }, [portfolio, soldRecords]);

  // Filtered portfolio
  const filteredAssets = useMemo(() => {
    return portfolio.filter((a) => {
      const isExited = a.status === "LIQUIDATE" || a.status === "IN_TRANSIT" || soldRecords.has(a.id);
      const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);

      // Tab filter
      if (activeTab === "window" && (sw.urgency !== "WINDOW" || isExited)) return false;
      if (activeTab === "urgent" && (a.depreciationCliff.daysAway > 14 || isExited)) return false;
      if (activeTab === "exited" && !isExited) return false;

      // Category filter
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.model.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.depreciationCliff.reason.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [portfolio, activeTab, selectedCategory, searchQuery, soldRecords]);

  return (
    <section className="space-y-4">
      {/* ── Control Bar ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>All Assets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("window")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "window"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>In Sell Window</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "window" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {tabCounts.window}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("urgent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "urgent"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:text-amber-800 hover:bg-amber-50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Urgent Cliffs</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "urgent" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {tabCounts.urgent}
            </span>
          </button>

          {tabCounts.exited > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("exited")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === "exited"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Exited</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "exited" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tabCounts.exited}
              </span>
            </button>
          )}
        </div>

        {/* Search, Category & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-purple-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Category Dropdown */}
          {categories.length > 2 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-purple-500 text-slate-700 font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : c}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 shrink-0">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => onViewChange("tiles")}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewType === "tiles" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => onViewChange("list")}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewType === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Asset Grid / List ──────────────────────────────────────── */}
      {filteredAssets.length === 0 && !isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm mb-1">No matching assets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Try adjusting your search query, selecting another category, or clearing the filter tab.
          </p>
          {(searchQuery || selectedCategory !== "ALL" || activeTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setActiveTab("all");
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewType === "tiles"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              : "grid grid-cols-1 gap-2.5"
          }
        >
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse ${
                    viewType === "list" ? "flex items-center gap-4" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="h-3 bg-slate-100 rounded w-1/4 mb-2.5" />
                    <div className="h-5 bg-slate-100 rounded w-2/3 mb-4" />
                    <div className="h-6 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            : filteredAssets.map((asset) => (
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
      )}
    </section>
  );
}
