// ─── AppLayout — Shared Shell ─────────────────────────────────────────────────
//
// Wraps every page with:
//   • Sticky, responsive NavBar (with mobile hamburger)
//   • Consistent max-width + page padding
//   • Soft Alabaster (#F8F9FA) page background
//
// Usage:
//   <AppLayout activePath="/analysis">
//     <YourPageContent />
//   </AppLayout>
//
// activePath must match one of the NAV_LINKS href values exactly.

import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";

// ─── Nav links (single source of truth) ──────────────────────────────────────
const NAV_LINKS = [
  { label: "Portfolio", href: "/dashboard" },
  { label: "Analysis",  href: "/analysis" },
  { label: "Rings",     href: "/rings" },
  { label: "Alerts",    href: "/alerts" },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────
interface AppLayoutProps {
  /** Content rendered inside the page's <main> */
  children: ReactNode;
  /**
   * Optional extra content slotted directly below the nav bar (before <main>).
   * Used by Home to inject the ticker tape without breaking the shared layout.
   */
  subNav?: ReactNode;
  /**
   * When true the children are rendered at full-width (no max-w-6xl container).
   * Defaults to false.
   */
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AppLayout({
  children,
  subNav,
  fullWidth = false,
}: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F8F9FA]">

      {/* ── Sticky nav ───────────────────────────────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

          {/* Logo + desktop links */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/">
              <span className="font-poppins font-bold text-xl cursor-pointer select-none" style={{ color: "#9126EF" }}>
                Liquid
              </span>
            </Link>

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
                      "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                      isActive
                        ? "text-gray-900 bg-gray-100"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            >
              <Bell className="w-4 h-4" />
            </button>

            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                  }
                }} 
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-gray-100 bg-white"
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
                        "block px-3 py-2 rounded-xl text-sm font-semibold transition-colors",
                        isActive
                          ? "text-gray-900 bg-gray-100"
                          : "text-gray-600 hover:bg-gray-50",
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

        {/* ── Optional sub-nav slot (e.g. ticker tape on Home) ────────────── */}
        {subNav}
      </nav>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main
        className={[
          "flex-1 py-6 sm:py-10 flex flex-col gap-8 sm:gap-10",
          fullWidth
            ? "px-4 sm:px-6"
            : "max-w-7xl mx-auto w-full px-4 sm:px-6",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}
