// ─── Landing Page ─────────────────────────────────────────────────────────────
//
// Public-facing marketing surface at the / route.
// Distinct from AppLayout — has its own lightweight NavBar with Login/Sign Up.
// Uses Poppins for headlines, Inter for body copy.
// CTA colour: Electric Purple #9126EF (used sparingly — CTAs only).

import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import {
  TrendingDown,
  Bell,
  Zap,
  BarChart2,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";

// ─── Fade-up animation variant (reused across sections) ──────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12 } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    icon: TrendingDown,
    iconColor: "#9126EF",
    iconBg: "rgba(145,38,239,0.08)",
    title: "Depreciation Tracking",
    body: "Know exactly what every item in your inventory is worth today — not what you paid for it.",
  },
  {
    icon: Bell,
    iconColor: "#059669",
    iconBg: "rgba(5,150,105,0.08)",
    title: "Optimal Sell Windows",
    body: "Algorithmic alerts fire before the price drops. Sell at the peak, not after it.",
  },
  {
    icon: Zap,
    iconColor: "#F59E0B",
    iconBg: "rgba(245,158,11,0.08)",
    title: "Frictionless Liquidation",
    body: "Condition-aware pricing, pre-filled listings, one-click routes to the right resale platform.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Ingest",
    body: "Add any high-value physical asset — electronics, watches, sneakers, luxury bags.",
  },
  {
    step: "02",
    title: "Monitor",
    body: "Liquid tracks live market prices and upcoming release events that affect your value.",
  },
  {
    step: "03",
    title: "Alert",
    body: "Get notified the moment your optimal sell window opens — before the market moves.",
  },
  {
    step: "04",
    title: "Liquidate",
    body: "One click to list. Condition-adjusted price. Right platform. Maximum recovery.",
  },
];

const ASSET_CATEGORIES = [
  { label: "Electronics",    color: "#9126EF" },
  { label: "Luxury Watches", color: "#059669" },
  { label: "Sneakers",       color: "#F59E0B" },
  { label: "Designer Bags",  color: "#3B82F6" },
  { label: "Collectibles",   color: "#EF4444" },
];

const PROOF_STATS = [
  { value: "£240",   label: "avg saved per iPhone sale" },
  { value: "14 days", label: "average optimal sell window" },
  { value: "3×",     label: "more recovery vs holding" },
];

