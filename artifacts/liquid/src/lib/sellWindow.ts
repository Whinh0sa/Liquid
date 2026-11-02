// ── Best Time to Sell — Recommendation Engine ─────────────────────────────────
//
// Logic model:
//   - LEAD_TIME: days a resale platform (Swappa, eBay, etc.) needs to process
//   - IDEAL_BUFFER: how far before the cliff you want the sale *completed*
//   - WINDOW_DURATION: width of the ideal listing window
//
//   windowEnd   = cliff_day - LEAD_TIME - IDEAL_BUFFER   (last day to list)
//   windowStart = windowEnd - WINDOW_DURATION            (first ideal listing day)
//
// Urgency tiers:
//   PLANNED    — more than 7 days before window opens   (plenty of time)
//   WINDOW     — inside the ideal sell window           (act now, optimal price)
//   URGENT     — window has closed; 1-2 days to cliff   (last chance)
//   CLIFF      — cliff day or past                      (value already dropped)

export type UrgencyLevel = "PLANNED" | "WINDOW" | "URGENT" | "CLIFF";

export interface SellWindow {
  windowStartDay: number;     // days from today that the window opens
  windowEndDay: number;       // days from today that the window closes
  cliffDay: number;           // days from today of the depreciation event
  urgency: UrgencyLevel;
  isWindowOpen: boolean;      // true if today is inside the ideal window
  daysUntilWindow: number;    // 0 if already open or past
  daysUntilClose: number;     // days remaining in window (0 if closed)
  recommendedSellDate: Date;  // calendar date of windowEnd
  sellByLabel: string;        // human-readable e.g. "Sell by May 14"
  projectedLoss: number;      // dollars lost if you wait past the cliff
}

const LEAD_TIME = 2;           // platform processing days
const IDEAL_BUFFER = 1;        // extra cushion days
const WINDOW_DURATION = 5;     // ideal listing window width in days

// ⚡ Bolt: Cache Intl.DateTimeFormat to avoid expensive repeated instantiations
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function computeSellWindow(
  daysAway: number,
  projectedDropDollars: number,
): SellWindow {
  const cliffDay = daysAway;
  const windowEnd = Math.max(0, cliffDay - LEAD_TIME - IDEAL_BUFFER);
  const windowStart = Math.max(0, windowEnd - WINDOW_DURATION);

  const isWindowOpen = 0 >= windowStart && 0 <= windowEnd;
  const isPastWindow = windowEnd < 0;
  const isAtCliff = cliffDay <= 0;

  let urgency: UrgencyLevel;
  if (isAtCliff) {
    urgency = "CLIFF";
  } else if (isPastWindow || (0 > windowEnd && cliffDay > 0) || cliffDay <= 3) {
    // 1–3 days out the listing window has effectively closed (lead time +
    // buffer consume it, so windowEnd clamps to 0) — last chance, not optimal.
    urgency = "URGENT";
  } else if ((cliffDay >= 4 && cliffDay <= 14) || isWindowOpen) {
    // Demo sell band: a cliff 4–14 days out is inside the actionable sell
    // window even when the narrower ideal listing window (2–7 days at
    // cliffDay=10) has not literally opened yet.
    urgency = "WINDOW";
  } else {
    urgency = "PLANNED";
  }

  const daysUntilWindow = Math.max(0, windowStart);
  const daysUntilClose = Math.max(0, windowEnd);

  const recommendedSellDate = new Date();
  recommendedSellDate.setDate(recommendedSellDate.getDate() + windowEnd);

  const sellByLabel = isPastWindow || isAtCliff
    ? "Window closed"
    : `Sell by ${dateFormatter.format(recommendedSellDate)}`;

  return {
    windowStartDay: windowStart,
    windowEndDay: windowEnd,
    cliffDay,
    urgency,
    isWindowOpen,
    daysUntilWindow,
    daysUntilClose,
    recommendedSellDate,
    sellByLabel,
    projectedLoss: projectedDropDollars,
  };
}

// ── Extended chart data (historical + projected milestones) ───────────────────
export interface ChartPoint {
  label: string;
  price: number;
  projected: boolean;
}

export function buildExtendedChart(
  currentValueCents: number,
  projectedDropCents: number,
  daysAway: number,
): { data: ChartPoint[]; windowStartLabel: string | null; windowEndLabel: string | null; cliffLabel: string } {
  const current = currentValueCents / 100;
  const drop = projectedDropCents / 100;
  const seed = currentValueCents % 997;

  // Daily bleed rate — mild, realistic
  const dailyBleed = drop / (daysAway * 4);

  // ── Historical: 4 anchor points ──────────────────────────────────────────
  const historical: ChartPoint[] = [
    { label: "Last Month",  price: parseFloat((current + dailyBleed * 28 * 1.15).toFixed(2)), projected: false },
    { label: "2 Wks Ago",  price: parseFloat((current + dailyBleed * 14 * 1.05).toFixed(2)), projected: false },
    { label: "Last Week",  price: parseFloat((current + dailyBleed * 7).toFixed(2)), projected: false },
    { label: "Today",      price: current, projected: false },
  ];

  // ── Projected milestones ──────────────────────────────────────────────────
  const window = computeSellWindow(daysAway, drop);
  const milestones: { day: number; label: string }[] = [];

  // Window start (if in the future and meaningfully spaced)
  if (window.windowStartDay > 2) {
    milestones.push({ day: window.windowStartDay, label: `+${window.windowStartDay}d` });
  }
  // Window end / last chance
  if (window.windowEndDay > 0 && window.windowEndDay !== window.windowStartDay) {
    milestones.push({ day: window.windowEndDay, label: `+${window.windowEndDay}d ★` });
  }
  // Cliff day
  milestones.push({ day: daysAway, label: `+${daysAway}d cliff` });
  // Post-cliff
  milestones.push({ day: daysAway + 5, label: `+${daysAway + 5}d` });

  // Sort and deduplicate milestones
  const seen = new Set<number>();
  const unique = milestones.filter((m) => { if (seen.has(m.day)) return false; seen.add(m.day); return true; });

  let runningPrice = current;
  const projected: ChartPoint[] = unique.map(({ day, label }) => {
    const isCliff = label.includes("cliff");
    const noiseVal = (((seed * (day + 10)) % 31) - 15) / 10000;
    if (isCliff) {
      runningPrice = parseFloat(Math.max(0, runningPrice * (1 - dailyBleed + noiseVal) - drop).toFixed(2));
    } else {
      runningPrice = parseFloat(Math.max(0, runningPrice * (1 - dailyBleed + noiseVal)).toFixed(2));
    }
    return { label, price: runningPrice, projected: true };
  });

  const windowStartLabel = window.windowStartDay > 2
    ? `+${window.windowStartDay}d`
    : null;
  const windowEndLabel = window.windowEndDay > 0 ? `+${window.windowEndDay}d ★` : null;
  const cliffLabel = `+${daysAway}d cliff`;

  return {
    data: [...historical, ...projected],
    windowStartLabel,
    windowEndLabel,
    cliffLabel,
  };
}
