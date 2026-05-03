import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { assetsTable, priceAlertsTable, releaseEventsTable } from "@workspace/db/schema";
import {
  UpdateAssetStatusParams,
  UpdateAssetStatusBody,
} from "@workspace/api-zod";

const router = Router();

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

router.get("/portfolio", async (req, res) => {
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.userId, DEMO_USER_ID))
    .orderBy(assetsTable.cliffDaysAway);

  const alerts = await db
    .select()
    .from(priceAlertsTable)
    .where(and(eq(priceAlertsTable.userId, DEMO_USER_ID), eq(priceAlertsTable.isActive, true)));

  const alertByAssetId = new Map(alerts.map((alert) => [alert.assetId, alert]));

  const portfolio = assets.map((a) => ({
    id: a.id,
    category: a.category,
    model: a.model,
    condition: a.condition,
    purchasePrice: a.purchasePrice,
    currentValue: a.currentValue,
    depreciationCliff: {
      daysAway: a.cliffDaysAway,
      projectedDrop: a.cliffProjectedDrop,
      reason: a.cliffReason,
    },
    status: a.status,
    notes: a.notes,
    priceAlert: alertByAssetId.get(a.id)
      ? {
          floorPrice: alertByAssetId.get(a.id)?.floorPrice ?? null,
          triggeredAt: alertByAssetId.get(a.id)?.triggeredAt ?? null,
          isActive: alertByAssetId.get(a.id)?.isActive ?? false,
        }
      : null,
  }));

  const totalValueCents = portfolio.reduce((acc, a) => acc + a.currentValue, 0);
  const totalAtRiskCents = portfolio
    .filter((a) => a.depreciationCliff.daysAway < 15)
    .reduce((acc, a) => acc + a.depreciationCliff.projectedDrop, 0);

  res.json({
    portfolio,
    metrics: {
      totalNetWorth: totalValueCents / 100,
      capitalAtRisk: totalAtRiskCents / 100,
    },
  });
});

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
    .update(assetsTable)
    .set({ status: status as typeof assetsTable.$inferInsert["status"], updatedAt: new Date() })
    .where(eq(assetsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  req.log.info({ id, status }, "Asset status updated");

  res.json({
    id: updated.id,
    category: updated.category,
    model: updated.model,
    condition: updated.condition,
    purchasePrice: updated.purchasePrice,
    currentValue: updated.currentValue,
    depreciationCliff: {
      daysAway: updated.cliffDaysAway,
      projectedDrop: updated.cliffProjectedDrop,
      reason: updated.cliffReason,
    },
    status: updated.status,
    notes: updated.notes,
  });
});

router.get("/release-events", async (req, res) => {
  const events = await db
    .select()
    .from(releaseEventsTable)
    .orderBy(releaseEventsTable.daysAway);

  res.json({ events });
});

router.get("/price-alerts", async (req, res) => {
  const alerts = await db
    .select()
    .from(priceAlertsTable)
    .where(eq(priceAlertsTable.userId, DEMO_USER_ID));

  res.json({ alerts });
});

router.put("/price-alerts/:assetId", async (req, res) => {
  const assetId = String(req.params.assetId);
  const floorPrice = Number(req.body?.floorPrice);

  if (!assetId || !Number.isFinite(floorPrice) || floorPrice < 0) {
    res.status(400).json({ error: "Invalid alert payload" });
    return;
  }

  const existing = await db
    .select()
    .from(priceAlertsTable)
    .where(and(eq(priceAlertsTable.userId, DEMO_USER_ID), eq(priceAlertsTable.assetId, assetId)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    const [updated] = await db
      .update(priceAlertsTable)
      .set({ floorPrice: Math.round(floorPrice), isActive: true, updatedAt: now })
      .where(eq(priceAlertsTable.id, existing[0].id))
      .returning();

    res.json({ alert: updated });
    return;
  }

  const [created] = await db
    .insert(priceAlertsTable)
    .values({
      userId: DEMO_USER_ID,
      assetId,
      floorPrice: Math.round(floorPrice),
      isActive: true,
      triggeredAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  res.json({ alert: created });
});

router.delete("/price-alerts/:assetId", async (req, res) => {
  const assetId = String(req.params.assetId);

  await db
    .update(priceAlertsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(priceAlertsTable.userId, DEMO_USER_ID), eq(priceAlertsTable.assetId, assetId)));

  res.status(204).send();
});

export default router;
