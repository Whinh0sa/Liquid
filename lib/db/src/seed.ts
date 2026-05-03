import { db, pool } from "./index";
import {
  usersTable,
  assetsTable,
  releaseEventsTable,
} from "./schema";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function seed() {
  console.log("Seeding database...");

  await db
    .insert(usersTable)
    .values({
      id: DEMO_USER_ID,
      email: "demo@liquid.app",
      displayName: "Demo User",
      avatarUrl: null,
    })
    .onConflictDoNothing();

  await db
    .insert(assetsTable)
    .values([
      {
        id: "AST-001",
        userId: DEMO_USER_ID,
        category: "Hardware",
        model: "iPhone 14 Pro - 256GB",
        condition: "GOOD",
        purchasePrice: 109900,
        currentValue: 65000,
        cliffDaysAway: 12,
        cliffProjectedDrop: 15000,
        cliffReason: "Apple Fall Keynote Expected",
        status: "HOLD",
      },
      {
        id: "AST-002",
        userId: DEMO_USER_ID,
        category: "Hardware",
        model: "MacBook Pro M2 - 14 inch",
        condition: "EXCELLENT",
        purchasePrice: 199900,
        currentValue: 120000,
        cliffDaysAway: 85,
        cliffProjectedDrop: 20000,
        cliffReason: "Historical Q4 hardware cycle",
        status: "HOLD",
      },
      {
        id: "AST-003",
        userId: DEMO_USER_ID,
        category: "Optics",
        model: "Sony A7IV Body",
        condition: "EXCELLENT",
        purchasePrice: 249800,
        currentValue: 210000,
        cliffDaysAway: 3,
        cliffProjectedDrop: 35000,
        cliffReason: "Competitor Firmware Release",
        status: "ACTION_REQUIRED",
      },
      {
        id: "AST-004",
        userId: DEMO_USER_ID,
        category: "Hardware",
        model: "iPad Pro M4 - 13 inch",
        condition: "GOOD",
        purchasePrice: 139900,
        currentValue: 105000,
        cliffDaysAway: 42,
        cliffProjectedDrop: 12000,
        cliffReason: "Expected iPadOS refresh cycle",
        status: "HOLD",
      },
      {
        id: "AST-005",
        userId: DEMO_USER_ID,
        category: "Audio",
        model: "Sony WH-1000XM5",
        condition: "GOOD",
        purchasePrice: 39900,
        currentValue: 28000,
        cliffDaysAway: 8,
        cliffProjectedDrop: 8000,
        cliffReason: "New model rumored — XM6",
        status: "ACTION_REQUIRED",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(releaseEventsTable)
    .values([
      {
        title: "Apple iPhone 16 Series",
        affectsModel: "iPhone 14 Pro - 256GB",
        estimatedImpactPct: -20,
        severity: "critical",
        daysAway: 12,
      },
      {
        title: "Sony A7R VI Announcement",
        affectsModel: "Sony A7IV Body",
        estimatedImpactPct: -15,
        severity: "high",
        daysAway: 38,
      },
      {
        title: "Sony WH-1000XM6 Launch",
        affectsModel: "Sony WH-1000XM5",
        estimatedImpactPct: -18,
        severity: "high",
        daysAway: 117,
      },
      {
        title: "iPad Pro M5 Event",
        affectsModel: "iPad Pro M4",
        estimatedImpactPct: -12,
        severity: "medium",
        daysAway: 129,
      },
      {
        title: "MacBook Pro M4 Refresh",
        affectsModel: "MacBook Pro M2",
        estimatedImpactPct: -8,
        severity: "low",
        daysAway: 180,
      },
    ]);

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
