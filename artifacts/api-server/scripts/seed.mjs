// ─── Liquid Database Seed (plain JS, no compilation needed) ──────────────────
// Run with: node scripts/seed.mjs
// Requires DATABASE_URL env var

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function seed() {
  console.log("🌱  Seeding Liquid database (raw SQL)…");

  // Use raw SQL to avoid needing compiled TS schema
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
        CREATE TYPE asset_category AS ENUM ('TECH', 'FASHION');
      END IF;
    END $$;
  `);

  // Upsert demo user
  const userResult = await db.execute(sql`
    INSERT INTO users (clerk_user_id, email, display_name)
    VALUES ('demo_seed_user', 'demo@liquid.app', 'Demo User')
    ON CONFLICT (clerk_user_id) DO UPDATE SET display_name = 'Demo User'
    RETURNING id
  `);
  
  const userId = userResult.rows[0].id;
  console.log(`   ✅  User: demo@liquid.app (${userId})`);

  const DEMO_ASSETS = [
    {
      make: "Apple", model: "iPhone 14 Pro - 256GB", storage: "256GB",
      purchase: 109900, current: 65000, drop: 15000,
      cliff: daysFromNow(12), reason: "Apple Fall Keynote Expected",
    },
    {
      make: "Apple", model: "MacBook Pro M2 - 14 inch", storage: null,
      purchase: 199900, current: 120000, drop: 20000,
      cliff: daysFromNow(85), reason: "Historical Q4 hardware cycle",
    },
    {
      make: "Sony", model: "A7IV Body", storage: null,
      purchase: 249800, current: 210000, drop: 35000,
      cliff: daysFromNow(3), reason: "Competitor Firmware Release",
    },
    {
      make: "Apple", model: "iPad Pro M4 - 13 inch", storage: null,
      purchase: 139900, current: 105000, drop: 12000,
      cliff: daysFromNow(42), reason: "Expected iPadOS refresh cycle",
    },
    {
      make: "Sony", model: "WH-1000XM5", storage: null,
      purchase: 39900, current: 28000, drop: 8000,
      cliff: daysFromNow(8), reason: "New model rumored — XM6",
    },
  ];

  for (const asset of DEMO_ASSETS) {
    const result = await db.execute(sql`
      INSERT INTO assets (
        user_id, category, make, model, storage_capacity,
        purchase_price, current_estimated_value, projected_drop,
        cliff_date, cliff_reason, status
      ) VALUES (
        ${userId}, 'TECH', ${asset.make}, ${asset.model}, ${asset.storage},
        ${asset.purchase}, ${asset.current}, ${asset.drop},
        ${asset.cliff}, ${asset.reason}, 'HOLD'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    
    if (result.rows.length > 0) {
      console.log(`   ✅  Asset: ${asset.model}`);
    } else {
      console.log(`   ⏭   Asset already exists: ${asset.model}`);
    }
  }

  console.log("\n🎉  Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  pool.end().finally(() => process.exit(1));
});
