import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { customFetch, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Rocket, Package, Store, MessageSquare, DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCurrencyWhole } from "@/lib/currency";
import { type ExitListingResponse, type ListingPlatform, recommendationFor, extractKeywords, toMarketplaceDescription, shippingRecommendation, buildCopyText, createMockExitListing, MARKETPLACE_MAX_CHARS, SWAPPA_CHECKLIST, MARKETPLACE_MEETUP_CHECKLIST } from "@/lib/exitListing";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; assetId: string; assetModel: string; assetCategory?: string; conditionLabel?: string; }

export default function ExitListingModal({ open, onOpenChange, assetId, assetModel, assetCategory, conditionLabel }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ListingPlatform>("eBay");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExitListingResponse | null>(null);
  const [copied, setCopied] = useState<ListingPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => { setResult(null); setError(null); setActiveTab("eBay"); setLoading(false); setCopied(null); }, []);

  useEffect(() => { if (!open) { const t = setTimeout(reset, 300); return () => clearTimeout(t); } }, [open, reset]);

  const fetchListing = useCallback(async () => {
    if (!assetId) return;
    setLoading(true); setError(null);
    try {
      const res = await customFetch<ExitListingResponse>(`/api/ai/generate-listing/${assetId}`, { method: "POST" });
      setResult(res);
    } catch (err: any) {
      const msg = err?.message ?? "Could not generate listing";
      setError(msg);
      const mock = createMockExitListing({ assetModel, category: assetCategory, conditionLabel });
      setResult(mock);
      toast({ title: "Using mock listing", description: "API unavailable — showing offline draft." });
    } finally { setLoading(false); }
  }, [assetId, assetModel, assetCategory, conditionLabel, toast]);

  useEffect(() => { if (open && assetId && !result && !loading) { void fetchListing(); } }, [open, assetId, result, loading, fetchListing]);

  const handleCopy = useCallback(async (platform: ListingPlatform) => {
    if (!result) return;
    const text = buildCopyText(platform, result.listing, assetModel, conditionLabel);
    try { await navigator.clipboard.writeText(text); setCopied(platform); toast({ title: `${platform} listing copied` }); setTimeout(() => setCopied(null), 1800); } catch { toast({ title: "Copy failed", description: "Could not copy to clipboard" }); }
  }, [result, assetModel, conditionLabel, toast]);

  const rec = useMemo(() => result ? recommendationFor(result.listing, activeTab) : undefined, [result, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(860px,94vw)] w-[94vw] max-h-[88vh] overflow-hidden p-0 bg-[#F8F9FA] border-gray-200 flex flex-col sm:rounded-3xl">
        <DialogTitle className="sr-only">Exit Listing — {assetModel}</DialogTitle>
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-purple-600 text-white grid place-items-center"><Rocket className="w-4 h-4" /></div><div><p className="text-xs font-black tracking-[0.2em] uppercase text-purple-600">EXIT GENERATOR</p><p className="text-sm font-bold text-gray-900 truncate max-w-[260px] sm:max-w-none">{assetModel}</p></div></div>
          {result && <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">{result.source}</span>}
        </div>
        <div className="flex items-center gap-1.5 px-5 sm:px-6 py-3 bg-white border-b border-gray-100">
          {(["eBay", "Swappa", "Marketplace"] as ListingPlatform[]).map((p) => (
            <button key={p} type="button" onClick={() => setActiveTab(p)} className={["h-8 px-3 rounded-full text-xs font-bold transition-colors inline-flex items-center gap-1.5", activeTab===p ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"].join(" ")}>
              {p==="Swappa" ? <Package className="w-3.5 h-3.5" /> : p==="eBay" ? <Store className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}{p}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">{loading && <span className="animate-pulse">Generating…</span>}</div>
        </div>
        <div className="flex-1 overflow-auto p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</motion.div>
            )}
            {error && !result && (
              <motion.div key="error" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="rounded-xl bg-red-50 border border-red-100 p-4 flex gap-3"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-red-700">Could not generate listing</p><p className="text-xs text-red-600 mt-1">{error}</p><button onClick={fetchListing} className="mt-2 h-8 px-3 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700">Retry</button></div></motion.div>
            )}
            {result && (
              <motion.div key={activeTab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">{activeTab} Listing</p><h3 className="font-poppins font-bold text-base text-gray-900 leading-tight mt-1">{result.listing.title}</h3></div><button onClick={() => { void handleCopy(activeTab); }} className="h-8 w-8 rounded-full bg-gray-900 text-white grid place-items-center hover:bg-black shrink-0">{copied===activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button></div>
                  {rec && <div className="mt-3 flex flex-wrap gap-1.5"><span className="text-[11px] font-mono px-2 py-1 rounded-full bg-gray-900 text-white inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />List {formatCurrencyWhole(rec.suggestedPrice)}</span><span className="text-[11px] font-mono px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">You net {formatCurrency(rec.netPayout)}</span><span className="text-[10px] text-gray-400">{activeTab==="eBay" ? "87% net" : activeTab==="Swappa" ? "90% net" : "98% net"}</span></div>}
                </div>
                {activeTab==="eBay" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-semibold text-gray-700 mb-2">Description</p><p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{result.listing.description}</p></div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-semibold text-gray-700 mb-2">Key Features</p><ul className="space-y-1.5">{result.listing.bulletPoints.map((b,i)=><li key={i} className="text-sm text-gray-600 flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{b}</li>)}</ul></div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800 mb-1">Search Keywords (eBay SEO)</p><p className="text-xs font-mono text-amber-900 leading-relaxed">{extractKeywords(result.listing.title, assetModel.split(" ")[0]).join(" ")}</p></div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 flex gap-2"><Clock className="w-4 h-4 text-gray-400 shrink-0" /><p className="text-xs text-gray-500">{shippingRecommendation(rec?.suggestedPrice ?? 0)}</p></div>
                    {conditionLabel && <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-xs text-purple-800">Condition grade <strong>{conditionLabel}</strong> disclosed honestly — see photos. No surprises, higher buyer trust.</div>}
                  </div>
                )}
                {activeTab==="Swappa" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-semibold text-gray-700 mb-2">Spec Sheet</p><ul className="space-y-1.5">{result.listing.bulletPoints.map((b,i)=><li key={i} className="text-sm text-gray-600 flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{b}</li>)}</ul></div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-semibold text-gray-700 mb-2">Before You List Checklist</p><ul className="space-y-1.5">{SWAPPA_CHECKLIST.map((c,i)=><li key={i} className="text-sm text-gray-600 flex gap-2"><span className="w-4 h-4 rounded border border-gray-200 grid place-items-center text-[10px]">☐</span>{c}</li>)}</ul></div>
                  </div>
                )}
                {activeTab==="Marketplace" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs font-semibold text-gray-700 mb-1">Conversational Description ({toMarketplaceDescription(result.listing, assetModel).length}/{MARKETPLACE_MAX_CHARS} chars)</p><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{toMarketplaceDescription(result.listing, assetModel)}</p></div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800 mb-2">Safe Meetup Checklist</p><ul className="space-y-1.5">{MARKETPLACE_MEETUP_CHECKLIST.map((c,i)=><li key={i} className="text-sm text-amber-900 flex gap-2"><span className="w-4 h-4 rounded border border-amber-200 grid place-items-center text-[10px]">☐</span>{c}</li>)}</ul></div>
                  </div>
                )}
                <div className="flex gap-2"><button onClick={() => { void handleCopy(activeTab); }} className="flex-1 h-11 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-black inline-flex items-center justify-center gap-2">{copied===activeTab ? <><Check className="w-4 h-4" />Copied {activeTab}</> : <><Copy className="w-4 h-4" />Copy {activeTab} Listing</>}</button><button onClick={() => onOpenChange(false)} className="h-11 px-4 rounded-xl bg-white border border-gray-200 text-sm font-semibold">Close</button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
