import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Rings() {
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
          <p className="text-xs font-bold tracking-[0.3em] text-blue-600 uppercase mb-3">Portfolio Rings</p>
          <h1 className="text-4xl font-black leading-tight mb-4">A visual read on portfolio health.</h1>
          <p className="text-gray-600 max-w-2xl">
            This view focuses on your health score, capital protected, and sell efficiency without the rest of the dashboard noise.
          </p>
        </section>
      </div>
    </div>
  );
}