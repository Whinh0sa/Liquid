// ─── Portfolio Routes ─────────────────────────────────────────────────────────
//
// All routes require Clerk authentication via requireAuth middleware.
// Every DB query is scoped to req.auth.dbUserId — users never see each other's data.
//
// GET    /api/portfolio             → full portfolio + computed metrics
// POST   /api/portfolio             → add a new asset
// PATCH  /api/portfolio/:id         → update asset lifecycle status
// DELETE /api/portfolio/:id         → remove an asset
// GET    /api/portfolio/:id/alerts  → list price alerts for one asset
// POST   /api/portfolio/:id/alerts  → create a price alert
// PATCH  /api/portfolio/:id/alerts/:alertId → activate / deactivate / dismiss
// DELETE /api/portfolio/:id/alerts/:alertId → hard-delete an alert

import { Router } from "express";
import { eq, and, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import {
  UpdateAssetStatusParams,
  UpdateAssetStatusBody,
} from "@workspace/api-zod";
import { assets, priceAlerts, insertAssetSchema } from "@workspace/db/schema";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/clerkAuth.js";

const router = Router();

// Apply Clerk auth to every portfolio route
router.use(requireAuth);

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Compute daysAway from a stored cliffDate (UTC, integer, may be negative). */
function daysAwayFromCliff(cliffDate: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((cliffDate.getTime() - Date.now()) / msPerDay);
}

/** Map a DB asset row into the API response shape the frontend expects. */
function toApiAsset(row: typeof assets.$inferSelect) {
  const daysAway = daysAwayFromCliff(row.cliffDate);
  return {
    id: row.id,
    category: row.category,
    make: row.make,
    model: row.model,
    storageCapacity: row.storageCapacity ?? undefined,
    purchasePrice: row.purchasePrice, // cents
    currentValue: row.currentEstimatedValue, // cents  (matches frontend key)
    depreciationCliff: {
      daysAway,
      projectedDrop: row.projectedDrop, // cents
      reason: row.cliffReason ?? "Market event",
    },
    status: row.status,
  };
}

// ─── GET /api/portfolio ───────────────────────────────────────────────────────
router.get("/portfolio", async (req, res) => {
  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, req.auth.dbUserId))
    .orderBy(assets.cliffDate);

  const portfolio = rows.map(toApiAsset);

  const totalNetWorth = portfolio.reduce((s, a) => s + a.currentValue, 0) / 100;

  const capitalAtRisk =
    portfolio
      .filter((a) => a.depreciationCliff.daysAway < 15)
      .reduce((s, a) => s + a.depreciationCliff.projectedDrop, 0) / 100;

  res.json({ portfolio, metrics: { totalNetWorth, capitalAtRisk } });
});

// ─── POST /api/portfolio ──────────────────────────────────────────────────────
const CreateAssetBody = insertAssetSchema.omit({ userId: true });

router.post("/portfolio", async (req, res) => {
  const result = CreateAssetBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const [inserted] = await db
    .insert(assets)
    .values({ ...result.data, userId: req.auth.dbUserId })
    .returning();

  req.log.info({ id: inserted.id, model: inserted.model }, "Asset created");
  res.status(201).json(toApiAsset(inserted));
});

// ─── PATCH /api/portfolio/:id ─────────────────────────────────────────────────
router.patch("/portfolio/:id", async (req, res) => {
  const paramsResult = UpdateAssetStatusParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid asset ID" });
    return;
  }

  const bodyResult = UpdateAssetStatusBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  const { id } = paramsResult.data;
  const { status } = bodyResult.data;

  const [updated] = await db
    .update(assets)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(assets.id, id), eq(assets.userId, req.auth.dbUserId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  req.log.info({ id, status }, "Asset status updated");
  res.json(toApiAsset(updated));
});

// ─── DELETE /api/portfolio/:id ────────────────────────────────────────────────
router.delete("/portfolio/:id", async (req, res) => {
  const { id } = req.params;

  const [deleted] = await db
    .delete(assets)
    .where(and(eq(assets.id, id), eq(assets.userId, req.auth.dbUserId)))
    .returning({ id: assets.id });

  if (!deleted) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  req.log.info({ id }, "Asset deleted");
  res.status(204).send();
});

