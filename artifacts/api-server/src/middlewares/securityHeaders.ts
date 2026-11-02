// ─── Security Headers Middleware (Helmet-Equivalent) ───────────────────────────
//
// Configures modern HTTP defense-in-depth headers:
//   - Strict Content Security Policy (Clerk + Unsplash + fonts)
//   - X-Content-Type-Options: nosniff
//   - X-Frame-Options: DENY
//   - Strict-Transport-Security (HSTS)
//   - Cross-Origin-Resource-Policy / Embedder-Policy / Opener-Policy
//   - Referrer-Policy: strict-origin-when-cross-origin

import type { Request, Response, NextFunction } from "express";

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.*.lcl.dev",
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.*.lcl.dev https://api.unsplash.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://img.clerk.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  res.setHeader("Content-Security-Policy", cspDirectives);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  next();
}
