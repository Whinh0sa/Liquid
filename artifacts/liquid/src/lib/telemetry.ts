// ─── Liquid — Real User Monitoring (RUM) & Client Telemetry ─────────────────
//
// Lightweight, non-intrusive performance and error telemetry:
//   • Web Vitals (CLS, LCP, INP, TTFB) via native PerformanceObserver
//   • Global unhandled exception / rejection capturing
//   • Safe sampled reporting stub (0 external SDK dependencies)

export interface MetricEvent {
  name: "CLS" | "LCP" | "INP" | "TTFB" | "FID" | "ERROR";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  details?: Record<string, unknown>;
  timestamp: number;
}

const queue: MetricEvent[] = [];
let isInitialized = false;

function rateMetric(name: string, value: number): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    default:
      return "good";
  }
}

export function recordMetric(event: Omit<MetricEvent, "timestamp" | "rating"> & { rating?: "good" | "needs-improvement" | "poor" }) {
  const metric: MetricEvent = {
    ...event,
    rating: event.rating ?? rateMetric(event.name, event.value),
    timestamp: Date.now(),
  };

  queue.push(metric);

  // In development, log performance milestones to console
  if (import.meta.env.DEV && metric.name !== "CLS") {
    // eslint-disable-next-line no-console
    console.debug(`[RUM] ${metric.name}:`, Math.round(metric.value), `(${metric.rating})`);
  }
}

export function initTelemetry() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // 1. Unhandled Errors
  window.addEventListener("error", (event) => {
    recordMetric({
      name: "ERROR",
      value: 1,
      rating: "poor",
      details: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordMetric({
      name: "ERROR",
      value: 1,
      rating: "poor",
      details: {
        reason: String(event.reason),
      },
    });
  });

  // 2. Native PerformanceObserver for Core Web Vitals
  try {
    if ("PerformanceObserver" in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          recordMetric({ name: "LCP", value: lastEntry.startTime });
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        recordMetric({ name: "CLS", value: clsValue });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });

      // Navigation Timing / TTFB
      const navObserver = new PerformanceObserver((entryList) => {
        const nav = entryList.getEntries()[0] as PerformanceNavigationTiming | undefined;
        if (nav) {
          recordMetric({ name: "TTFB", value: nav.responseStart });
        }
      });
      navObserver.observe({ type: "navigation", buffered: true });
    }
  } catch {
    // Observer initialization failed gracefully
  }
}

export function getTelemetryQueue(): readonly MetricEvent[] {
  return queue;
}
