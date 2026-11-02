import { Link } from "wouter";
import { Compass, LayoutDashboard, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm text-center">
        {/* Terminal Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          404 // ROUTE_NOT_FOUND
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7 text-[#7C3AED]" />
        </div>

        <h1 className="font-poppins font-bold text-2xl text-slate-900 tracking-tight mb-2">
          Workstation Route Not Found
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          The requested liquidation terminal route or asset parameter is unavailable or has been relocated.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm active:scale-98">
              <LayoutDashboard className="w-4 h-4" />
              Return to Dashboard
            </button>
          </Link>
          <Link href="/" className="sm:w-auto">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Public Landing
            </button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="font-poppins font-bold text-xs uppercase tracking-widest text-slate-400">
            Liquid Pro Workstation
          </span>
        </div>
      </div>
    </div>
  );
}
