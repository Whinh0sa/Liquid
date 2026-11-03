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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPortfolioQueryKey, customFetch } from "@workspace/api-client-react";
import AssetImage from "@/components/ui/AssetImage";
import { formatCurrencyWhole } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

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
  { id: "TECH", label: "Tech & Hardware", icon: Laptop, defaultDropRate: 0.16, sampleMakes: ["Apple", "Samsung", "Dell"] },
  { id: "AUDIO", label: "Audio & Hi-Fi", icon: Headphones, defaultDropRate: 0.12, sampleMakes: ["Sony", "Bose", "Sennheiser"] },
  { id: "CAMERA", label: "Camera & Optics", icon: Camera, defaultDropRate: 0.10, sampleMakes: ["Sony", "Canon", "Leica"] },
  { id: "GAMING", label: "Gaming & GPU", icon: Gamepad2, defaultDropRate: 0.18, sampleMakes: ["NVIDIA", "Sony", "Nintendo"] },
  { id: "WATCH", label: "Horology / Watches", icon: Watch, defaultDropRate: 0.07, sampleMakes: ["Rolex", "Omega", "Patek"] },
  { id: "FASHION", label: "Luxury & Apparel", icon: Sparkles, defaultDropRate: 0.14, sampleMakes: ["Gucci", "Louis Vuitton", "Prada"] },
  { id: "SNEAKER", label: "Sneakers", icon: Flame, defaultDropRate: 0.15, sampleMakes: ["Nike", "Jordan", "Adidas"] },
  { id: "OTHER", label: "Other Assets", icon: Package, defaultDropRate: 0.12, sampleMakes: ["Herman Miller", "Custom"] },
];

const PRESET_MODELS: Record<string, string[]> = {
  Apple: ["iPhone 15 Pro Max", "iPhone 16 Pro", "MacBook Pro M3", "iPad Pro M4", "AirPods Max"],
  Sony: ["A7IV Body", "WH-1000XM5", "PlayStation 5 Pro", "FX3 Cinema Line"],
  Rolex: ["Submariner Date", "Daytona Chronograph", "GMT-Master II"],
  Nike: ["Air Jordan 1 High OG", "Dunk Low Retro", "Air Max 95"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy Z Fold 6", "Odyssey OLED G9"],
  Canon: ["EOS R5 Mark II", "RF 24-70mm f/2.8L", "EOS R6"],
  NVIDIA: ["GeForce RTX 4090", "GeForce RTX 4080 Super"],
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

    setIsSubmitting(true);
    try {
      await customFetch("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({
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
        }),
      });

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
        description: err?.message || "Could not register asset in the database.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(680px,96vw)] w-[96vw] max-h-[92vh] overflow-y-auto p-0 bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        <DialogTitle className="sr-only">Add Portfolio Asset</DialogTitle>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#0B0D13]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-poppins font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                  Add Asset to Portfolio
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {step === 1
                  ? "Select item category and hardware specification."
                  : "Calibrate valuation, depreciation trajectory, and cliff event."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
          <div
            className="h-full bg-[#7C3AED] transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Category Selection Grid */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    1. Select Asset Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                            isSelected
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm"
                              : "bg-white dark:bg-[#1A1F2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#23283A]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-purple-300 dark:text-purple-700" : "text-slate-500 dark:text-slate-400"}`} />
                            <span className="text-[10px] font-mono opacity-80">
                              {(c.defaultDropRate * 100).toFixed(0)}% drop
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Manufacturer / Brand
                    </label>
                    <input
                      type="text"
                      required
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="e.g. Apple, Sony, Rolex"
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium"
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
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#1A1F2E] hover:bg-slate-200 dark:hover:bg-[#23283A] text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Model Name &amp; Spec
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. iPhone 15 Pro Max, Submariner"
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium"
                    />
                    {PRESET_MODELS[make] && (
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                        {PRESET_MODELS[make].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap transition-colors"
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
                    Storage / Variant / Condition Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={storageCapacity}
                    onChange={(e) => setStorageCapacity(e.target.value)}
                    placeholder="e.g. 256GB Titanium, 44mm Oystersteel, Mint with Box"
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-[#0B0D13] border border-slate-200 dark:border-slate-800 shrink-0">
                    <AssetImage
                      model={model}
                      make={make}
                      category={category}
                      alt={model}
                      aspectRatio="square"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Live Studio Imagery
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {make} {model} {storageCapacity ? `(${storageCapacity})` : ""}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Category default risk profile: {(dropRate * 100).toFixed(0)}% projected drop.
                    </p>
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm active:scale-98 flex items-center gap-2"
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
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Financials: Purchase vs Current Resale */}
                <div className="grid sm:grid-cols-2 gap-4">
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

                {/* Valuation Analysis Box */}
                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider block">
                      Value Retained
                    </span>
                    <span className="font-mono text-base font-bold text-purple-900 dark:text-purple-100">
                      {retentionPct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider block">
                      Cliff Drop Rate
                    </span>
                    <span className="font-mono text-base font-bold text-purple-900 dark:text-purple-100">
                      {(dropRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider block">
                      Projected Loss
                    </span>
                    <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
                      -${projectedDropDollars}
                    </span>
                  </div>
                </div>

                {/* Days to Cliff Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                            : "Monitoring / Safe"}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-[#1A1F2E] px-2 py-0.5 rounded">
                        {cliffDays} days
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
                  <div className="flex items-center gap-1.5 mt-2">
                    {[7, 14, 30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCliffDays(d)}
                        className={`flex-1 py-1 text-xs font-mono font-semibold rounded-lg border transition-all ${
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
                    Depreciation Catalyst / Expected Event
                  </label>
                  <input
                    type="text"
                    required
                    value={cliffReason}
                    onChange={(e) => setCliffReason(e.target.value)}
                    placeholder="e.g. Hardware Keynote Expected"
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-[#1A1F2E] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#0B0D13] text-slate-900 dark:text-slate-100 font-medium"
                  />
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                    {CLIFF_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCliffReason(r)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#1A1F2E] hover:bg-slate-200 dark:hover:bg-[#23283A] text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1F2E] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm active:scale-98 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {isSubmitting ? "Registering..." : "Add Asset to Workstation"}
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
