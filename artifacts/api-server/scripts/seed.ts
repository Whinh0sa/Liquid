// ─── Liquid Database Seed ─────────────────────────────────────────────────────
//
// Populates the database with the 5 canonical demo assets.
// Run once after `pnpm --filter @workspace/db run push`:
//
//   node --loader ts-node/esm scripts/seed.ts
//   — or via the workspace script —
//   pnpm --filter @workspace/api-server run seed
//
// Safe to re-run: uses ON CONFLICT DO NOTHING on asset IDs so existing rows
// are never overwritten.

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── Demo user ───────────────────────────────────────────────────────────────
const DEMO_USER_EMAIL = "demo@liquid.app";

// ─── Seed data ────────────────────────────────────────────────────────────────
// cliffDate is computed from "days from today" so the urgency tiers are always
// realistic relative to when the seed runs.
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0); // noon UTC to avoid DST edge cases
  return d;
}

const DEMO_ASSETS = [
  {
    category: "TECH" as const,
    make: "Apple",
    model: "iPhone 14 Pro - 256GB",
    storageCapacity: "256GB",
    purchasePrice: 109_900, // cents
    currentEstimatedValue: 65_000,
    projectedDrop: 15_000,
    cliffDate: daysFromNow(12),
    cliffReason: "Apple Fall Keynote Expected",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Apple",
    model: "MacBook Pro M2 - 14 inch",
    storageCapacity: undefined,
    purchasePrice: 199_900,
    currentEstimatedValue: 120_000,
    projectedDrop: 20_000,
    cliffDate: daysFromNow(85),
    cliffReason: "Historical Q4 hardware cycle",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Sony",
    model: "A7IV Body",
    storageCapacity: undefined,
    purchasePrice: 249_800,
    currentEstimatedValue: 210_000,
    projectedDrop: 35_000,
    cliffDate: daysFromNow(3),
    cliffReason: "Competitor Firmware Release",
    status: "ACTION_REQUIRED" as const,
  },
  {
    category: "TECH" as const,
    make: "Apple",
    model: "iPad Pro M4 - 13 inch",
    storageCapacity: undefined,
    purchasePrice: 139_900,
    currentEstimatedValue: 105_000,
    projectedDrop: 12_000,
    cliffDate: daysFromNow(42),
    cliffReason: "Expected iPadOS refresh cycle",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Sony",
    model: "WH-1000XM5",
    storageCapacity: undefined,
    purchasePrice: 39_900,
    currentEstimatedValue: 28_000,
    projectedDrop: 8_000,
    cliffDate: daysFromNow(8),
    cliffReason: "New model rumored — XM6",
    status: "ACTION_REQUIRED" as const,
  },
] satisfies Omit<schema.InsertAsset, "userId">[];

async function seed() {
  console.log("🌱  Seeding Liquid database…");

  // 1. Upsert the demo user (clerkUserId uses a placeholder for seed data)
  const [user] = await db
    .insert(schema.users)
    .values({
      clerkUserId: "demo_seed_user",
      email: DEMO_USER_EMAIL,
      displayName: "Demo User",
    })
    .onConflictDoUpdate({
      target: schema.users.clerkUserId,
      set: { displayName: "Demo User", lastSeenAt: new Date() },
    })
    .returning();

  console.log(`   ✅  User: ${user.email} (${user.id})`);

  // 2. Insert demo assets concurrently (skip if already present — idempotent)
  await Promise.all(
    DEMO_ASSETS.map(async (asset) => {
      const [inserted] = await db
        .insert(schema.assets)
        .values({ ...asset, userId: user.id })
        // If the exact (userId, model) combo exists, leave it alone
        .onConflictDoNothing()
        .returning({ id: schema.assets.id, model: schema.assets.model });

      if (inserted) {
        console.log(`   ✅  Asset: ${asset.model}`);
      } else {
        console.log(`   ⏭   Asset already exists: ${asset.model}`);
      }
    }),
  );

  console.log("\n🎉  Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  pool.end().finally(() => process.exit(1));
});
