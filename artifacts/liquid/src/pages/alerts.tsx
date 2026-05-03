import { Link } from "wouter";
import { ArrowLeft, BellRing, CalendarDays, TriangleAlert, AlertTriangle, Clock, Zap } from "lucide-react";

const alerts = [
  { title: "iPhone 16 launch risk", detail: "12 days away", severity: "critical", impact: "-20%", category: "Hardware" },
  { title: "Sony camera refresh", detail: "38 days away", severity: "high", impact: "-15%", category: "Optics" },
  { title: "MacBook Pro refresh", detail: "180 days away", severity: "low", impact: "-8%", category: "Computing" },
];

const rules = [
  { label: "Floor alerts", value: "3 active", tone: "amber" },
  { label: "Sell windows", value: "2 open", tone: "emerald" },
  { label: "Critical events", value: "1 near-term", tone: "red" },
];

function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <span className="font-poppins font-bold text-xl text-blue-600">Liquid</span>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Portfolio</Link>
            <Link href="/analysis" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Markets</Link>
            <Link href="/rings" className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Assets</Link>
            <Link href="/alerts" className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50">Alerts</Link>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">UH</span>
        </div>
      </div>
    </nav>
  );
}

export default function Alerts() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-blue-600 mb-1">Alerts</p>
          <h1 className="text-3xl font-black text-gray-900">Release signals and price floors</h1>
          <p className="text-gray-500 mt-1">Track launch events, risk thresholds, and liquidation cues in one focused view.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div key={rule.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                {rule.tone === "emerald" ? <Zap className="w-5 h-5 text-emerald-500" /> : rule.tone === "amber" ? <BellRing className="w-5 h-5 text-amber-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{rule.label}</p>
                <p className="text-xl font-black text-gray-900">{rule.value}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Market events
            </h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500">Severity ranked</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4 p-5">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <BellRing className="w-4 h-4 text-red-500" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${alert.severity === "critical" ? "bg-red-50 text-red-700" : alert.severity === "high" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                    {alert.severity}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{alert.detail}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>{alert.category}</span>
                  <span>{alert.impact} projected</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-blue-500" />
              Alert logic
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• Price floors trigger when current value hits your threshold.</p>
              <p>• Sell-window alerts surface when an asset enters the optimal resale window.</p>
              <p>• Critical market events are ranked by expected depreciation impact.</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <TriangleAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Why this page exists</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Alerts stay separate from the dashboard so the home view stays polished and calm while still surfacing urgency when needed.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
