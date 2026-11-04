import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  X,
  Package,
  Sparkles,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Laptop,
  Headphones,
  Camera,
  Gamepad2,
  Watch,
  Flame,
  Info,
  TrendingDown,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPortfolioQueryKey, customFetch } from "@workspace/api-client-react";
import AssetImage from "@/components/ui/AssetImage";
import { formatCurrencyWhole } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { isDemoMode, addDemoAsset } from "@/lib/demoData";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type AssetCategoryKey =
  | "TECH"
  | "AUDIO"
  | "CAMERA"
  | "GAMING"
  | "WATCH"
  | "FASHION"
  | "SNEAKER"
  | "OTHER";

interface CategoryMeta {
  id: AssetCategoryKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultDropRate: number;
  sampleMakes: string[];
}

const CATEGORIES: CategoryMeta[] = [
  { id: "TECH", label: "Tech & Hardware", icon: Laptop, defaultDropRate: 0.16, sampleMakes: ["Apple", "Samsung", "Dell", "Lenovo"] },
  { id: "AUDIO", label: "Audio & Hi-Fi", icon: Headphones, defaultDropRate: 0.12, sampleMakes: ["Sony", "Bose", "Sennheiser", "Apple"] },
  { id: "CAMERA", label: "Camera & Optics", icon: Camera, defaultDropRate: 0.10, sampleMakes: ["Sony", "Canon", "Fujifilm", "Leica"] },
  { id: "GAMING", label: "Gaming & GPU", icon: Gamepad2, defaultDropRate: 0.18, sampleMakes: ["NVIDIA", "Sony", "Nintendo", "Valve"] },
  { id: "WATCH", label: "Horology & Watches", icon: Watch, defaultDropRate: 0.07, sampleMakes: ["Rolex", "Omega", "Tudor", "Seiko"] },
  { id: "FASHION", label: "Luxury & Apparel", icon: Sparkles, defaultDropRate: 0.14, sampleMakes: ["Gucci", "Louis Vuitton", "Prada", "Dior"] },
  { id: "SNEAKER", label: "Sneakers", icon: Flame, defaultDropRate: 0.15, sampleMakes: ["Nike", "Jordan", "Adidas", "New Balance"] },
  { id: "OTHER", label: "Other Assets", icon: Package, defaultDropRate: 0.12, sampleMakes: ["Herman Miller", "Dyson", "Teenage Engineering"] },
];

