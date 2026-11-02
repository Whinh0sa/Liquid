import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { securityHeadersMiddleware } from "./middlewares/securityHeaders.js";
import { aiRateLimiter, generalRateLimiter } from "./middlewares/rateLimiter.js";

const app: Express = express();
app.disable("x-powered-by"); // Security: hide express signature
app.set("trust proxy", 1);   // Security: trust first reverse proxy (Vercel/Railway/AWS/Cloudflare)

// ─── Defense-in-depth Security Headers (Helmet-equivalent) ─────────────────────
app.use(securityHeadersMiddleware);

// ─── Structured request logging ───────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── Dynamic Origin Parsing & CORS ────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : undefined;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile clients, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development or when wildcard configured
      if (!allowedOrigins || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV === "production") {
        return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

// ─── Payload Limits & Parsing ────────────────────────────────────────────────
// AI scan uploads a base64 photo, so /api/ai gets a larger scoped JSON limit.
app.use("/api/ai", express.json({ limit: "12mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── API Rate Limiting ────────────────────────────────────────────────────────
app.use("/api/ai", aiRateLimiter);
app.use("/api", generalRateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
