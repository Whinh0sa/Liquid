// ─── Global Error Handler ─────────────────────────────────────────────────────
//
// Express 5 passes errors thrown inside async route handlers to this middleware
// automatically — no need for try/catch in every route.
//
// Place this LAST in app.ts after all routes.

import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status: number =
    typeof err?.status === "number" ? err.status :
    typeof err?.statusCode === "number" ? err.statusCode : 500;

  const message: string =
    typeof err?.message === "string" ? err.message : "Internal server error";

  // Log at error level for 5xx, warn for 4xx
  if (status >= 500) {
    logger.error({ err, method: req.method, url: req.url }, "Unhandled error");
  } else {
    logger.warn({ err, method: req.method, url: req.url }, "Request error");
  }

  // Never leak stack traces in production
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err?.stack }),
  });
};
