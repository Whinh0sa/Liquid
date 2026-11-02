import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app: Express = express();
app.disable("x-powered-by"); // Security: hide express signature
app.set("trust proxy", 1);   // Security: trust first reverse proxy (Vercel/Railway/AWS/Cloudflare)

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

// ─── Security headers & parsing ────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : undefined;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile clients, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development or when no strict origins specified, allow origin
      if (!allowedOrigins || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // If production and origin not listed
      if (process.env.NODE_ENV === "production") {
        return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

// Security: limit payload sizes to prevent DoS
// AI scan uploads a base64 photo, so /api/ai gets a larger scoped JSON limit.
// body-parser marks req._body once parsed, so the global parser skips it after.
app.use("/api/ai", express.json({ limit: "12mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Security: standard security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
