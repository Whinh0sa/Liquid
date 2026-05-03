import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { assetsTable, releaseEventsTable } from "@workspace/db/schema";
import {
  UpdateAssetStatusParams,
  UpdateAssetStatusBody,
} from "@workspace/api-zod";

const router = Router();

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── GET /api/portfolio ───────────────────────────────────────────────────────
router.get("/portfolio", async (req, res) => {
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.userId, DEMO_USER_ID))
    .orderBy(assetsTable.cliffDaysAway);

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

// ─── GET /api/release-events ──────────────────────────────────────────────────
router.get("/release-events", async (req, res) => {
  const events = await db
    .select()
    .from(releaseEventsTable)
    .orderBy(releaseEventsTable.daysAway);

  res.json({ events });
});

export default router;
