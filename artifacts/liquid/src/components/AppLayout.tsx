// ─── AppLayout — Professional Application Shell ──────────────────────────────────
//
// Wraps every authenticated workspace view with:
//   • Clean, elevated application navigation bar
//   • Streamlined brand mark & workspace indicators
//   • Notification triggers & Clerk account management
//   • Consistent max-width container with Alabaster (#F8F9FA) canvas

import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import NotificationCenter from "@/components/NotificationCenter";
import AddItemModal from "@/components/AddItemModal";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Nav links ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home",      href: "/landing" },
  { label: "Portfolio", href: "/" },
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
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F8F9FA] text-slate-900 font-sans antialiased selection:bg-purple-100 selection:text-purple-900 dark:bg-[#0B0D13] dark:text-slate-100 dark:selection:bg-purple-950 dark:selection:text-purple-200">
      {/* ── Sticky App Nav ───────────────────────────────────────────────── */}
      <nav className="bg-white/90 dark:bg-[#0B0D13]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo & Workspace Selector */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer select-none">
              <span className="font-poppins font-black text-xl tracking-tight text-slate-950 dark:text-white">
                Liquid
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 uppercase tracking-wider dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60">
                2.0
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ label, href }) => {
                const isActive =
                  href === "/"
                    ? location === "/" || location === "/dashboard" || location === "/app"
                    : location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "text-slate-950 bg-slate-100 shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] dark:text-white dark:bg-[#1A1F2E]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#131722]",
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
            <button
              type="button"
              aria-label="Add a new physical asset"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <ThemeToggle />

            <NotificationCenter />

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
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Guest Mode</span>
              </div>
              <SignInButton mode="modal">
                <button
                  type="button"
                  aria-label="Sign into your Liquid account"
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Mobile Hamburger */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation-menu"
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
              id="mobile-navigation-menu"
              role="navigation"
              aria-label="Mobile navigation"
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131722]"
            >
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(({ label, href }) => {
                  const isActive =
                    href === "/"
                      ? location === "/" || location === "/dashboard" || location === "/app"
                      : location === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "block px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "text-slate-950 bg-slate-100 dark:text-white dark:bg-[#1A1F2E]"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1A1F2E]",
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

      {/* Add Item Modal */}
      <AddItemModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
