import { ArrowLeft, BellRing, CalendarDays, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

const alerts = [
  { title: "iPhone 16 launch risk", detail: "12 days away", severity: "critical" },
  { title: "Sony camera refresh", detail: "38 days away", severity: "high" },
  { title: "MacBook Pro refresh", detail: "180 days away", severity: "low" },
];

export default function Alerts() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </Link>
        <section className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
          <p className="text-xs font-bold tracking-[0.3em] text-blue-600 uppercase mb-3">Alerts</p>
          <h1 className="text-4xl font-black leading-tight mb-4">Release-cycle signals and price floors.</h1>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BellRing className="w-4 h-4 text-red-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{alert.severity}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{alert.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{alert.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}