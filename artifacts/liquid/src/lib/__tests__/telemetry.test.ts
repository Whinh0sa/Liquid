import { describe, it, expect } from "vitest";
import { recordMetric, getTelemetryQueue } from "../telemetry";

describe("Client Telemetry & RUM", () => {
  it("records web vitals with threshold rating", () => {
    recordMetric({ name: "LCP", value: 1800 });
    const queue = getTelemetryQueue();
    const lcp = queue.find((m) => m.name === "LCP");
    expect(lcp).toBeDefined();
    expect(lcp?.rating).toBe("good");
  });

  it("rates poor LCP appropriately", () => {
    recordMetric({ name: "LCP", value: 5000 });
    const queue = getTelemetryQueue();
    const poorLcp = queue.slice().reverse().find((m) => m.name === "LCP");
    expect(poorLcp?.rating).toBe("poor");
  });

  it("captures error events", () => {
    recordMetric({
      name: "ERROR",
      value: 1,
      details: { message: "Test unhandled promise" },
    });
    const queue = getTelemetryQueue();
    const err = queue.find((m) => m.name === "ERROR");
    expect(err).toBeDefined();
    expect(err?.details?.message).toBe("Test unhandled promise");
  });
});
