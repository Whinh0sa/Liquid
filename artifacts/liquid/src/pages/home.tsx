import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPortfolio,
  getGetPortfolioQueryKey,
  useUpdateAssetStatus,
} from "@workspace/api-client-react";
import { AlertTriangle, TrendingDown, TrendingUp, Shield, BarChart2, Bell, BellRing, Clock, CheckCircle, ShieldCheck, X } from "lucide-react";
import AssetDrawer from "@/components/AssetDrawer";
import { computeSellWindow, type UrgencyLevel } from "@/lib/sellWindow";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function gradePortfolio(portfolio: PortfolioAsset[]): { grade: string; tone: string; label: string; sub: string } {
  const sellWindowCount = portfolio.filter((a) => computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100).urgency === "WINDOW").length;
  const urgentCount = portfolio.filter((a) => a.depreciationCliff.daysAway <= 14).length;
  const atRiskValue = portfolio.reduce((sum, a) => sum + (a.depreciationCliff.daysAway <= 14 ? a.depreciationCliff.projectedDrop / 100 : 0), 0);
  const totalValue = portfolio.reduce((sum, a) => sum + a.currentValue / 100, 0);
  const riskRatio = totalValue > 0 ? atRiskValue / totalValue : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - urgentCount * 8 - sellWindowCount * 4 - riskRatio * 100)));
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  const tone = grade === "A" || grade === "B" ? "#10B981" : grade === "C" ? "#F59E0B" : "#EF4444";
  const label = grade === "A" ? "Excellent" : grade === "B" ? "Healthy" : grade === "C" ? "Watchlist" : grade === "D" ? "At risk" : "Critical";
  const sub = urgentCount === 0 ? "No cliffs nearby" : `${urgentCount} assets need attention`;
  return { grade, tone, label, sub };
}

type StatusType = "HOLD" | "LIQUIDATE" | "IN_TRANSIT" | "ACTION_REQUIRED";

interface PortfolioAsset {
  id: string;
  model: string;
  category: string;
  currentValue: number;
  purchasePrice: number;
  depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
  status: string;
}
