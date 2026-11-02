import { useState, useId } from "react";
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
  Image as ImageIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPortfolioQueryKey, customFetch } from "@workspace/api-client-react";
import { getAssetImage } from "@/lib/assetImages";
import { formatCurrencyWhole } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_MAKES = ["Apple", "Sony", "Rolex", "Nike", "Samsung", "Canon", "NVIDIA"];

const PRESET_MODELS: Record<string, string[]> = {
  Apple: ["iPhone 15 Pro Max", "iPhone 16 Pro", "MacBook Pro M3", "iPad Pro M4", "AirPods Max"],
  Sony: ["A7IV Body", "WH-1000XM5", "PlayStation 5 Pro", "FX3 Cinema Line"],
  Rolex: ["Submariner Date", "Daytona Chronograph", "GMT-Master II"],
  Nike: ["Air Jordan 1 High OG", "Dunk Low Retro", "Air Max 95"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy Z Fold 6", "Odyssey OLED G9"],
};

export default function AddItemModal({ open, onOpenChange }: AddItemModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [category, setCategory] = useState<"TECH" | "FASHION">("TECH");
  const [make, setMake] = useState("Apple");
  const [model, setModel] = useState("iPhone 15 Pro Max");
  const [storageCapacity, setStorageCapacity] = useState("256GB");
  const [purchasePrice, setPurchasePrice] = useState("1199");
  const [currentValue, setCurrentValue] = useState("890");
  const [cliffDays, setCliffDays] = useState(14);
  const [cliffReason, setCliffReason] = useState("Hardware Keynote Expected");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productPreview = getAssetImage(model, make, category);

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

    const purchase = Math.max(1, Math.round(parseFloat(purchasePrice || "0") * 100));
    const current = Math.max(1, Math.round(parseFloat(currentValue || "0") * 100));
    const projectedDrop = Math.round(current * 0.14); // 14% cliff drop estimation

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
          cliffReason: cliffReason.trim() || "Lifecycle depreciation",
          status: cliffDays <= 14 ? "ACTION_REQUIRED" : "HOLD",
        }),
      });

      await queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });

      toast({
        title: "Asset Added Successfully",
        description: `${make} ${model} is now actively tracked in your portfolio.`,
      });

      onOpenChange(false);
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
      <DialogContent className="max-w-[min(680px,96vw)] w-[96vw] max-h-[92vh] overflow-y-auto p-0 bg-white border border-slate-200 rounded-2xl shadow-2xl">
        <DialogTitle className="sr-only">Add Portfolio Asset</DialogTitle>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-poppins font-bold text-lg text-slate-900 leading-tight">
                Add Asset to Portfolio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register a device, horology piece, or physical item for real-time cliff monitoring.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Category Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Asset Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategory("TECH")}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                  category === "TECH"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Package className="w-4 h-4" />
                Consumer Electronics &amp; Hardware
              </button>
              <button
                type="button"
                onClick={() => setCategory("FASHION")}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                  category === "FASHION"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Luxury Watches, Sneakers &amp; Goods
              </button>
            </div>
          </div>

          {/* Brand & Model Input Row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Manufacturer / Brand
              </label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Apple, Sony, Rolex"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-medium"
              />
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_MAKES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setMake(p);
                      if (PRESET_MODELS[p]?.[0]) setModel(PRESET_MODELS[p][0]);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Model Name &amp; Spec
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max, Submariner"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-medium"
              />
              {PRESET_MODELS[make] && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  {PRESET_MODELS[make].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Studio Photo Preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 relative">
              <img
                src={productPreview}
                alt={model}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1468495244123-6c6c332eeede?auto=format&fit=crop&w=600&q=80";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Visual Identification Matched
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 mt-1 truncate">
                {make} {model} {storageCapacity ? `(${storageCapacity})` : ""}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Studio product photography will be applied across cards and liquidation views.
              </p>
            </div>
          </div>

          {/* Financials: Purchase vs Current Resale */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Original Purchase ($)
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
                  className="w-full h-10 pl-7 pr-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Resale Value ($)
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
                  className="w-full h-10 pl-7 pr-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Storage / Spec (Optional)
              </label>
              <input
                type="text"
                value={storageCapacity}
                onChange={(e) => setStorageCapacity(e.target.value)}
                placeholder="e.g. 256GB, 1TB, 44mm"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Depreciation Cliff & Horizon */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Days to Cliff Event
              </label>
              <div className="flex items-center gap-1.5">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCliffDays(d)}
                    className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
                      cliffDays === d
                        ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Market Catalyst / Cliff Reason
              </label>
              <input
                type="text"
                value={cliffReason}
                onChange={(e) => setCliffReason(e.target.value)}
                placeholder="e.g. Apple Keynote Expected"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7C3AED] focus:bg-white text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* CTA Row */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
