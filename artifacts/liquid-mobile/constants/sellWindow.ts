export type UrgencyLevel = "PLANNED" | "WINDOW" | "URGENT" | "CLIFF";

export interface SellWindow {
  windowStartDay: number;
  windowEndDay: number;
  cliffDay: number;
  urgency: UrgencyLevel;
  isWindowOpen: boolean;
  daysUntilWindow: number;
  daysUntilClose: number;
  recommendedSellDate: Date;
  sellByLabel: string;
  projectedLoss: number;
}

const LEAD_TIME = 2;
const IDEAL_BUFFER = 1;
const WINDOW_DURATION = 5;

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
  } else if (isPastWindow || (0 > windowEnd && cliffDay > 0)) {
    urgency = "URGENT";
  } else if (isWindowOpen) {
    urgency = "WINDOW";
  } else {
    urgency = "PLANNED";
  }

  const daysUntilWindow = Math.max(0, windowStart);
  const daysUntilClose = Math.max(0, windowEnd);

  const recommendedSellDate = new Date();
  recommendedSellDate.setDate(recommendedSellDate.getDate() + windowEnd);

  const sellByLabel =
    isPastWindow || isAtCliff
      ? "Window closed"
      : `Sell by ${recommendedSellDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

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
