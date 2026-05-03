import { Link } from "wouter";
import { ArrowRight, BellRing, Sparkles } from "lucide-react";

const TICKERS = [
  { label: "IPHONE 15 PRO", price: "$842.50", change: "+2.1%", up: true },
  { label: "MACBOOK AIR", price: "$1,018.00", change: "+0.8%", up: true },
  { label: "SONY A7IV", price: "$2,104.00", change: "+0.3%", up: true },
  { label: "AIRPODS MAX", price: "$412.00", change: "-1.1%", up: false },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-blue-600">Liquid</p>
            <p className="text-sm text-gray-500">Consumer finance for physical assets</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analysis" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Analysis</Link>
            <Link href="/rings" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Rings</Link>
            <Link href="/alerts" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Alerts</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
          <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-5">
              <Sparkles className="w-4 h-4" />
              Smart resale terminal
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight">
              Sell electronics before the market moves.
            </h1>
            <p className="mt-5 text-lg text-gray-600 max-w-xl">
              Liquid tracks depreciation cliffs, resale windows, and condition-adjusted value so you can exit at the right time.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/analysis" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25">
                View analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/alerts" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gray-100 text-gray-700 font-semibold">
                <BellRing className="w-4 h-4" />
                Open alerts
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio value</p>
                <p className="text-2xl font-black text-gray-900 mt-1">$24.8k</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sell window</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">8 open</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk shield</p>
                <p className="text-2xl font-black text-blue-600 mt-1">$4.2k</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-[#1F2937] text-white p-8 shadow-xl">
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-blue-300 mb-4">Live tape</p>
            <div className="space-y-4">
              {TICKERS.map((ticker) => (
                <div key={ticker.label} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{ticker.label}</p>
                    <p className="text-xs text-white/55">{ticker.price}</p>
                  </div>
                  <p className={`text-sm font-bold ${ticker.up ? "text-emerald-300" : "text-red-300"}`}>
                    {ticker.change}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}