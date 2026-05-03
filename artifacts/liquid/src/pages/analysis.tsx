import { ArrowLeft, BarChart3, Clock, Shield, TrendingDown, Zap } from "lucide-react";
import { Link } from "wouter";

const cards = [
  { title: "Sell Window Map", value: "14 assets", sub: "tracked in window" },
  { title: "Depreciation Risk", value: "$4,820", sub: "at risk this week" },
  { title: "Optimal Exit Speed", value: "1.8 days", sub: "median time to sell" },
  { title: "Urgent Now", value: "3 items", sub: "need action today" },
];

export default function Analysis() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </Link>
        <div className="grid lg:grid-cols-[1.3fr_0.9fr] gap-6">
          <section className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
            <p className="text-xs font-bold tracking-[0.3em] text-blue-600 uppercase mb-3">Analysis</p>
            <h1 className="text-4xl font-black leading-tight mb-4">Your liquidation terminal, expanded.</h1>
            <p className="text-gray-600 max-w-2xl">
              See what to sell first, what’s drifting toward the cliff, and where the best resale window opens.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {cards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{card.title}</p>
                  <p className="text-2xl font-black text-gray-900 mb-1">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.sub}</p>
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-4">
            {[
              { icon: TrendingDown, label: "Price drift", value: "-12.4%" },
              { icon: Shield, label: "Protected value", value: "$18.2k" },
              { icon: Zap, label: "Fastest exits", value: "Swappa" },
              { icon: Clock, label: "Window timing", value: "7 days" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                  <p className="text-xl font-black text-gray-900">{item.value}</p>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}