// ─── Reusable asset-existence guard (scoped to user) ─────────────────────────
async function requireAsset(id: string, userId: string) {
  const [row] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ─── GET /api/portfolio/:id/alerts ───────────────────────────────────────────
router.get("/portfolio/:id/alerts", async (req, res) => {
  const { id } = req.params;

  if (!(await requireAsset(id, req.auth.dbUserId))) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  const rows = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.assetId, id))
    .orderBy(priceAlerts.createdAt);

  res.json({ alerts: rows });
});

// ─── POST /api/portfolio/:id/alerts ──────────────────────────────────────────
const CreateAlertBody = z.object({
  targetPrice: z.number().int().positive(), // floor price in cents
});

router.post("/portfolio/:id/alerts", async (req, res) => {
  const { id } = req.params;

  if (!(await requireAsset(id, req.auth.dbUserId))) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  const bodyResult = CreateAlertBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "targetPrice (integer, cents) is required" });
    return;
  }

  const [alert] = await db
    .insert(priceAlerts)
    .values({ assetId: id, targetPrice: bodyResult.data.targetPrice })
    .returning();

  req.log.info(
    { assetId: id, targetPrice: bodyResult.data.targetPrice },
    "Price alert created",
  );
  res.status(201).json(alert);
});

// ─── PATCH /api/portfolio/:id/alerts/:alertId ─────────────────────────────────
const PatchAlertBody = z.object({
  isActive: z.boolean().optional(),
  dismiss: z.literal(true).optional(),
});

router.patch("/portfolio/:id/alerts/:alertId", async (req, res) => {
  const { id, alertId } = req.params;

  if (!(await requireAsset(id, req.auth.dbUserId))) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  const bodyResult = PatchAlertBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Provide isActive (bool) or dismiss:true" });
    return;
  }

  const updates: Partial<typeof priceAlerts.$inferInsert> = {};

  if (bodyResult.data.dismiss) {
    updates.isActive = false;
    updates.triggeredAt = new Date();
  } else if (typeof bodyResult.data.isActive === "boolean") {
    updates.isActive = bodyResult.data.isActive;
  }

  // Security: Prevent IDOR by ensuring the alert actually belongs to the asset
  const [updated] = await db
    .update(priceAlerts)
    .set(updates)
    .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.assetId, id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: `Alert ${alertId} not found` });
    return;
  }

  req.log.info({ alertId, updates }, "Price alert updated");
  res.json(updated);
});

// ─── DELETE /api/portfolio/:id/alerts/:alertId ───────────────────────────────
router.delete("/portfolio/:id/alerts/:alertId", async (req, res) => {
  const { id, alertId } = req.params;

  if (!(await requireAsset(id, req.auth.dbUserId))) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  // Security: Prevent IDOR by ensuring the alert actually belongs to the asset
  const [deleted] = await db
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.assetId, id)))
    .returning({ id: priceAlerts.id });

  if (!deleted) {
    res.status(404).json({ error: `Alert ${alertId} not found` });
    return;
  }

  req.log.info({ alertId }, "Price alert deleted");
  res.status(204).send();
});

// ─── GET /api/portfolio/alerts/triggered ─────────────────────────────────────
router.get("/portfolio/alerts/triggered", async (req, res) => {
  const triggered = await db
    .select({
      alertId: priceAlerts.id,
      assetId: priceAlerts.assetId,
      targetPrice: priceAlerts.targetPrice,
      currentValue: assets.currentEstimatedValue,
      model: assets.model,
    })
    .from(priceAlerts)
    .innerJoin(assets, eq(priceAlerts.assetId, assets.id))
    .where(
      and(
        eq(assets.userId, req.auth.dbUserId),
        eq(priceAlerts.isActive, true),
        isNull(priceAlerts.triggeredAt),
        lte(assets.currentEstimatedValue, priceAlerts.targetPrice),
      ),
    );

  res.json({ triggered });
});

export default router;
