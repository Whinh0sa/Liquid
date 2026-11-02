// ─── Rate Limiter Middleware ──────────────────────────────────────────────────
//
// In-memory sliding-window rate limiter supporting tiered thresholds:
//   - /api/ai: 10 requests per minute
//   - /api/portfolio: 60 requests per minute
//   - General API: 120 requests per minute
//
// Complies with IETF RateLimit header specifications.

import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;
  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (interval.unref) interval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate key: prefer authenticated user ID if present, otherwise IP
    const clientKey =
      options.keyGenerator?.(req) ??
      ((req as any).auth?.dbUserId || (req as any).auth?.clerkUserId || req.ip || "unknown");

    const now = Date.now();
    let record = store.get(clientKey);

    if (!record) {
      record = { timestamps: [] };
      store.set(clientKey, record);
    }

    // Keep only timestamps within windowMs
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const remaining = Math.max(0, max - record.timestamps.length);
    const resetTimeSeconds = Math.ceil(
      (record.timestamps.length > 0 ? record.timestamps[0] + windowMs - now : windowMs) / 1000,
    );

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetTimeSeconds);

    if (record.timestamps.length >= max) {
      res.setHeader("Retry-After", resetTimeSeconds);
      res.status(429).json({
        error: "Too Many Requests",
        message,
        retryAfterSeconds: resetTimeSeconds,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "AI spatial scan rate limit reached. Please wait a minute.",
});

export const portfolioRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Portfolio request rate limit reached.",
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests to the Liquid API.",
});