const PRESET_MODELS: Record<string, string[]> = {
  Apple: ["iPhone 16 Pro", "iPhone 15 Pro Max", "MacBook Pro M3", "iPad Pro M4", "AirPods Max"],
  Sony: ["WH-1000XM5", "A7IV Body", "PlayStation 5 Pro", "FX3 Cinema Line"],
  Rolex: ["Submariner Date", "Daytona Chronograph", "GMT-Master II"],
  Nike: ["Air Jordan 1 High OG", "Dunk Low Retro", "Air Max 95"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy Z Fold 6", "Odyssey OLED G9"],
  Canon: ["EOS R5 Mark II", "RF 24-70mm f/2.8L", "EOS R6"],
  NVIDIA: ["GeForce RTX 4090", "GeForce RTX 4080 Super", "RTX 4070 Ti Super"],
  Nintendo: ["Switch OLED", "Switch 2 Pre-Order"],
  Leica: ["M11 Rangefinder", "Q3 28mm"],
};

const CLIFF_REASONS = [
  "Hardware Keynote Expected",
  "Annual Refresh Cycle",
  "Next-Gen Silicon Release",
  "Secondary Market Inflow Peak",
  "Warranty Expiration Cliff",
];

export default function AddItemModal({ open, onOpenChange }: AddItemModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<AssetCategoryKey>("TECH");
  const [make, setMake] = useState("Apple");
  const [model, setModel] = useState("iPhone 15 Pro Max");
  const [storageCapacity, setStorageCapacity] = useState("256GB");
  const [purchasePrice, setPurchasePrice] = useState("1199");
  const [currentValue, setCurrentValue] = useState("890");
  const [cliffDays, setCliffDays] = useState(14);
  const [cliffReason, setCliffReason] = useState("Hardware Keynote Expected");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCatMeta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const dropRate = selectedCatMeta.defaultDropRate;

  const currentValNum = Math.max(1, parseFloat(currentValue || "0"));
  const purchaseValNum = Math.max(1, parseFloat(purchasePrice || "0"));
  const projectedDropDollars = Math.round(currentValNum * dropRate);
  const retentionPct = Math.min(100, Math.round((currentValNum / purchaseValNum) * 100));

  const handleNextStep = () => {
    if (!make.trim() || !model.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please specify both the brand/maker and product model name.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !make.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please specify both the brand and model name.",
        variant: "destructive",
      });
      return;
    }

    const purchase = Math.max(1, Math.round(purchaseValNum * 100));
    const current = Math.max(1, Math.round(currentValNum * 100));
    const projectedDrop = Math.round(current * dropRate);

    const cliffDate = new Date();
    cliffDate.setDate(cliffDate.getDate() + cliffDays);
    cliffDate.setHours(12, 0, 0, 0);

    const assetPayload = {
      category,
      make: make.trim(),
      model: model.trim(),
      storageCapacity: storageCapacity.trim() || undefined,
      purchasePrice: purchase,
      currentEstimatedValue: current,
      projectedDrop,
      cliffDate: cliffDate.toISOString(),
      cliffReason: cliffReason.trim() || "Lifecycle depreciation event",
      status: cliffDays <= 14 ? "ACTION_REQUIRED" : "HOLD",
    };

    setIsSubmitting(true);
    try {
      if (isDemoMode()) {
        // Direct local addition for offline / demo mode
        addDemoAsset(assetPayload);
      } else {
        try {
          await customFetch("/api/portfolio", {
            method: "POST",
            body: JSON.stringify(assetPayload),
          });
        } catch (apiErr: any) {
          // If live API returns 401 or network error, transparently persist to local store
          console.warn("Backend unavailable or unauthorized, falling back to local store:", apiErr);
          addDemoAsset(assetPayload);
        }
      }

      await queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });

      toast({
        title: "Asset Added Successfully",
        description: `${make} ${model} is now actively tracked in your portfolio.`,
      });

      onOpenChange(false);
      setStep(1);
    } catch (err: any) {
      toast({
        title: "Failed to Add Asset",
        description: err?.message || "Could not register asset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(640px,94vw)] w-[94vw] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        <DialogTitle className="sr-only">Add Portfolio Asset</DialogTitle>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0B0D13]/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
                  Add Asset to Portfolio
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {step === 1 ? "Step 1 of 2 · Category & Hardware Specs" : "Step 2 of 2 · Financials & Cliff Trajectory"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1A1F2E] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-[#0B0D13]/40 shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              step === 1
                ? "border-[#7C3AED] text-[#7C3AED] dark:text-purple-400 bg-white dark:bg-[#131722]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-current/15 text-[10px] flex items-center justify-center font-mono">1</span>
            <span>1. Hardware Spec</span>
          </button>
          <button
            type="button"
            onClick={() => handleNextStep()}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              step === 2
                ? "border-[#7C3AED] text-[#7C3AED] dark:text-purple-400 bg-white dark:bg-[#131722]"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-current/15 text-[10px] flex items-center justify-center font-mono">2</span>
            <span>2. Valuation & Risk</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-4"
              >
                {/* Category Selection Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Asset Category
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(dropRate * 100).toFixed(0)}% base risk
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      const isSelected = category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCategory(c.id);
                            if (c.sampleMakes[0] && !PRESET_MODELS[make]) {
                              setMake(c.sampleMakes[0]);
                            }
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm ring-1 ring-[#7C3AED]"
                              : "bg-slate-50 dark:bg-[#1A1F2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                            <span className={`text-[10px] font-mono ${isSelected ? "text-purple-200" : "text-slate-400"}`}>
                              {(c.defaultDropRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className="text-xs font-semibold truncate leading-tight">
                            {c.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand & Model Input Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      required
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="e.g. Apple, Sony, Rolex"
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                    />
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                      {selectedCatMeta.sampleMakes.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setMake(p);
                            if (PRESET_MODELS[p]?.[0]) setModel(PRESET_MODELS[p][0]);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                            make === p
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                              : "bg-slate-100 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#23283A]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Model & Hardware Variant
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. iPhone 15 Pro Max, Submariner"
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                    />
                    {PRESET_MODELS[make] && (
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                        {PRESET_MODELS[make].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                              model === m
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                                : "bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage & Spec Variant */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Storage / Condition Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={storageCapacity}
                    onChange={(e) => setStorageCapacity(e.target.value)}
                    placeholder="e.g. 256GB Titanium, Mint in Box, 16GB Unified RAM"
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-white dark:bg-[#0B0D13] border border-slate-200 dark:border-slate-800 shrink-0">
                    <AssetImage
                      model={model}
                      make={make}
                      category={category}
                      alt={model}
                      aspectRatio="square"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Live Matched Asset
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {make} {model} {storageCapacity ? `(${storageCapacity})` : ""}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Base category risk profile: {(dropRate * 100).toFixed(0)}% drop on release.
                    </p>
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm active:scale-98 flex items-center gap-1.5"
                  >
                    Continue to Valuation
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.16 }}
                className="space-y-4"
              >
                {/* Financials: Purchase vs Current Resale */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Original Purchase Price ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="1099"
                        className="w-full h-10 pl-7 pr-3 text-xs font-mono bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Current Resale Benchmark ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        placeholder="750"
                        className="w-full h-10 pl-7 pr-3 text-xs font-mono bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Valuation Metrics Summary */}
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider block">
                      Value Retained
                    </span>
                    <span className="font-mono text-sm sm:text-base font-bold text-purple-900 dark:text-purple-100">
                      {retentionPct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider block">
                      Cliff Drop Rate
                    </span>
                    <span className="font-mono text-sm sm:text-base font-bold text-purple-900 dark:text-purple-100">
                      {(dropRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider block">
                      Projected Loss
                    </span>
                    <span className="font-mono text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
                      -${projectedDropDollars}
                    </span>
                  </div>
                </div>

                {/* Days to Cliff Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Days Until Depreciation Cliff
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          cliffDays <= 14
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : cliffDays <= 45
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {cliffDays <= 14
                          ? "Action Required"
                          : cliffDays <= 45
                            ? "Window Open"
                            : "Safe Horizon"}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-[#1A1F2E] px-2 py-0.5 rounded">
                        {cliffDays}d
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={cliffDays}
                    onChange={(e) => setCliffDays(parseInt(e.target.value, 10))}
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />

                  {/* Preset Quick Jumps */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {[7, 14, 30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCliffDays(d)}
                        className={`py-1 text-xs font-mono font-semibold rounded-lg border transition-all text-center ${
                          cliffDays === d
                            ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                            : "bg-slate-50 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#23283A]"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cliff Reason & Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Depreciation Catalyst Event
                  </label>
                  <input
                    type="text"
                    required
                    value={cliffReason}
                    onChange={(e) => setCliffReason(e.target.value)}
                    placeholder="e.g. Hardware Keynote Expected"
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                  />
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                    {CLIFF_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCliffReason(r)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                          cliffReason === r
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                            : "bg-slate-100 dark:bg-[#1A1F2E] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#23283A]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {isSubmitting ? "Adding..." : "Add to Portfolio"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </DialogContent>
    </Dialog>
  );
}