// ─── Landing NavBar ───────────────────────────────────────────────────────────
function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/">
            <span className="font-poppins font-bold text-xl cursor-pointer select-none"
              style={{ color: "#9126EF" }}>
              Liquid
            </span>
          </Link>

          {/* Desktop CTA row */}
          <div className="hidden md:flex items-center gap-3">
            <SignedIn>
              <Link href="/dashboard">
                <button
                  className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "#9126EF" }}
                >
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                  Log in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button
                  className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "#9126EF" }}
                >
                  Start tracking free
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-full max-w-xs bg-white p-6 shadow-2xl flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-poppins font-bold text-xl" style={{ color: "#9126EF" }}>Liquid</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/dashboard">
                  <button className="w-full text-left px-3 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                    Log in
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button
                    className="w-full px-3 py-3 text-sm font-bold text-white rounded-xl"
                    style={{ backgroundColor: "#9126EF" }}
                  >
                    Start tracking free
                  </button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-white text-gray-900 flex flex-col font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center text-center px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(145,38,239,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Animated Background Graph */}
        <motion.svg
          className="absolute inset-0 w-full h-full opacity-[0.03]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 0 50 Q 25 30, 50 50 T 100 50"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            animate={{ d: ["M 0 50 Q 25 30, 50 50 T 100 50", "M 0 50 Q 25 70, 50 50 T 100 50", "M 0 50 Q 25 30, 50 50 T 100 50"] }}
            transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
          />
        </motion.svg>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6"
        >
          {/* Pill badge */}
          <motion.div variants={fadeUp}>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border"
              style={{ color: "#9126EF", borderColor: "rgba(145,38,239,0.25)", backgroundColor: "rgba(145,38,239,0.06)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Physical asset intelligence — now live
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="font-poppins font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight text-gray-900"
          >
            Stop letting your{" "}
            <span style={{ color: "#9126EF" }}>assets rot</span>{" "}
            in a drawer.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-gray-500 max-w-xl leading-relaxed"
          >
            Liquid tracks the real-time resale value of everything worth tracking —
            and tells you <strong className="text-gray-700 font-semibold">exactly when to sell</strong> before
            the price falls off a cliff.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <SignedIn>
              <Link href="/dashboard">
                <button
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                  style={{ backgroundColor: "#9126EF", boxShadow: "0 8px 30px rgba(145,38,239,0.30)" }}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                  style={{ backgroundColor: "#9126EF", boxShadow: "0 8px 30px rgba(145,38,239,0.30)" }}
                >
                  Start Tracking Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="flex items-center gap-1.5 px-6 py-3.5 rounded-2xl text-base font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Log In
                  <ChevronRight className="w-4 h-4" />
                </button>
              </SignInButton>
            </SignedOut>
          </motion.div>

          {/* Social proof stats row */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-6 pt-2"
          >
            {PROOF_STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="font-poppins font-bold text-2xl text-gray-900">{value}</span>
                <span className="text-xs text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Asset categories ticker ───────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="flex flex-wrap justify-center gap-3">
          {ASSET_CATEGORIES.map(({ label }, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border bg-gray-50 text-gray-600 border-gray-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Value props ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-6 py-24 sm:py-32">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {VALUE_PROPS.map(({ icon: Icon, iconColor, iconBg, title, body }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col gap-5 hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: iconBg }}
              >
                <Icon className="w-6 h-6" style={{ color: iconColor }} />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-lg text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto w-full px-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="flex flex-col gap-16"
          >
            {/* Section header */}
            <motion.div variants={fadeUp} className="text-center max-w-xl mx-auto">
              <span className="text-sm font-semibold uppercase tracking-widest text-amber-600">The loop</span>
              <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-gray-900 mt-4">
                How Liquid works
              </h2>
              <p className="text-gray-600 mt-4 text-lg">
                Four steps. Zero guesswork. Maximum recovery on every asset you own.
              </p>
            </motion.div>

            {/* Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {HOW_IT_WORKS.map(({ step, title, body }, idx) => (
                <motion.div
                  key={step}
                  variants={fadeUp}
                  className="relative bg-white rounded-3xl p-8 border border-gray-100 flex flex-col gap-4 shadow-sm"
                >
                  <span
                    className="font-poppins font-bold text-4xl"
                    style={{ color: "rgba(245,158,11,0.2)" }}
                  >
                    {step}
                  </span>
                  <div>
                    <h3 className="font-poppins font-semibold text-lg text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── What Liquid tracks ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-6 py-24 sm:py-32">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left: copy */}
          <motion.div variants={fadeUp} className="flex flex-col gap-8">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-amber-600">Track everything worth tracking</span>
              <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-gray-900 mt-4 leading-tight">
                Not everything you own.<br />
                <span className="text-amber-500">Everything with a market.</span>
              </h2>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              Liquid only makes sense for assets with real secondary market pricing.
              If there's an eBay sold listing, a StockX chart, or a Chrono24 reference price —
              Liquid can track it, value it, and tell you when to move.
            </p>
            <ul className="flex flex-col gap-5">
              {[
                { label: "Consumer electronics", sub: "iPhones, MacBooks, GPUs" },
                { label: "Luxury watches",        sub: "Rolex, AP, Patek — model-specific curves" },
                { label: "Sneakers",              sub: "Hype-cycle decay modelling" },
                { label: "Designer bags",         sub: "Hermès, LV, Chanel — appreciation aware" },
                { label: "Collectibles",          sub: "Cards, comics, limited editions" },
              ].map(({ label, sub }) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-amber-50">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: mock portfolio card */}
          <motion.div variants={fadeUp} className="relative">
            <div
              className="rounded-3xl border border-gray-100 bg-white p-6 flex flex-col gap-5"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.07)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio Value</p>
                  <p className="font-poppins font-bold text-3xl text-gray-900 mt-0.5">£24,840</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}>
                  <BarChart2 className="w-3.5 h-3.5" />
                  +£1,240 protected
                </div>
              </div>
              {/* Asset rows */}
              {[
                { name: "iPhone 15 Pro Max", tag: "⚡ Sell now", tagColor: "#059669", tagBg: "rgba(5,150,105,0.1)", value: "£840", pct: "-12%", pctColor: "#EF4444" },
                { name: "Rolex Submariner",  tag: "Plan ahead",  tagColor: "#3B82F6", tagBg: "rgba(59,130,246,0.1)", value: "£9,200", pct: "+4%", pctColor: "#059669" },
                { name: "Air Jordan 1 OG",   tag: "Last chance", tagColor: "#F59E0B", tagBg: "rgba(245,158,11,0.1)",  value: "£620", pct: "-8%", pctColor: "#EF4444" },
              ].map(({ name, tag, tagColor, tagBg, value, pct, pctColor }) => (
                <div key={name} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ color: tagColor, backgroundColor: tagBg }}>{tag}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-xs font-semibold" style={{ color: pctColor }}>{pct}</p>
                  </div>
                </div>
              ))}
              {/* CTA inside card */}
              <Link href="/dashboard">
                <button
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#9126EF" }}
                >
                  Track your portfolio →
                </button>
              </Link>
            </div>

            {/* Floating alert badge */}
            <div
              className="absolute -top-4 -right-4 bg-white border border-amber-200 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2.5"
              style={{ boxShadow: "0 4px 20px rgba(245,158,11,0.15)" }}
            >
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900">Sell window open</p>
                <p className="text-[10px] text-gray-400">iPhone 15 Pro · 14 days left</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto w-full">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="font-poppins font-bold text-3xl sm:text-4xl text-gray-900 text-center mb-12"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="flex flex-col gap-6"
          >
            {[
              {
                q: "How does Liquid track asset depreciation?",
                a: "Liquid integrates with leading secondary market APIs (like eBay, StockX, and Chrono24) to monitor real-time sold listings and price trends for your specific assets."
              },
              {
                q: "Is Liquid free to use?",
                a: "Yes, Liquid is free forever for tracking all supported consumer electronics. Premium features for luxury goods and advanced analytics are available on our Pro plan."
              },
              {
                q: "Can I get automated alerts?",
                a: "Absolutely. You can set alert thresholds based on market price drops, and Liquid will push notifications via our mobile app, desktop, or email."
              }
            ].map(({ q, a }) => (
              <motion.div
                key={q}
                variants={fadeUp}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
              >
                <h3 className="font-poppins font-semibold text-gray-900 mb-2">{q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6"
        >
          <motion.h2
            variants={fadeUp}
            className="font-poppins font-bold text-3xl sm:text-4xl text-gray-900 leading-tight"
          >
            Your assets are depreciating<br />
            <span style={{ color: "#9126EF" }}>right now.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-base">
            Every day you don't track them is money you can't recover.
            Liquid is free to start — no credit card required.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/dashboard">
              <button
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95"
                style={{ backgroundColor: "#9126EF", boxShadow: "0 8px 30px rgba(145,38,239,0.28)" }}
              >
                Start Tracking Your Net Worth
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="text-xs text-gray-400">
            Free forever on electronics. No signup friction.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-poppins font-bold text-lg" style={{ color: "#9126EF" }}>Liquid</span>
          <p className="text-xs text-gray-400">
            Market estimates only. Liquid does not provide financial advice. Final valuations subject to platform verification.
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard"><span className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Dashboard</span></Link>
            <Link href="/alerts"><span className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Alerts</span></Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
