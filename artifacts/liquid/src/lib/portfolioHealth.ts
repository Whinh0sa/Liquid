import { computeSellWindow } from "./sellWindow";

export interface PortfolioHealth {
  grade: string;
  score: number;
  color: string;
  label: string;
}

export function computePortfolioHealth(
  portfolio: Array<{ depreciationCliff: { daysAway: number; projectedDrop: number } }>,
): PortfolioHealth {
  if (portfolio.length === 0) return { grade: "A", score: 100, color: "#10B981", label: "Excellent" };
  let score = 100;
  portfolio.forEach((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    if (sw.urgency === "CLIFF") score -= 28;
    else if (sw.urgency === "URGENT") score -= 18;
    else if (sw.urgency === "WINDOW") score -= 5;
    else score += 3;
  });
  score = Math.min(100, Math.max(0, score));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
  const color = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";
  const label = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Fair" : score >= 45 ? "At risk" : "Critical";
  return { grade, score, color, label };
}
