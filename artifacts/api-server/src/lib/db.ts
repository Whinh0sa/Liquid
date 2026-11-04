// ─── Database Singleton ───────────────────────────────────────────────────────
//
// A single pg.Pool + Drizzle instance shared across all route handlers.
// Importing from this module guarantees only one connection pool is created
// per server process — critical for preventing connection exhaustion.
//
// Usage in route handlers:
//   import { db } from "../lib/db.js";
//   const rows = await db.select().from(assets).where(eq(assets.userId, id));

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import { logger } from "./logger.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Provision a PostgreSQL database and set the env var.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,            // max concurrent connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err: Error) => {
  logger.error({ err }, "Unexpected pg pool error");
});

export const db = drizzle(pool, { schema, logger: false });
