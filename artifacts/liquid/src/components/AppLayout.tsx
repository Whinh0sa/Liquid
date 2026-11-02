// ─── AppLayout — Professional Application Shell ──────────────────────────────────
//
// Wraps every authenticated workspace view with:
//   • Clean, elevated application navigation bar
//   • Streamlined brand mark & workspace indicators
//   • Notification triggers & Clerk account management
//   • Consistent max-width container with Alabaster (#F8F9FA) canvas

import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, X, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";

// ─── Nav links ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Portfolio", href: "/dashboard" },
  { label: "Analysis",  href: "/analysis" },
  { label: "Rings",     href: "/rings" },
  { label: "Alerts",    href: "/alerts" },
] as const;

interface AppLayoutProps {
  children: ReactNode;
  /** Optional secondary utility bar */
  subNav?: ReactNode;
  fullWidth?: boolean;
}

export default function AppLayout({
  children,
  subNav,
  fullWidth = false,
}: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F8F9FA] text-slate-900 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* ── Sticky App Nav ───────────────────────────────────────────────── */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo & Workspace Selector */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer select-none">
              <span className="font-poppins font-black text-xl tracking-tight text-slate-950">
                Liquid
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 uppercase tracking-wider">
                Pro
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ label, href }) => {
                const isActive =
                  href === "/dashboard"
                    ? location === "/dashboard" || location === "/app"
                    : location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "text-slate-950 bg-slate-100 shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right-Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/alerts"
              aria-label="View price alerts"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
            </Link>

            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded-xl ring-1 ring-slate-200",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Mobile Hamburger */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu Dropdown ─────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-slate-100 bg-white"
            >
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(({ label, href }) => {
                  const isActive =
                    href === "/dashboard"
                      ? location === "/dashboard" || location === "/app"
                      : location === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "block px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "text-slate-950 bg-slate-100"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {subNav}
      </nav>

      {/* ── Main Application Surface ─────────────────────────────────────── */}
      <main
        className={[
          "flex-1 py-6 sm:py-8 flex flex-col gap-6",
          fullWidth ? "px-4 sm:px-6" : "max-w-7xl mx-auto w-full px-4 sm:px-6",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}
