// ─── EmptyPortfolio — Premium Onboarding Experience ───────────────────────────
//
// Displayed when an authenticated account has 0 tracked physical assets.
// Provides 3 immediate onramps:
//   1. Manual Asset Form
//   2. AI Spatial Camera Scan
//   3. 1-Click Starter Inventory Seeding

import { useState } from "react";
import { Plus, Zap, Sparkles, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { customFetch, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/tokens";

interface EmptyPortfolioProps {
  onAddClick: () => void;
  onScanClick: () => void;
}

export default function EmptyPortfolio({ onAddClick, onScanClick }: EmptyPortfolioProps) {
  const [seeding, setSeeding] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await customFetch<{ message: string; portfolio: any[] }>(
        "/api/portfolio/seed",
        { method: "POST" } as unknown as RequestInit,
      );
      await queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
      toast({
        title: "Starter Portfolio Loaded",
        description: `Seeded ${res.portfolio?.length ?? 5} physical assets into your account.`,
      });
    } catch (err: any) {
      toast({
        title: "Seed Failed",
        description: err?.message || "Could not seed starter items.",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section className="bg-white dark:bg-[#131722] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-8 sm:p-12 text-center max-w-4xl mx-auto my-4">
      {/* Brand Icon Banner */}
      <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center text-purple-700 dark:text-purple-400 mx-auto mb-6 shadow-sm">
        <Sparkles className="w-8 h-8" />
      </div>

      <h2 className="font-poppins font-bold text-2xl sm:text-3xl text-slate-950 dark:text-slate-100 tracking-tight mb-2">
        Start Tracking Your Physical Portfolio
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
        Laptops, phones, cameras, and hardware quietly lose 15–30% of their resale value during release
        cycles. Liquid predicts those cliffs so you can exit at peak value.
      </p>

      {/* 3 Onboarding Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mb-8">
        {/* Card 1: Add Item */}
        <div
          onClick={onAddClick}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1A1F2E]/60 hover:bg-slate-50 dark:hover:bg-[#1A1F2E] hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Add Manually</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter brand, model, purchase price, and track its projected depreciation cliff.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-purple-700 dark:text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open form</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Spatial Scan */}
        <div
          onClick={onScanClick}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1A1F2E]/60 hover:bg-slate-50 dark:hover:bg-[#1A1F2E] hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Spatial Camera Scan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload a workspace photo — our computer vision model segments items &amp; estimates values.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-purple-700 dark:text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Launch scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Demo Seed */}
        <div
          onClick={handleSeed}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1A1F2E]/60 hover:bg-slate-50 dark:hover:bg-[#1A1F2E] hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Load Demo Fleet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Instant 1-click preview: populate 5 realistic hardware assets with active market signals.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>{seeding ? "Loading..." : "Seed sample data"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <span>Curated secondary market benchmarks: Swappa, eBay, Facebook Marketplace</span>
        <span className="font-semibold text-slate-600 dark:text-slate-300">Zero subscription fees</span>
      </div>
    </section>
  );
}
